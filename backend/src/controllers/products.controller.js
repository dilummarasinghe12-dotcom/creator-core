const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const TIER_ORDER = { free: 0, starter: 1, member: 2, vip: 3 };

const canAccess = (userTier, productTier) =>
  (TIER_ORDER[userTier] ?? 0) >= (TIER_ORDER[productTier] ?? 0);

const list = (req, res) => {
  try {
    const { type, published } = req.query;
    const isAdmin = req.user.role === 'admin';

    let query = `SELECT p.*, u.name as creatorName FROM products p LEFT JOIN users u ON p.createdBy = u.id WHERE p.workspaceId = ?`;
    const params = [req.user.workspaceId];
    if (type) { query += ' AND p.type = ?'; params.push(type); }
    if (isAdmin) {
      if (published !== undefined) { query += ' AND p.published = ?'; params.push(published === 'true' ? 1 : 0); }
    } else {
      query += ' AND p.published = 1';
    }
    query += ' ORDER BY p.createdAt DESC';

    const products = db.prepare(query).all(...params);
    const mapped = products.map(p => {
      const { creatorName, ...rest } = p;
      return { ...rest, published: !!p.published, creator: { name: creatorName } };
    });

    if (!isAdmin) {
      return res.json(mapped.map(p => ({
        ...p,
        locked: !canAccess(req.user.tier, p.tierAccess),
        fileUrl: canAccess(req.user.tier, p.tierAccess) ? p.fileUrl : null,
      })));
    }

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const getOne = (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND workspaceId = ?').get(req.params.id, req.user.workspaceId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.published && req.user.role !== 'admin') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (req.user.role === 'member' && !canAccess(req.user.tier, product.tierAccess)) {
      return res.status(403).json({ error: 'Upgrade your plan to access this content', locked: true });
    }

    db.prepare('UPDATE products SET viewCount = viewCount + 1 WHERE id = ?').run(product.id);
    db.prepare(
      `INSERT INTO analytics (id, eventType, userId, productId, workspaceId, createdAt) VALUES (?, 'view', ?, ?, ?, ?)`
    ).run(uuidv4(), req.user.id, product.id, req.user.workspaceId, new Date().toISOString());

    res.json({ ...product, published: !!product.published });
  } catch {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const create = (req, res) => {
  try {
    const { title, description, type, tierAccess, emoji, duration } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'Title and type are required' });

    const fileUrl = req.files?.file ? `/uploads/${req.files.file[0].filename}` : null;
    const thumbnailUrl = req.files?.thumbnail ? `/uploads/${req.files.thumbnail[0].filename}` : null;
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO products (id, title, description, type, tierAccess, fileUrl, thumbnailUrl, emoji, duration, published, createdBy, workspaceId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    ).run(id, title, description || null, type, tierAccess || 'starter', fileUrl, thumbnailUrl, emoji || null, duration || null, req.user.id, req.user.workspaceId, now, now);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json({ ...product, published: !!product.published });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const update = (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND workspaceId = ?').get(req.params.id, req.user.workspaceId);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { title, description, type, tierAccess, emoji, duration, published } = req.body;
    const fileUrl = req.files?.file ? `/uploads/${req.files.file[0].filename}` : existing.fileUrl;
    const thumbnailUrl = req.files?.thumbnail ? `/uploads/${req.files.thumbnail[0].filename}` : existing.thumbnailUrl;

    const publishedVal = published !== undefined
      ? (published === 'true' || published === true ? 1 : 0)
      : existing.published;

    db.prepare(`UPDATE products SET
      title = ?, description = ?, type = ?, tierAccess = ?, emoji = ?, duration = ?,
      published = ?, fileUrl = ?, thumbnailUrl = ?, updatedAt = ?
      WHERE id = ? AND workspaceId = ?`).run(
      title ?? existing.title,
      description ?? existing.description,
      type ?? existing.type,
      tierAccess ?? existing.tierAccess,
      emoji ?? existing.emoji,
      duration ?? existing.duration,
      publishedVal,
      fileUrl,
      thumbnailUrl,
      new Date().toISOString(),
      req.params.id,
      req.user.workspaceId
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ ...product, published: !!product.published });
  } catch {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const remove = (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND workspaceId = ?').get(req.params.id, req.user.workspaceId);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare('DELETE FROM analytics WHERE productId = ?').run(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

const trackDownload = (req, res) => {
  try {
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND workspaceId = ?').get(req.params.id, req.user.workspaceId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    db.prepare('UPDATE products SET downloadCount = downloadCount + 1 WHERE id = ?').run(req.params.id);
    db.prepare(
      `INSERT INTO analytics (id, eventType, userId, productId, workspaceId, createdAt) VALUES (?, 'download', ?, ?, ?, ?)`
    ).run(uuidv4(), req.user.id, req.params.id, req.user.workspaceId, new Date().toISOString());
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to track download' });
  }
};

module.exports = { list, getOne, create, update, remove, trackDownload };
