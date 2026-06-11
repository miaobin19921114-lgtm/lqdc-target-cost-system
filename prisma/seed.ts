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
    ['01', '土地获取费'],
    ['02', '前期工程费'],
    ['03', '建安工程费'],
    ['04', '基础设施费'],
    ['05', '公共配套设施费'],
    ['06', '开发间接费'],
    ['07', '销售费用'],
    ['08', '管理费用'],
    ['09', '财务费用'],
    ['10', '增值税及附加'],
    ['11', '企业所得税']
  ];

  for (const [code, subjectName] of subjects) {
    await prisma.costSubject.upsert({
      where: { code },
      update: {},
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
