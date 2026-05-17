require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initSocket } = require('./socket/socket');

const app = express();
const server = http.createServer(app);
initSocket(server);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Stripe webhook needs raw body — mount before express.json
app.use('/api/stripe/webhook', require('./routes/stripe.routes'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.resolve(__dirname, '..', process.env.UPLOAD_DEST || 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/members', require('./routes/members.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/live', require('./routes/live.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/stripe', require('./routes/stripe.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.post('/api/setup', async (req, res) => {
  try {
    const db = require('./db');
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    const existing = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).get();
    if (existing) return res.status(409).json({ error: 'Setup already completed. Admin account already exists.' });

    const passwordHash = await bcrypt.hash('Admin1234!', 12);
    db.prepare(
      `INSERT INTO users (id, name, email, passwordHash, role, tier, status, joinedAt)
       VALUES (?, 'Creator Core Admin', 'admin@creatorcore.io', ?, 'admin', 'vip', 'active', datetime('now'))`
    ).run(uuidv4(), passwordHash);

    res.json({ message: 'Admin account created. Email: admin@creatorcore.io — change the password immediately after login.' });
  } catch (err) {
    console.error('setup error:', err);
    res.status(500).json({ error: 'Setup failed' });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Creator Core API running on port ${PORT}`));
