import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';
import { writeOperationLog } from '@/lib/operation-log';

type Tx = Prisma.TransactionClient;

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calc(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  const taxInclusiveAmount = round2((quantity * taxInclusiveUnitPrice) / 10000);
  const taxExclusiveAmount = taxRate > 0 ? round2(taxInclusiveAmount / (1 + taxRate)) : taxInclusiveAmount;
  const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : 0;
  return { taxInclusiveAmount, taxExclusiveAmount, taxAmount, taxExclusiveUnitPrice };
}

function jsonError(code: string, message: string, status = 400) {
  return { ok: false as const, status, body: { success: false, error: { code, message } } };
}

function isInactiveProductText(text: string | null | undefined, inactiveNames: Set<string>) {
  const value = String(text || '').trim();
  if (!value) return false;
  return Array.from(inactiveNames).some((name) => value === name || value === `业态-${name}` || value === `区域-${name}` || value.includes(name));
}

async function markTargetCostAggregatesStale(tx: Tx, projectId: string, versionId: string) {
  await writeOperationLog(tx, {
    projectId,
    versionId,
    module: 'target_cost',
    action: 'aggregate_stale',
    targetType: 'ProjectVersion',
    targetId: versionId,
    remark: { reason: 'cost_line_quantity_changed', shouldRefreshAggregates: true }
  });
}

async function loadCostLine(tx: Tx, projectId: string, versionId: string, costLineId: string) {
  const line = await tx.costLine.findFirst({
    where: { id: costLineId, projectVersionId: versionId, projectVersion: { projectId } },
    include: { projectVersion: true, productType: true, costSubject: true }
  });
  return line;
}

async function validateLineEditable(tx: Tx, projectId: string, versionId: string, costLineId: string) {
  const line = await loadCostLine(tx, projectId, versionId, costLineId);
  if (!line) return { error: jsonError('COST_LINE_NOT_FOUND', '成本明细不存在。', 404) };
  if (isVersionLocked(line.projectVersion) || line.projectVersion.isLocked) return { error: jsonError('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423) };
  if (line.productTypeId && line.productType?.isActive === false) return { error: jsonError('PRODUCT_TYPE_DISABLED', '停用业态不能修改工程量。', 409) };

  const inactiveProducts = await tx.productType.findMany({
    where: { projectVersionId: versionId, isActive: false },
    select: { name: true }
  });
  if (isInactiveProductText(line.regionOrProductType, new Set(inactiveProducts.map((item) => item.name)))) {
    return { error: jsonError('PRODUCT_TYPE_DISABLED', '停用业态不能修改工程量。', 409) };
  }
  return { line };
}

export async function overrideCostLineQuantity(
  projectId: string,
  versionId: string,
  costLineId: string,
  input: { quantity: unknown; overrideReason?: string | null }
) {
  return prisma.$transaction(async (tx) => {
    const validation = await validateLineEditable(tx, projectId, versionId, costLineId);
    if (validation.error) return validation.error;
    const line = validation.line!;
    const quantity = n(input.quantity);
    const overrideReason = String(input.overrideReason || '').trim();
    if (quantity < 0) return jsonError('VALIDATION_FAILED', '工程量不能为负数。');
    if (!overrideReason) return jsonError('OVERRIDE_REASON_REQUIRED', '手算工程量必须填写 overrideReason。');

    const amounts = calc(quantity, n(line.taxInclusiveUnitPrice), n(line.taxRate) || 0.09);
    const beforeData = {
      detailId: line.id,
      quantity: n(line.quantity),
      quantityOverride: line.quantityOverride,
      taxInclusiveAmount: n(line.taxInclusiveAmount)
    };
    const updated = await tx.costLine.update({
      where: { id: line.id },
      data: {
        quantity,
        quantityOverride: true,
        taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
        taxInclusiveAmount: amounts.taxInclusiveAmount,
        taxExclusiveAmount: amounts.taxExclusiveAmount,
        taxAmount: amounts.taxAmount,
        remark: [line.remark || '', `手算工程量：${overrideReason}`].filter(Boolean).join('；')
      }
    });

    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'cost_quantity',
      action: 'manual_quantity_override',
      targetType: 'CostLine',
      targetId: line.id,
      beforeData,
      afterData: {
        detailId: line.id,
        quantity,
        finalQuantity: quantity,
        quantityOverride: true,
        taxInclusiveAmount: amounts.taxInclusiveAmount
      },
      remark: {
        detailId: line.id,
        beforeValue: beforeData.quantity,
        afterValue: quantity,
        overrideReason
      }
    });
    await markTargetCostAggregatesStale(tx, projectId, versionId);

    return {
      ok: true as const,
      status: 200,
      body: {
        success: true,
        data: {
          costLineId: updated.id,
          quantity: n(updated.quantity),
          finalQuantity: n(updated.quantity),
          quantityOverride: updated.quantityOverride,
          quantitySource: 'manual',
          taxInclusiveAmount: n(updated.taxInclusiveAmount),
          taxExclusiveAmount: n(updated.taxExclusiveAmount),
          taxAmount: n(updated.taxAmount),
          aggregateRefreshRequired: true
        }
      }
    };
  });
}

export async function restoreCostLineAutoQuantity(projectId: string, versionId: string, costLineId: string) {
  return prisma.$transaction(async (tx) => {
    const validation = await validateLineEditable(tx, projectId, versionId, costLineId);
    if (validation.error) return validation.error;
    const line = validation.line!;
    const measureValue = n(line.measureValue);
    const coefficient = n(line.coefficient) || 1;
    const quantity = round2(measureValue * coefficient);
    if (quantity < 0) return jsonError('VALIDATION_FAILED', '系统推算工程量不能为负数。');

    const amounts = calc(quantity, n(line.taxInclusiveUnitPrice), n(line.taxRate) || 0.09);
    const beforeData = {
      detailId: line.id,
      quantity: n(line.quantity),
      quantityOverride: line.quantityOverride,
      taxInclusiveAmount: n(line.taxInclusiveAmount)
    };
    const updated = await tx.costLine.update({
      where: { id: line.id },
      data: {
        quantity,
        quantityOverride: false,
        taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
        taxInclusiveAmount: amounts.taxInclusiveAmount,
        taxExclusiveAmount: amounts.taxExclusiveAmount,
        taxAmount: amounts.taxAmount,
        remark: [line.remark || '', '已恢复系统推算工程量'].filter(Boolean).join('；')
      }
    });

    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'cost_quantity',
      action: 'restore_auto_quantity',
      targetType: 'CostLine',
      targetId: line.id,
      beforeData,
      afterData: {
        detailId: line.id,
        measureValue,
        coefficient,
        quantity,
        finalQuantity: quantity,
        quantityOverride: false,
        taxInclusiveAmount: amounts.taxInclusiveAmount
      },
      remark: {
        detailId: line.id,
        beforeValue: beforeData.quantity,
        afterValue: quantity,
        overrideReason: null,
        formula: 'measureValue * coefficient'
      }
    });
    await markTargetCostAggregatesStale(tx, projectId, versionId);

    return {
      ok: true as const,
      status: 200,
      body: {
        success: true,
        data: {
          costLineId: updated.id,
          measureValue,
          coefficient,
          quantity: n(updated.quantity),
          finalQuantity: n(updated.quantity),
          quantityOverride: updated.quantityOverride,
          quantitySource: 'system',
          taxInclusiveAmount: n(updated.taxInclusiveAmount),
          taxExclusiveAmount: n(updated.taxExclusiveAmount),
          taxAmount: n(updated.taxAmount),
          aggregateRefreshRequired: true
        }
      }
    };
  });
}
