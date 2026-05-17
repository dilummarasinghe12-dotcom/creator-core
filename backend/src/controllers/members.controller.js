const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sendEmail } = require('../utils/email');

const list = (req, res) => {
  try {
    const { search, tier, status } = req.query;
    let query = `SELECT id, name, email, role, tier, status, bio, avatarUrl, joinedAt, lastLoginAt, stripeSubscriptionId
                 FROM users WHERE role = 'member'`;
    const params = [];
    if (tier) { query += ' AND tier = ?'; params.push(tier); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY joinedAt DESC';

    const members = db.prepare(query).all(...params);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const enriched = members.map(m => ({
      ...m,
      churnRisk: !m.lastLoginAt || m.lastLoginAt < sevenDaysAgo,
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

const getOne = (req, res) => {
  try {
    const user = db.prepare(
      `SELECT id, name, email, role, tier, status, bio, avatarUrl, joinedAt, lastLoginAt, stripeCustomerId, stripeSubscriptionId
       FROM users WHERE id = ?`
    ).get(req.params.id);
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

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, name, email, passwordHash, tier, role, joinedAt) VALUES (?, ?, ?, ?, ?, 'member', ?)`
    ).run(id, name, email, passwordHash, tier, now);

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

    res.status(201).json({ message: 'Member invited', userId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

const updateMember = (req, res) => {
  try {
    const { tier, status } = req.body;
    const fields = [];
    const values = [];
    if (tier) { fields.push('tier = ?'); values.push(tier); }
    if (status) { fields.push('status = ?'); values.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.params.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, name, email, tier, status FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update member' });
  }
};

const removeMember = (req, res) => {
  try {
    db.prepare(`UPDATE users SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

const emailMember = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.params.id);
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
