import { describe, expect, it, vi } from 'vitest';
import { calculateRuleDrivenQuantity } from '../lib/rule-driven-quantity';

function baseInput(metricKey: string) {
  return {
    projectId: 'project-1',
    projectVersionId: 'version-1',
    costCode: '03.01',
    basisName: metricKey,
    fallbackMeasureValue: 0,
    fallbackCoefficient: 2,
    fallbackQuantity: 0,
    quantityOverride: false,
    fallbackUnit: 'm'
  };
}

function mockPrisma(metricKey: string, project: Record<string, unknown>) {
  return {
    projectVersion: { findUnique: vi.fn().mockResolvedValue({ stage: 'SCHEME' }) },
    measureBasisRule: {
      findFirst: vi.fn().mockResolvedValue({
        id: `rule-${metricKey}`,
        costCode: '03.01',
        basisName: metricKey,
        metricKey,
        metricScope: 'project',
        defaultCoefficient: 1,
        quantityFormula: '',
        quantityUnit: 'm'
      }),
      findMany: vi.fn()
    },
    projectMetricValue: { findFirst: vi.fn().mockResolvedValue(null) },
    project: { findUnique: vi.fn().mockResolvedValue(project) }
  } as any;
}

describe('rule driven project metric aliases', () => {
  it('resolves basement level heights from Project fallback fields', async () => {
    const b2 = await calculateRuleDrivenQuantity(mockPrisma('basementB2Height', { basementB2FloorHeight: 4.2 }), baseInput('basementB2Height'));
    const other = await calculateRuleDrivenQuantity(mockPrisma('basementOtherAvgHeight', { basementOtherAvgFloorHeight: 3.9 }), baseInput('basementOtherAvgHeight'));

    expect(b2).toMatchObject({ applied: true, measureValue: 4.2, quantity: 8.4 });
    expect(other).toMatchObject({ applied: true, measureValue: 3.9, quantity: 7.8 });
  });

  it('resolves mechanical parking count directly from Project', async () => {
    const result = await calculateRuleDrivenQuantity(mockPrisma('mechanicalParkingCount', { mechanicalParkingCount: 18 }), {
      ...baseInput('mechanicalParkingCount'),
      fallbackUnit: '个'
    });

    expect(result).toMatchObject({ applied: true, measureValue: 18, quantity: 36 });
  });
});
