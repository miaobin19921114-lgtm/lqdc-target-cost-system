import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { normalizeVersionStage } from '@/lib/version-stage';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    select: { id: true, stage: true }
  });
  const stage = normalizeVersionStage(version?.stage);

  const rules = await prisma.measureBasisRule.findMany({
    where: { enabled: true },
    orderBy: [{ costCode: 'asc' }, { priority: 'asc' }, { basisName: 'asc' }],
    include: {
      stageRules: {
        where: { enabled: true, stage },
        orderBy: [{ isDefault: 'desc' }, { priority: 'asc' }]
      }
    }
  });

  const result = rules
    .map((rule) => ({
      id: rule.id,
      costCode: rule.costCode,
      basisName: rule.basisName,
      metricKey: rule.metricKey,
      metricScope: rule.metricScope,
      quantityUnit: rule.quantityUnit,
      pricingUnit: rule.pricingUnit,
      defaultCoefficient: Number(rule.defaultCoefficient || 1),
      quantityFormula: rule.quantityFormula,
      amountFormula: rule.amountFormula,
      applicableProductType: rule.applicableProductType,
      allowManualOverride: rule.allowManualOverride,
      priority: rule.stageRules[0]?.priority ?? rule.priority,
      isDefault: rule.stageRules[0]?.isDefault ?? false,
      remark: rule.remark,
      stageMatched: rule.stageRules.length > 0
    }))
    .sort((a, b) => Number(b.stageMatched) - Number(a.stageMatched) || Number(b.isDefault) - Number(a.isDefault) || a.priority - b.priority);

  return NextResponse.json({ stage, rules: result });
}
