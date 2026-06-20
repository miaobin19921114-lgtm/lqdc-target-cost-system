import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value || '').trim();
  return text || null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const rowId = clean(form.get('rowId'));
  const baseUrl = getBaseUrl(request);
  const redirectUrl = `${baseUrl}/projects/${params.id}/allocation-rules`;

  if (!rowId) return NextResponse.redirect(`${redirectUrl}?saved=0`, 303);

  const result = await prisma.costDictionaryRow.updateMany({
    where: { id: rowId, projectId: params.id },
    data: {
      costAttributionMethod: clean(form.get('costAttributionMethod')),
      targetAllocationMethod: clean(form.get('targetAllocationMethod')),
      landVatAllocationMethod: clean(form.get('landVatAllocationMethod')),
      incomeTaxDeductionCategory: clean(form.get('incomeTaxDeductionCategory')),
      taxRemark: clean(form.get('taxRemark'))
    }
  });

  return NextResponse.redirect(`${redirectUrl}?saved=${result.count ? '1' : '0'}`, 303);
}
