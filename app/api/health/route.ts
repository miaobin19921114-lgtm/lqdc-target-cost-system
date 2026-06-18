import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await getHealthStatus();
  const httpStatus = health.status === 'error' ? 503 : 200;
  return NextResponse.json(health, { status: httpStatus });
}
