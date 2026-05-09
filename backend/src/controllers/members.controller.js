const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/email');
const prisma = new PrismaClient();

const list = async (req, res) => {
  try {
    const { search, tier, status } = req.query;
    const where = { role: 'member' };
    if (tier) where.tier = tier;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const members = await prisma.user.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      select: {
        id: true, name: true, email: true, tier: true, status: true,
        joinedAt: true, lastLoginAt: true, avatarUrl: true, stripeSubscriptionId: true,
      },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const enriched = members.map((m) => ({
      ...m,
      churnRisk: !m.lastLoginAt || m.lastLoginAt < sevenDaysAgo,
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

const getOne = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, tier: true, status: true,
        bio: true, avatarUrl: true, joinedAt: true, lastLoginAt: true,
        stripeCustomerId: true, stripeSubscriptionId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Member not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
};

const invite = async (req, res) => {
  try {
    const { name, email, tier = 'starter' } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, tier, role: 'member' },
    });

    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    await sendEmail({
      to: email,
      subject: "You've been invited to Creator Core",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F0F1A;padding:32px;border-radius:12px;color:#F0EBE0;">
          <h2 style="color:#FF6D00;">You're invited to Creator Core</h2>
          <p>Hi ${name},</p>
          <p>Your <strong>${tier}</strong> membership has been created.</p>
          <p>Email: <strong>${email}</strong><br>Temporary password: <strong>${tempPassword}</strong></p>
          <a href="${loginUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#FF6D00;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Sign In Now</a>
          <p style="font-size:12px;color:#888;">Change your password after first login.</p>
        </div>
      `,
    });

    res.status(201).json({ message: 'Member invited', userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

const updateMember = async (req, res) => {
  try {
    const { tier, status } = req.body;
    const data = {};
    if (tier) data.tier = tier;
    if (status) data.status = status;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, tier: true, status: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update member' });
  }
};

const removeMember = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

const emailMember = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Member not found' });

    await sendEmail({
      to: user.email,
      subject,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F0F1A;padding:32px;border-radius:12px;color:#F0EBE0;">
        <h2 style="color:#FF6D00;">Creator Core</h2>
        <p>Hi ${user.name},</p>
        <div>${message}</div>
      </div>`,
    });

    res.json({ message: 'Email sent' });
  } catch {
    res.status(500).json({ error: 'Failed to send email' });
  }
};

module.exports = { list, getOne, invite, updateMember, removeMember, emailMember };
