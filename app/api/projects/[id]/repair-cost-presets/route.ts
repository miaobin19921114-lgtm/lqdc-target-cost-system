import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function parseTaxRate(value?: string | null, fallback = 0.09) {
  if (!value) return fallback;
  const text = value.trim();
  if (!text) return fallback;
  const numeric = Number(text.replace('%', ''));
  if (!Number.isFinite(numeric)) return fallback;
  return text.includes('%') || numeric > 1 ? numeric / 100 : numeric;
}

function needText(value?: string | null) {
  return !value || value.trim() === '' || value === '项目整体共用' || value === '建筑面积分摊';
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const baseUrl = getBaseUrl(request);
  const version = await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' } });
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/check?repaired=0`, 303);

  const dictionaryRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id } });
  const dictionaryByCode = new Map(dictionaryRows.filter((row) => row.costCode).map((row) => [row.costCode as string, row]));
  const costs = await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { costSubject: true } });

  let repaired = 0;
  for (const cost of costs) {
    const dict = dictionaryByCode.get(cost.costSubject.code);
    if (!dict) continue;
    const updateData: Record<string, any> = {};
    if (needText(cost.detailName)) updateData.detailName = dict.detailSubject || dict.thirdSubject || dict.secondSubject || cost.detailName;
    if (needText(cost.regionOrProductType)) updateData.regionOrProductType = dict.applicableProductType || cost.regionOrProductType || '项目整体共用';
    if (needText(cost.measureBasis)) updateData.measureBasis = dict.measureBasis || cost.measureBasis;
    if (needText(cost.unit)) updateData.unit = dict.unit || cost.unit || '项';
    if (needText(cost.allocationMethod)) updateData.allocationMethod = dict.targetAllocationMethod || cost.allocationMethod || '按可售面积占比';
    if (Number(cost.taxRate || 0) === 0.09 && dict.defaultTaxRate) updateData.taxRate = parseTaxRate(dict.defaultTaxRate, 0.09);
    if (!cost.description || !cost.description.includes('/')) {
      updateData.description = [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / ') || cost.description;
    }
    if (Object.keys(updateData).length) {
      repaired += 1;
      await prisma.costLine.update({ where: { id: cost.id }, data: updateData });
    }
  }

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/check?repaired=${repaired}`, 303);
}
