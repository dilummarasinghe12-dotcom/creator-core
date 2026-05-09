const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TIER_PRICES = { starter: 9, member: 29, vip: 99 };

const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [totalMembers, newThisMonth, activeMembers, cancelledMembers] = await Promise.all([
      prisma.user.count({ where: { role: 'member' } }),
      prisma.user.count({ where: { role: 'member', joinedAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { role: 'member', status: 'active' } }),
      prisma.user.count({ where: { role: 'member', status: 'cancelled' } }),
    ]);

    const membersByTier = await prisma.user.groupBy({
      by: ['tier'],
      where: { role: 'member', status: 'active' },
      _count: { tier: true },
    });

    const mrr = membersByTier.reduce((sum, g) => {
      return sum + (TIER_PRICES[g.tier] || 0) * g._count.tier;
    }, 0);

    const churnRate = totalMembers > 0
      ? Math.round((cancelledMembers / totalMembers) * 100)
      : 0;

    // Member growth: last 6 months
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await prisma.user.count({
        where: { role: 'member', joinedAt: { gte: start, lt: end } },
      });
      monthlyGrowth.push({
        month: start.toLocaleString('default', { month: 'short' }),
        members: count,
      });
    }

    const revenueByTier = membersByTier.map((g) => ({
      tier: g.tier,
      members: g._count.tier,
      mrr: (TIER_PRICES[g.tier] || 0) * g._count.tier,
    }));

    const recentMembers = await prisma.user.findMany({
      where: { role: 'member' },
      orderBy: { joinedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, tier: true, joinedAt: true, avatarUrl: true },
    });

    res.json({
      totalMembers,
      newThisMonth,
      activeMembers,
      mrr,
      churnRate,
      monthlyGrowth,
      revenueByTier,
      recentMembers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

const getMemberStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [viewCount, downloadCount, loginCount] = await Promise.all([
      prisma.analytics.count({ where: { userId, eventType: 'view' } }),
      prisma.analytics.count({ where: { userId, eventType: 'download' } }),
      prisma.analytics.count({ where: { userId, eventType: 'login' } }),
    ]);

    const recentActivity = await prisma.analytics.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { product: { select: { title: true, emoji: true } } },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { joinedAt: true, tier: true },
    });

    const daysSinceJoin = Math.floor((Date.now() - new Date(user.joinedAt)) / (1000 * 60 * 60 * 24));

    res.json({ viewCount, downloadCount, loginCount, daysSinceJoin, tier: user.tier, recentActivity });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { getDashboard, getMemberStats };
