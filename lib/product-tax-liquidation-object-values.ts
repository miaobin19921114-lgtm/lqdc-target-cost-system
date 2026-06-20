import { prisma } from './prisma';

export async function getProductTaxLiquidationObjectMap(projectVersionId: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; taxLiquidationObject: string | null }>>(
      'SELECT "id", "taxLiquidationObject" FROM "ProductType" WHERE "projectVersionId" = $1',
      projectVersionId
    );
    return new Map(rows.map((row) => [row.id, row.taxLiquidationObject]));
  } catch (error) {
    console.warn('taxLiquidationObject column is not ready, fallback to product-name rules.', error);
    return new Map<string, string | null>();
  }
}
