const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const { sendEmail, passwordResetEmail, welcomeEmail } = require('../utils/email');

const register = async (req, res) => {
  try {
    const { name, email, password, tier = 'starter' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, name, email, passwordHash, tier, role, joinedAt) VALUES (?, ?, ?, ?, ?, 'member', ?)`
    ).run(userId, name, email, passwordHash, tier, now);

    db.prepare(
      `INSERT INTO analytics (id, eventType, userId, createdAt) VALUES (?, 'signup', ?, ?)`
    ).run(uuidv4(), userId, now);

    db.prepare(
      `INSERT INTO notifications (id, userId, message, type, createdAt) VALUES (?, ?, ?, 'success', ?)`
    ).run(uuidv4(), userId, `Welcome to Creator Core! Your ${tier} membership is active.`, now);

    const accessToken = signAccess({ id: userId, role: 'member', tier });
    const refreshToken = signRefresh({ id: userId });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO refresh_tokens (id, token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), refreshToken, userId, expiresAt, now);

    try {
      await sendEmail({ to: email, subject: 'Welcome to Creator Core', html: welcomeEmail(name, tier) });
    } catch {}

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: userId, name, email, role: 'member', tier },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'cancelled') {
      return res.status(403).json({ error: 'Your membership has been cancelled' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET lastLoginAt = ? WHERE id = ?').run(now, user.id);
    db.prepare(
      `INSERT INTO analytics (id, eventType, userId, createdAt) VALUES (?, 'login', ?, ?)`
    ).run(uuidv4(), user.id, now);

    const accessToken = signAccess({ id: user.id, role: user.role, tier: user.tier });
    const refreshToken = signRefresh({ id: user.id });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO refresh_tokens (id, token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), refreshToken, user.id, expiresAt, now);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const refresh = (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
    if (!stored || new Date(stored.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    let payload;
    try {
      payload = verifyRefresh(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = db.prepare('SELECT id, role, tier FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = signAccess({ id: user.id, role: user.role, tier: user.tier });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const logout = (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
    res.json({ message: 'Logged out' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO password_reset_tokens (id, token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), token, user.id, expiresAt, now);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({ to: email, subject: 'Reset your Creator Core password', html: passwordResetEmail(user.name, resetUrl) });

    res.json({ message: 'If that email exists, a reset link was sent' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    const record = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token);
    if (!record || record.used || new Date(record.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, record.userId);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').run(token);
    db.prepare('DELETE FROM refresh_tokens WHERE userId = ?').run(record.userId);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

const getMe = (req, res) => {
  try {
    const user = db.prepare(
      'SELECT id, name, email, role, tier, status, bio, avatarUrl, joinedAt, lastLoginAt FROM users WHERE id = ?'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = (req, res) => {
  try {
    const { name, bio } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    if (name) { fields.push('name = ?'); values.push(name); }
    if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
    if (avatarUrl) { fields.push('avatarUrl = ?'); values.push(avatarUrl); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.user.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare(
      'SELECT id, name, email, role, tier, bio, avatarUrl FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, user.id);
    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, getMe, updateProfile, changePassword };
