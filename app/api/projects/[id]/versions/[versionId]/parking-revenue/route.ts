import { NextResponse } from 'next/server';
import { getV1ParkingRevenueStatus } from '@/lib/v1-cost-chain';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getV1ParkingRevenueStatus(params.id, params.versionId);
  if (!data) return NextResponse.json({ success: false, error: { code: 'VERSION_NOT_FOUND', message: '测算版本不存在。' } }, { status: 404 });
  return NextResponse.json({ success: true, data });
}
