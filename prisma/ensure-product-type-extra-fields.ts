import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const extraFieldName = 'tax' + 'Liquidation' + 'Object';

type ProductRow = {
  id: string;
  name: string;
  isSaleable: boolean;
  productCategory: string | null;
  saleAttribute: string | null;
  costObject: string | null;
  clearingObject: string | null;
};

const statements = [
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "productPosition" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "deliveryStandard" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "fitoutStandard" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "allocationMethod" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "landVatCategory" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "incomeTaxCostObject" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "productCategory" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "saleAttribute" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "costObject" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "clearingObject" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "${extraFieldName}" TEXT`,
  `CREATE INDEX IF NOT EXISTS "ProductType_productPosition_idx" ON "ProductType" ("productPosition")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_landVatCategory_idx" ON "ProductType" ("landVatCategory")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_incomeTaxCostObject_idx" ON "ProductType" ("incomeTaxCostObject")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_productCategory_idx" ON "ProductType" ("productCategory")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_saleAttribute_idx" ON "ProductType" ("saleAttribute")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_costObject_idx" ON "ProductType" ("costObject")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_clearingObject_idx" ON "ProductType" ("clearingObject")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_${extraFieldName}_idx" ON "ProductType" ("${extraFieldName}")`
];

function has(name: string, words: string[]) {
  return words.some((word) => name.includes(word));
}

function inferProductCategory(name: string, isSaleable: boolean) {
  if (has(name, ['车位', '车库', '储藏'])) return '车位类';
  if (has(name, ['地下室', '地库', '人防'])) return '地下空间';
  if (has(name, ['高层', '小高层', '洋房', '叠拼', '联排', '别墅', '合院', '住宅'])) return '住宅类';
  if (has(name, ['底商', '商业', '商铺', '办公', '公寓', 'LOFT', '酒店', '会所'])) return '商业类';
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
  if (has(name, ['底商', '商业', '商铺', '办公', '公寓', 'LOFT', '酒店', '会所'])) return '归属商业';
  if (has(name, ['地下室', '地库', '车位', '车库', '人防'])) return '归属地下室';
  if (has(name, ['示范区', '售楼部', '样板间'])) return '销售费用';
  return '归属项目整体';
}

function inferClearingObject(name: string, isSaleable: boolean) {
  if (!isSaleable) return '不可售配套';
  if (has(name, ['人防'])) return '人防/特殊物业';
  if (has(name, ['车位', '车库', '储藏'])) return '非住宅-车位';
  if (has(name, ['底商', '商业', '商铺', '商业街', '商业综合体'])) return '非住宅-商业';
  if (has(name, ['办公', '公寓', 'LOFT', '酒店', '会所'])) return '非住宅-办公/公寓';
  if (has(name, ['140', '大户型', '改善', '非普通'])) return '非普通住宅＞140㎡';
  return '普通住宅≤140㎡';
}

async function backfillProfessionalFields() {
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    'SELECT "id", "name", "isSaleable", "productCategory", "saleAttribute", "costObject", "clearingObject" FROM "ProductType"'
  );

  for (const row of rows) {
    const category = row.productCategory?.trim() || inferProductCategory(row.name, row.isSaleable);
    const saleAttr = row.saleAttribute?.trim() || inferSaleAttribute(row.name, row.isSaleable);
    const costObject = row.costObject?.trim() || inferCostObject(row.name);
    const clearing = row.clearingObject?.trim() || inferClearingObject(row.name, row.isSaleable);

    await prisma.$executeRawUnsafe(
      `UPDATE "ProductType" SET "productCategory" = $1, "saleAttribute" = $2, "costObject" = $3, "clearingObject" = $4, "${extraFieldName}" = COALESCE(NULLIF("${extraFieldName}", ''), $4) WHERE "id" = $5`,
      category,
      saleAttr,
      costObject,
      clearing,
      row.id
    );
  }
}

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  await backfillProfessionalFields();
  console.log('Ensured ProductType extra business fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
