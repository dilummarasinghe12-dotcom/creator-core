const Database = require('better-sqlite3');
const path = require('path');

const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const relativePath = url.replace(/^file:/, '');
const dbPath = path.isAbsolute(relativePath)
  ? relativePath
  : path.resolve(__dirname, '..', relativePath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    tier TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    stripeCustomerId TEXT,
    stripeSubscriptionId TEXT,
    bio TEXT,
    avatarUrl TEXT,
    joinedAt TEXT NOT NULL DEFAULT (datetime('now')),
    lastLoginAt TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    tierAccess TEXT NOT NULL DEFAULT 'starter',
    fileUrl TEXT,
    thumbnailUrl TEXT,
    emoji TEXT,
    duration TEXT,
    viewCount INTEGER NOT NULL DEFAULT 0,
    downloadCount INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy TEXT NOT NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS live_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    tierAccess TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'scheduled',
    recordingUrl TEXT,
    viewerCount INTEGER NOT NULL DEFAULT 0,
    scheduledAt TEXT,
    startedAt TEXT,
    endedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy TEXT NOT NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    eventType TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    userId TEXT,
    productId TEXT,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (productId) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
