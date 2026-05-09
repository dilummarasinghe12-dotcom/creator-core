const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const list = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (req.user.role === 'member') {
      const TIER_ORDER = { free: 0, starter: 1, member: 2, vip: 3 };
      const userTier = req.user.tier;
      const sessions = await prisma.liveSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } } },
      });
      return res.json(
        sessions.map((s) => ({
          ...s,
          locked: TIER_ORDER[userTier] < TIER_ORDER[s.tierAccess],
        }))
      );
    }

    const sessions = await prisma.liveSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { name: true } } },
    });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

const create = async (req, res) => {
  try {
    const { title, description, tierAccess, scheduledAt } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const session = await prisma.liveSession.create({
      data: {
        title,
        description,
        tierAccess: tierAccess || 'starter',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: req.user.id,
      },
    });
    res.status(201).json(session);
  } catch {
    res.status(500).json({ error: 'Failed to create session' });
  }
};

const startSession = async (req, res) => {
  try {
    const session = await prisma.liveSession.update({
      where: { id: req.params.id },
      data: { status: 'live', startedAt: new Date() },
    });

    // Notify all eligible members
    const members = await prisma.user.findMany({ where: { role: 'member', status: 'active' } });
    await Promise.all(
      members.map((m) =>
        prisma.notification.create({
          data: {
            userId: m.id,
            message: `🔴 Live session started: "${session.title}"`,
            type: 'info',
          },
        })
      )
    );

    res.json(session);
  } catch {
    res.status(500).json({ error: 'Failed to start session' });
  }
};

const endSession = async (req, res) => {
  try {
    const { recordingUrl } = req.body;
    const session = await prisma.liveSession.update({
      where: { id: req.params.id },
      data: { status: 'ended', endedAt: new Date(), recordingUrl },
    });
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Failed to end session' });
  }
};

const update = async (req, res) => {
  try {
    const { title, description, tierAccess, scheduledAt, recordingUrl } = req.body;
    const session = await prisma.liveSession.update({
      where: { id: req.params.id },
      data: { title, description, tierAccess, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined, recordingUrl },
    });
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Failed to update session' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.liveSession.delete({ where: { id: req.params.id } });
    res.json({ message: 'Session deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

module.exports = { list, create, startSession, endSession, update, remove };
