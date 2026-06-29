import { prisma } from './prisma';

export async function getProjectVersionRevenueLines(projectVersionId?: string | null) {
  if (!projectVersionId) return { commercialRevenueLines: [], otherRevenueLines: [] };

  const [commercialRevenueLines, otherRevenueLines] = await Promise.all([
    prisma.commercialRevenueLine.findMany({ where: { projectVersionId } }),
    prisma.otherRevenueLine.findMany({ where: { projectVersionId } })
  ]);

  return { commercialRevenueLines, otherRevenueLines };
}
