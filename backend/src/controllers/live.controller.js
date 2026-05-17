const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { emitToAll } = require('../socket/socket');

const TIER_ORDER = { free: 0, starter: 1, member: 2, vip: 3 };

const list = (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT ls.*, u.name as creatorName FROM live_sessions ls LEFT JOIN users u ON ls.createdBy = u.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND ls.status = ?'; params.push(status); }
    query += ' ORDER BY ls.createdAt DESC';

    const sessions = db.prepare(query).all(...params);
    const mapped = sessions.map(s => {
      const { creatorName, ...rest } = s;
      return { ...rest, creator: { name: creatorName } };
    });

    if (req.user.role === 'member') {
      return res.json(mapped.map(s => ({
        ...s,
        locked: (TIER_ORDER[req.user.tier] ?? 0) < (TIER_ORDER[s.tierAccess] ?? 0),
      })));
    }

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

const create = (req, res) => {
  try {
    const { title, description, tierAccess, scheduledAt } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO live_sessions (id, title, description, tierAccess, scheduledAt, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, title, description || null, tierAccess || 'starter', scheduledAt || null, req.user.id, now);

    const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
    res.status(201).json(session);
  } catch {
    res.status(500).json({ error: 'Failed to create session' });
  }
};

const startSession = (req, res) => {
  try {
    const now = new Date().toISOString();
    db.prepare(`UPDATE live_sessions SET status = 'live', startedAt = ? WHERE id = ?`).run(now, req.params.id);

    const session = db.prepare('SELECT title FROM live_sessions WHERE id = ?').get(req.params.id);
    const members = db.prepare(`SELECT id FROM users WHERE role = 'member' AND status = 'active'`).all();
    for (const m of members) {
      db.prepare(
        `INSERT INTO notifications (id, userId, message, type, createdAt) VALUES (?, ?, ?, 'info', ?)`
      ).run(uuidv4(), m.id, `🔴 Live session started: "${session?.title}"`, now);
    }

    emitToAll('live:started', { sessionId: req.params.id });
    const updated = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to start session' });
  }
};

const endSession = (req, res) => {
  try {
    const { recordingUrl } = req.body;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE live_sessions SET status = 'ended', endedAt = ?, recordingUrl = ? WHERE id = ?`
    ).run(now, recordingUrl || null, req.params.id);

    emitToAll('live:ended', { sessionId: req.params.id });
    const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(req.params.id);
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Failed to end session' });
  }
};

const update = (req, res) => {
  try {
    const { title, description, tierAccess, scheduledAt, recordingUrl } = req.body;
    const existing = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Session not found' });

    db.prepare(`UPDATE live_sessions SET title = ?, description = ?, tierAccess = ?, scheduledAt = ?, recordingUrl = ? WHERE id = ?`).run(
      title ?? existing.title,
      description ?? existing.description,
      tierAccess ?? existing.tierAccess,
      scheduledAt !== undefined ? scheduledAt : existing.scheduledAt,
      recordingUrl !== undefined ? recordingUrl : existing.recordingUrl,
      req.params.id
    );

    const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(req.params.id);
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Failed to update session' });
  }
};

const remove = (req, res) => {
  try {
    db.prepare('DELETE FROM live_sessions WHERE id = ?').run(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

module.exports = { list, create, startSession, endSession, update, remove };
