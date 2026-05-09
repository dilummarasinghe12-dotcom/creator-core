const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TIER_PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER,
  member: process.env.STRIPE_PRICE_MEMBER,
  vip: process.env.STRIPE_PRICE_VIP,
};

const createCheckoutSession = async (req, res) => {
  try {
    const { tier } = req.body;
    const priceId = TIER_PRICE_MAP[tier];
    if (!priceId) return res.status(400).json({ error: 'Invalid tier' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/signup?payment=cancelled`,
      metadata: { userId: user.id, tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

const createPortalSession = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/membership`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
};

const getInvoices = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.stripeCustomerId) return res.json([]);

    const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 24 });
    res.json(
      invoices.data.map((inv) => ({
        id: inv.id,
        amount: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status,
        date: new Date(inv.created * 1000).toISOString(),
        pdf: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      }))
    );
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

const getMRR = async (req, res) => {
  try {
    const subscriptions = await stripe.subscriptions.list({ status: 'active', limit: 100 });
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = price.unit_amount / 100;
        if (price.recurring?.interval === 'month') mrr += amount;
        else if (price.recurring?.interval === 'year') mrr += amount / 12;
      }
    }

    const revenueByTier = { starter: 0, member: 0, vip: 0 };
    for (const sub of subscriptions.data) {
      const tier = sub.metadata?.tier;
      if (tier && revenueByTier[tier] !== undefined) {
        for (const item of sub.items.data) {
          revenueByTier[tier] += item.price.unit_amount / 100;
        }
      }
    }

    res.json({ mrr: Math.round(mrr * 100) / 100, revenueByTier, activeSubscriptions: subscriptions.data.length });
  } catch (err) {
    console.error('mrr error:', err);
    res.status(500).json({ error: 'Failed to fetch MRR from Stripe' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const charges = await stripe.charges.list({ limit: 50 });
    res.json(
      charges.data.map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency,
        status: c.status,
        description: c.description,
        email: c.billing_details?.email,
        date: new Date(c.created * 1000).toISOString(),
      }))
    );
  } catch {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

const webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, tier } = session.metadata || {};
        if (userId && tier) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              tier,
              status: 'active',
              stripeSubscriptionId: session.subscription,
            },
          });
          await prisma.notification.create({
            data: {
              userId,
              message: `Your ${tier} membership is now active!`,
              type: 'success',
            },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (user) {
          const status = sub.status === 'active' ? 'active' : sub.status === 'canceled' ? 'cancelled' : 'inactive';
          await prisma.user.update({ where: { id: user.id }, data: { status } });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { status: 'cancelled' } });
          await prisma.notification.create({
            data: { userId: user.id, message: 'Your subscription has been cancelled.', type: 'warning' },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
};

module.exports = { createCheckoutSession, createPortalSession, getInvoices, getMRR, getTransactions, webhook };
