const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function seedAdmin() {
  const existing = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).get();
  if (existing) {
    return { created: false, message: 'Admin already exists' };
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  db.prepare(
    `INSERT INTO users (id, name, email, passwordHash, role, tier, status, joinedAt)
     VALUES (?, 'Creator Core Admin', 'admin@creatorcore.io', ?, 'admin', 'vip', 'active', datetime('now'))`
  ).run(uuidv4(), passwordHash);

  return { created: true, message: 'Admin created: admin@creatorcore.io / Admin1234!' };
}

module.exports = { seedAdmin };

// Run directly: node src/seed.js
if (require.main === module) {
  seedAdmin()
    .then(({ message }) => { console.log(message); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
