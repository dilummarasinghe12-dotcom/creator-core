const db = require('../db');

const TIER_PRICES = { starter: 9, member: 29, vip: 99 };

const getDashboard = (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const totalMembers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'member' AND workspaceId = ?`).get(wsId).c;
    const newThisMonth = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'member' AND workspaceId = ? AND joinedAt >= ?`).get(wsId, startOfMonth).c;
    const activeMembers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'member' AND workspaceId = ? AND status = 'active'`).get(wsId).c;
    const cancelledMembers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'member' AND workspaceId = ? AND status = 'cancelled'`).get(wsId).c;

    const tierCounts = db.prepare(
      `SELECT tier, COUNT(*) as count FROM users WHERE role = 'member' AND workspaceId = ? AND status = 'active' GROUP BY tier`
    ).all(wsId);

    const mrr = tierCounts.reduce((sum, g) => sum + (TIER_PRICES[g.tier] || 0) * g.count, 0);
    const churnRate = totalMembers > 0 ? Math.round((cancelledMembers / totalMembers) * 100) : 0;

    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = db.prepare(
        `SELECT COUNT(*) as c FROM users WHERE role = 'member' AND workspaceId = ? AND joinedAt >= ? AND joinedAt < ?`
      ).get(wsId, start.toISOString(), end.toISOString()).c;
      monthlyGrowth.push({ month: start.toLocaleString('default', { month: 'short' }), members: count });
    }

    const revenueByTier = tierCounts.map(g => ({
      tier: g.tier,
      members: g.count,
      mrr: (TIER_PRICES[g.tier] || 0) * g.count,
    }));

    const recentMembers = db.prepare(
      `SELECT id, name, email, tier, joinedAt, avatarUrl FROM users WHERE role = 'member' AND workspaceId = ? ORDER BY joinedAt DESC LIMIT 5`
    ).all(wsId);

    res.json({ totalMembers, newThisMonth, activeMembers, mrr, churnRate, monthlyGrowth, revenueByTier, recentMembers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

const getMemberStats = (req, res) => {
  try {
    const userId = req.user.id;

    const viewCount = db.prepare(`SELECT COUNT(*) as c FROM analytics WHERE userId = ? AND eventType = 'view'`).get(userId).c;
    const downloadCount = db.prepare(`SELECT COUNT(*) as c FROM analytics WHERE userId = ? AND eventType = 'download'`).get(userId).c;
    const loginCount = db.prepare(`SELECT COUNT(*) as c FROM analytics WHERE userId = ? AND eventType = 'login'`).get(userId).c;

    const recentActivity = db.prepare(`
      SELECT a.id, a.eventType, a.createdAt, p.title as productTitle, p.emoji as productEmoji
      FROM analytics a
      LEFT JOIN products p ON a.productId = p.id
      WHERE a.userId = ?
      ORDER BY a.createdAt DESC
      LIMIT 10
    `).all(userId).map(row => ({
      id: row.id,
      eventType: row.eventType,
      createdAt: row.createdAt,
      product: row.productTitle ? { title: row.productTitle, emoji: row.productEmoji } : null,
    }));

    const user = db.prepare('SELECT joinedAt, tier FROM users WHERE id = ?').get(userId);
    const daysSinceJoin = Math.floor((Date.now() - new Date(user.joinedAt)) / (1000 * 60 * 60 * 24));

    res.json({ viewCount, downloadCount, loginCount, daysSinceJoin, tier: user.tier, recentActivity });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { getDashboard, getMemberStats };
