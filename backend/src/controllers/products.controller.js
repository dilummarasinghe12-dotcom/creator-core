const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TIER_ORDER = { free: 0, starter: 1, member: 2, vip: 3 };

const canAccess = (userTier, productTier) =>
  TIER_ORDER[userTier] >= TIER_ORDER[productTier];

const list = async (req, res) => {
  try {
    const { type, published } = req.query;
    const where = {};
    if (type) where.type = type;
    if (req.user.role === 'admin') {
      if (published !== undefined) where.published = published === 'true';
    } else {
      where.published = true;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { name: true } } },
    });

    if (req.user.role === 'member') {
      const userTier = req.user.tier;
      return res.json(
        products.map((p) => ({
          ...p,
          locked: !canAccess(userTier, p.tierAccess),
          fileUrl: canAccess(userTier, p.tierAccess) ? p.fileUrl : null,
        }))
      );
    }

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const getOne = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.published && req.user.role !== 'admin') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (req.user.role === 'member' && !canAccess(req.user.tier, product.tierAccess)) {
      return res.status(403).json({ error: 'Upgrade your plan to access this content', locked: true });
    }

    await prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } });
    await prisma.analytics.create({ data: { eventType: 'view', userId: req.user.id, productId: product.id } });

    res.json(product);
  } catch {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const create = async (req, res) => {
  try {
    const { title, description, type, tierAccess, emoji, duration } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'Title and type are required' });

    const fileUrl = req.files?.file ? `/uploads/${req.files.file[0].filename}` : null;
    const thumbnailUrl = req.files?.thumbnail ? `/uploads/${req.files.thumbnail[0].filename}` : null;

    const product = await prisma.product.create({
      data: {
        title,
        description,
        type,
        tierAccess: tierAccess || 'starter',
        emoji,
        duration,
        fileUrl,
        thumbnailUrl,
        createdBy: req.user.id,
        published: false,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const update = async (req, res) => {
  try {
    const { title, description, type, tierAccess, emoji, duration, published } = req.body;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const fileUrl = req.files?.file ? `/uploads/${req.files.file[0].filename}` : existing.fileUrl;
    const thumbnailUrl = req.files?.thumbnail ? `/uploads/${req.files.thumbnail[0].filename}` : existing.thumbnailUrl;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        type: type ?? existing.type,
        tierAccess: tierAccess ?? existing.tierAccess,
        emoji: emoji ?? existing.emoji,
        duration: duration ?? existing.duration,
        published: published !== undefined ? published === 'true' || published === true : existing.published,
        fileUrl,
        thumbnailUrl,
      },
    });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.analytics.deleteMany({ where: { productId: req.params.id } });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

const trackDownload = async (req, res) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { downloadCount: { increment: 1 } } });
    await prisma.analytics.create({ data: { eventType: 'download', userId: req.user.id, productId: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to track download' });
  }
};

module.exports = { list, getOne, create, update, remove, trackDownload };
