import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import { prisma } from './prisma';

export type HealthCheckStatus = 'ok' | 'warning' | 'error';

export type HealthCheck = {
  name: string;
  status: HealthCheckStatus;
  message: string;
};

export type HealthStatus = {
  status: HealthCheckStatus;
  service: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
};

function worstStatus(checks: HealthCheck[]): HealthCheckStatus {
  if (checks.some((check) => check.status === 'error')) return 'error';
  if (checks.some((check) => check.status === 'warning')) return 'warning';
  return 'ok';
}

function mask(value: string | undefined) {
  if (!value) return '';
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', status: 'ok', message: '数据库连接正常' };
  } catch (error) {
    return { name: 'database', status: 'error', message: error instanceof Error ? error.message : '数据库连接失败' };
  }
}

async function checkUploadDirectory(): Promise<HealthCheck> {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.access(uploadDir, fsConstants.R_OK | fsConstants.W_OK);
    return { name: 'uploadDirectory', status: 'ok', message: `上传目录可读写：${uploadDir}` };
  } catch (error) {
    return { name: 'uploadDirectory', status: 'error', message: error instanceof Error ? error.message : `上传目录不可用：${uploadDir}` };
  }
}

function checkEnvironment(): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const required = ['DATABASE_URL'];
  const optional = ['UPLOAD_DIR', 'NEXT_PUBLIC_APP_URL'];

  required.forEach((name) => {
    checks.push({
      name: `env:${name}`,
      status: process.env[name] ? 'ok' : 'error',
      message: process.env[name] ? `${name} 已配置（${mask(process.env[name])}）` : `${name} 未配置`
    });
  });

  optional.forEach((name) => {
    checks.push({
      name: `env:${name}`,
      status: process.env[name] ? 'ok' : 'warning',
      message: process.env[name] ? `${name} 已配置` : `${name} 未配置，使用默认逻辑`
    });
  });

  return checks;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks = [
    ...checkEnvironment(),
    await checkDatabase(),
    await checkUploadDirectory()
  ];

  return {
    status: worstStatus(checks),
    service: 'lqdc-target-cost-system',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    checks
  };
}
