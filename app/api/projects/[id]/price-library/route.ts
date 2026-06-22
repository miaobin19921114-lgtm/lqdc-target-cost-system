import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function numberFrom(form: FormData, name: string, fallback = 0) {
  const raw = clean(form, name);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  return Number.isFinite(num) ? num : fallback;
}

function boolFrom(form: FormData, name: string) {
  const value = clean(form, name);
  return value === '1' || value === 'true' || value === 'on';
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function rowId(form: FormData) {
  const key = [clean(form, 'costCode'), clean(form, 'indicatorName'), clean(form, 'city'), clean(form, 'productType'), clean(form, 'stage'), clean(form, 'standardLevel')].join('-');
  return key.replace(/[^\w\u4e00-\u9fa5.-]/g, '-').slice(0, 120) || `price-${Date.now()}`;
}

function taxRateFrom(form: FormData) {
  const raw = clean(form, 'taxRate');
  if (!raw) return 0.09;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return 0.09;
  if (raw.includes('%')) return num / 100;
  return num > 1 ? num / 100 : num;
}

function normalizePrice(form: FormData, taxRate: number) {
  const pricingUnit = clean(form, 'pricingUnit');
  const rawPrice = numberFrom(form, 'taxInclusiveUnitPrice', 0);
  const taxInclusiveUnitPrice = pricingUnit.includes('万元/') && rawPrice > 0 && rawPrice < 10000 ? rawPrice * 10000 : rawPrice;
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice / (1 + taxRate);
  return { taxInclusiveUnitPrice, taxExclusiveUnitPrice };
}

async function ensurePriceTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PriceIndicatorLibrary" (
      "id" TEXT PRIMARY KEY,
      "costCode" TEXT NOT NULL,
      "subjectName" TEXT,
      "indicatorName" TEXT NOT NULL,
      "region" TEXT DEFAULT '全国',
      "city" TEXT DEFAULT '通用',
      "productType" TEXT DEFAULT '通用',
      "stage" TEXT DEFAULT 'SCHEME',
      "standardLevel" TEXT DEFAULT '标准',
      "quantityUnit" TEXT,
      "pricingUnit" TEXT,
      "taxInclusiveUnitPrice" DECIMAL(18, 4) DEFAULT 0,
      "taxExclusiveUnitPrice" DECIMAL(18, 4) DEFAULT 0,
      "taxRate" DECIMAL(8, 4) DEFAULT 0.09,
      "sourceType" TEXT DEFAULT 'manual',
      "sourceName" TEXT,
      "effectiveDate" TEXT,
      "confidence" DECIMAL(8, 4) DEFAULT 0.6,
      "enabled" BOOLEAN DEFAULT TRUE,
      "remark" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("costCode", "indicatorName", "region", "city", "productType", "stage", "standardLevel")
    )`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const action = clean(form, 'action') || 'update-price';
  const baseUrl = getBaseUrl(request);
  const q = clean(form, 'q');
  const cityFilter = clean(form, 'cityFilter');
  const stageFilter = clean(form, 'stageFilter');
  const backQuery = new URLSearchParams();
  if (q) backQuery.set('q', q);
  if (cityFilter) backQuery.set('city', cityFilter);
  if (stageFilter) backQuery.set('stage', stageFilter);

  const redirect = (result: string) => {
    backQuery.set(result, '1');
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/price-library?${backQuery.toString()}`, 303);
  };

  await ensurePriceTable();

  if (action === 'disable-price') {
    const id = clean(form, 'id');
    if (!id) return redirect('missing');
    await prisma.$executeRaw`UPDATE "PriceIndicatorLibrary" SET "enabled" = FALSE, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
    return redirect('disabled');
  }

  const costCode = clean(form, 'costCode');
  const indicatorName = clean(form, 'indicatorName');
  if (!costCode || !indicatorName) return redirect('missing');

  const id = clean(form, 'id') || rowId(form);
  const taxRate = taxRateFrom(form);
  const prices = normalizePrice(form, taxRate);
  const sourceType = clean(form, 'sourceType') || 'manual';
  const sourceName = clean(form, 'sourceName') || '手工维护';
  const effectiveDate = clean(form, 'effectiveDate') || new Date().toISOString().slice(0, 10);
  const confidence = numberFrom(form, 'confidence', 0.6);
  const enabled = !clean(form, 'enabled') || boolFrom(form, 'enabled');

  await prisma.$executeRaw`
    INSERT INTO "PriceIndicatorLibrary" (
      "id", "costCode", "subjectName", "indicatorName", "region", "city", "productType", "stage", "standardLevel", "quantityUnit", "pricingUnit", "taxInclusiveUnitPrice", "taxExclusiveUnitPrice", "taxRate", "sourceType", "sourceName", "effectiveDate", "confidence", "enabled", "remark", "updatedAt"
    ) VALUES (${id}, ${costCode}, ${clean(form, 'subjectName') || null}, ${indicatorName}, ${clean(form, 'region') || '全国'}, ${clean(form, 'city') || '通用'}, ${clean(form, 'productType') || '通用'}, ${clean(form, 'stage') || 'SCHEME'}, ${clean(form, 'standardLevel') || '标准'}, ${clean(form, 'quantityUnit') || null}, ${clean(form, 'pricingUnit') || null}, ${prices.taxInclusiveUnitPrice}, ${prices.taxExclusiveUnitPrice}, ${taxRate}, ${sourceType}, ${sourceName}, ${effectiveDate}, ${confidence}, ${enabled}, ${clean(form, 'remark') || null}, CURRENT_TIMESTAMP)
    ON CONFLICT ("costCode", "indicatorName", "region", "city", "productType", "stage", "standardLevel") DO UPDATE SET
      "subjectName" = EXCLUDED."subjectName",
      "quantityUnit" = EXCLUDED."quantityUnit",
      "pricingUnit" = EXCLUDED."pricingUnit",
      "taxInclusiveUnitPrice" = EXCLUDED."taxInclusiveUnitPrice",
      "taxExclusiveUnitPrice" = EXCLUDED."taxExclusiveUnitPrice",
      "taxRate" = EXCLUDED."taxRate",
      "sourceType" = EXCLUDED."sourceType",
      "sourceName" = EXCLUDED."sourceName",
      "effectiveDate" = EXCLUDED."effectiveDate",
      "confidence" = EXCLUDED."confidence",
      "enabled" = EXCLUDED."enabled",
      "remark" = EXCLUDED."remark",
      "updatedAt" = CURRENT_TIMESTAMP`;

  return redirect(action === 'create-price' ? 'created' : 'saved');
}
