import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

const taxField = 'tax' + 'Liquidation' + 'Object';

type ProductRow = {
  id: string;
  name: string;
  isSaleable: boolean;
  productCategory: string | null;
  saleAttribute: string | null;
  costObject: string | null;
  clearingObject: string | null;
};

function has(name: string, words: string[]) {
  return words.some((word) => name.includes(word));
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function inferProductCategory(name: string, isSaleable: boolean) {
  if (has(name, ['车位', '车库', '储藏'])) return '车位类';
  if (has(name, ['地下室', '地库', '人防'])) return '地下空间';
  if (has(name, ['高层', '小高层', '洋房', '叠拼', '联排', '别墅', '合院', '住宅'])) return '住宅类';
  if (has(name, ['底商', '商业', '商铺', '办公', '公寓', 'LOFT', '酒店', '会所', '写字楼'])) return '商业类';
  if (has(name, ['物业', '社区', '养老', '托育', '幼儿园', '公厕', '门卫', '设备用房'])) return '配套公建';
  if (has(name, ['示范区', '售楼部', '样板间', '庭院', '水系', '游泳池'])) return '示范区 / 专项区域';
  return isSaleable ? '住宅类' : '配套公建';
}

function inferSaleAttribute(name: string, isSaleable: boolean) {
  if (has(name, ['人防'])) return '人防';
  if (has(name, ['物业', '社区', '养老', '托育', '幼儿园', '公厕', '门卫', '设备用房'])) return '配套';
  if (has(name, ['示范区', '售楼部', '样板间'])) return '临时展示';
  return isSaleable ? '可售' : '不可售';
}

function inferCostObject(name: string) {
  if (has(name, ['高层', '小高层', '洋房', '叠拼', '联排', '别墅', '合院', '住宅'])) return '归属住宅';
  if (has(name, ['底商', '商业', '商铺', '办公', '公寓', 'LOFT', '酒店', '会所', '写字楼'])) return '归属商业';
  if (has(name, ['地下室', '地库', '车位', '车库', '人防'])) return '归属地下室';
  if (has(name, ['示范区', '售楼部', '样板间'])) return '销售费用';
  return '归属项目整体';
}

function inferClearingObject(name: string, isSaleable: boolean) {
  if (!isSaleable) return '不可售配套';
  if (has(name, ['人防'])) return '人防/特殊物业';
  if (has(name, ['车位', '车库', '储藏'])) return '非住宅-车位';
  if (has(name, ['底商', '商业', '商铺', '商业街', '商业综合体'])) return '非住宅-商业';
  if (has(name, ['办公', '公寓', 'LOFT', '酒店', '会所', '写字楼'])) return '非住宅-办公/公寓';
  if (has(name, ['140', '大户型', '改善', '非普通'])) return '非普通住宅＞140㎡';
  return '普通住宅≤140㎡';
}

function relatedBasementName(name: string) {
  if (has(name, ['小高层'])) return '小高层主楼地下室';
  if (has(name, ['高层住宅', '高层'])) return '高层主楼地下室';
  if (has(name, ['洋房'])) return '洋房主楼地下室';
  if (has(name, ['叠拼', '联排'])) return '叠拼/联排地下室';
  if (has(name, ['别墅', '合院'])) return '别墅/合院地下室';
  if (has(name, ['底商', '商业', '商铺', '办公', '公寓', 'LOFT', '酒店', '会所', '写字楼'])) return '商业地下室';
  return null;
}

async function setBlankProfessionalFields(id: string, productCategory: string, saleAttribute: string, costObject: string, clearingObject: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE "ProductType"
     SET "productCategory" = COALESCE(NULLIF("productCategory", ''), $1),
         "saleAttribute" = COALESCE(NULLIF("saleAttribute", ''), $2),
         "costObject" = COALESCE(NULLIF("costObject", ''), $3),
         "clearingObject" = COALESCE(NULLIF("clearingObject", ''), $4),
         "${taxField}" = COALESCE(NULLIF("${taxField}", ''), COALESCE(NULLIF("clearingObject", ''), $4))
     WHERE "id" = $5`,
    productCategory,
    saleAttribute,
    costObject,
    clearingObject,
    id
  );
}

async function ensureProduct(projectVersionId: string, name: string, remark: string) {
  const existing = await prisma.productType.findFirst({ where: { projectVersionId, name }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.productType.create({
    data: {
      projectVersionId,
      name,
      category: '地下空间',
      buildingArea: 0,
      saleableArea: 0,
      capacityArea: 0,
      nonSaleableArea: 0,
      isSaleable: false,
      participateAllocation: true,
      allocationWeight: 1,
      remark
    },
    select: { id: true }
  });
  return created.id;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const baseUrl = getBaseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?organized=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?locked=1`, 303);

  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    'SELECT "id", "name", "isSaleable", "productCategory", "saleAttribute", "costObject", "clearingObject" FROM "ProductType" WHERE "projectVersionId" = $1',
    version.id
  );

  for (const row of rows) {
    await setBlankProfessionalFields(
      row.id,
      inferProductCategory(row.name, row.isSaleable),
      inferSaleAttribute(row.name, row.isSaleable),
      inferCostObject(row.name),
      inferClearingObject(row.name, row.isSaleable)
    );
  }

  const basementNames = new Set<string>();
  for (const row of rows) {
    if (has(row.name, ['地下室', '地库', '车位', '车库', '人防', '充电'])) continue;
    const basementName = relatedBasementName(row.name);
    if (basementName) basementNames.add(basementName);
  }

  for (const name of basementNames) {
    const id = await ensureProduct(version.id, name, '一键整理自动补齐：对应地上业态的主楼地下室。');
    await setBlankProfessionalFields(id, '地下空间', '不可售', '归属地下室', '不可售配套');
  }

  const pureGarageId = await ensureProduct(version.id, '非主楼纯地库', '一键整理自动补齐：非主楼区域地下车库。');
  await setBlankProfessionalFields(pureGarageId, '地下空间', '不可售', '归属地下室', '不可售配套');

  const civilDefenseId = await ensureProduct(version.id, '人防地下室', '一键整理自动补齐：人防地下室。');
  await setBlankProfessionalFields(civilDefenseId, '地下空间', '人防', '归属地下室', '人防/特殊物业');

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?organized=1`, 303);
}
