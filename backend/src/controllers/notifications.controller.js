const db = require('../db');

const list = (req, res) => {
  try {
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50'
    ).all(req.user.id).map(n => ({ ...n, read: !!n.read }));
    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const markRead = (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

const markAllRead = (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE userId = ? AND read = 0').run(req.user.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark all notifications' });
  }
};

const unreadCount = (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE userId = ? AND read = 0').get(req.user.id).c;
    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
};

module.exports = { list, markRead, markAllRead, unreadCount };
