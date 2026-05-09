const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@creatorcore.io' } });
  if (existing) {
    console.log('Admin already exists — skipping seed');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'Creator Core Admin',
      email: 'admin@creatorcore.io',
      passwordHash,
      role: 'admin',
      tier: 'vip',
      status: 'active',
    },
  });

  console.log(`Admin created: ${admin.email}`);
  console.log('Password: Admin1234! — CHANGE THIS IMMEDIATELY');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
