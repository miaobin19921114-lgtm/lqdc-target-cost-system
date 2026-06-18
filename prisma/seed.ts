import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@lqdc.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const name = process.env.ADMIN_NAME || '系统管理员';

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin'
    }
  });

  const subjects = [
    ['01', '土地成本'],
    ['02', '前期工程费'],
    ['03', '建安工程费'],
    ['04', '销售费用'],
    ['05', '管理费用'],
    ['06', '财务费用'],
    ['07', '税费及预备费']
  ];

  for (const [code, subjectName] of subjects) {
    await prisma.costSubject.upsert({
      where: { code },
      update: { name: subjectName, level: 1, sortOrder: Number(code) },
      create: { code, name: subjectName, level: 1, sortOrder: Number(code) }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
