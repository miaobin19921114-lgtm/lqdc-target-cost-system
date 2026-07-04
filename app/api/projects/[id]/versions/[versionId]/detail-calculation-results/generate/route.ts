import { NextResponse } from 'next/server';
import { assertVersionEditable } from '@/lib/project-version';
import { aggregateV1TargetCostMeasure, generateV1DetailCalculationResults, getV1DetailCalculationResults } from '@/lib/v1-cost-chain';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const editable = await assertVersionEditable(params.id, params.versionId);
  if (!editable.ok) return editable.response;
  const generated = await generateV1DetailCalculationResults(params.id, params.versionId);
  if (!generated) return NextResponse.json({ success: false, error: { code: 'VERSION_NOT_FOUND', message: '测算版本不存在。' } }, { status: 404 });
  await aggregateV1TargetCostMeasure(params.id, params.versionId);
  const results = await getV1DetailCalculationResults(params.id, params.versionId);
  return NextResponse.json({ success: true, data: { ...generated, results } });
}
