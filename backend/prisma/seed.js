const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../src/db');

async function main() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@creatorcore.io');
  if (existing) {
    console.log('Admin already exists — skipping seed');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  db.prepare(
    `INSERT INTO users (id, name, email, passwordHash, role, tier, status, joinedAt)
     VALUES (?, 'Creator Core Admin', 'admin@creatorcore.io', ?, 'admin', 'vip', 'active', datetime('now'))`
  ).run(uuidv4(), passwordHash);

  console.log('Admin created: admin@creatorcore.io');
  console.log('Password: Admin1234! — CHANGE THIS IMMEDIATELY');
}

main().catch(console.error);
