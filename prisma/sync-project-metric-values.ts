import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type MetricField = {
  key: string;
  field: string;
  unit: string;
  scope: string;
};

const projectMetricFields: MetricField[] = [
  { key: 'landArea', field: 'landArea', unit: '㎡', scope: 'project' },
  { key: 'landAreaMu', field: 'landAreaMu', unit: '亩', scope: 'project' },
  { key: 'redLineArea', field: 'redLineArea', unit: '㎡', scope: 'project' },
  { key: 'totalBuildingArea', field: 'totalBuildingArea', unit: '㎡', scope: 'project' },
  { key: 'capacityBuildingArea', field: 'capacityBuildingArea', unit: '㎡', scope: 'project' },
  { key: 'aboveGroundArea', field: 'aboveGroundArea', unit: '㎡', scope: 'project' },
  { key: 'undergroundArea', field: 'undergroundArea', unit: '㎡', scope: 'project' },
  { key: 'saleableArea', field: 'saleableArea', unit: '㎡', scope: 'project' },
  { key: 'nonSaleableArea', field: 'nonSaleableArea', unit: '㎡', scope: 'project' },
  { key: 'baseArea', field: 'baseArea', unit: '㎡', scope: 'project' },
  { key: 'standardFloorArea', field: 'standardFloorArea', unit: '㎡', scope: 'project' },
  { key: 'basementParkingArea', field: 'basementParkingArea', unit: '㎡', scope: 'project' },
  { key: 'mainBuildingUndergroundArea', field: 'mainBuildingUndergroundArea', unit: '㎡', scope: 'project' },
  { key: 'civilDefenseArea', field: 'civilDefenseArea', unit: '㎡', scope: 'project' },
  { key: 'nonCivilDefenseArea', field: 'nonCivilDefenseArea', unit: '㎡', scope: 'project' },
  { key: 'parkingCount', field: 'parkingCount', unit: '个', scope: 'project' },
  { key: 'undergroundPropertyParkingCount', field: 'undergroundPropertyParkingCount', unit: '个', scope: 'project' },
  { key: 'undergroundUseRightParkingCount', field: 'undergroundUseRightParkingCount', unit: '个', scope: 'project' },
  { key: 'civilDefenseParkingCount', field: 'civilDefenseParkingCount', unit: '个', scope: 'project' },
  { key: 'aboveGroundParkingCount', field: 'aboveGroundParkingCount', unit: '个', scope: 'project' },
  { key: 'buildingCount', field: 'buildingCount', unit: '栋', scope: 'project' },
  { key: 'unitCount', field: 'unitCount', unit: '个', scope: 'project' },
  { key: 'householdCount', field: 'householdCount', unit: '户', scope: 'project' },
  { key: 'elevatorCount', field: 'elevatorCount', unit: '台', scope: 'project' },
  { key: 'aboveGroundFloors', field: 'aboveGroundFloors', unit: '层', scope: 'project' },
  { key: 'basementFloors', field: 'basementFloors', unit: '层', scope: 'project' },
  { key: 'standardFloorHeight', field: 'standardFloorHeight', unit: 'm', scope: 'project' },
  { key: 'basementFloorHeight', field: 'basementFloorHeight', unit: 'm', scope: 'project' },
  { key: 'sitePerimeter', field: 'sitePerimeter', unit: 'm', scope: 'project' },
  { key: 'gateCount', field: 'gateCount', unit: '个', scope: 'project' },
  { key: 'formalGateCount', field: 'formalGateCount', unit: '个', scope: 'project' },
  { key: 'temporaryGateCount', field: 'temporaryGateCount', unit: '个', scope: 'project' },
  { key: 'temporaryFacilityArea', field: 'temporaryFacilityArea', unit: '㎡', scope: 'project' },
  { key: 'siteLevelingArea', field: 'siteLevelingArea', unit: '㎡', scope: 'project' },
  { key: 'landscapeArea', field: 'landscapeArea', unit: '㎡', scope: 'project' },
  { key: 'hardscapeArea', field: 'hardscapeArea', unit: '㎡', scope: 'project' },
  { key: 'softscapeArea', field: 'softscapeArea', unit: '㎡', scope: 'project' },
  { key: 'greenArea', field: 'greenArea', unit: '㎡', scope: 'project' },
  { key: 'waterFeatureArea', field: 'waterFeatureArea', unit: '㎡', scope: 'project' },
  { key: 'childrenActivityArea', field: 'childrenActivityArea', unit: '㎡', scope: 'project' },
  { key: 'elevatedFloorLandscapeArea', field: 'elevatedFloorLandscapeArea', unit: '㎡', scope: 'project' },
  { key: 'roadArea', field: 'roadArea', unit: '㎡', scope: 'project' },
  { key: 'fireRoadArea', field: 'fireRoadArea', unit: '㎡', scope: 'project' },
  { key: 'asphaltRoadArea', field: 'asphaltRoadArea', unit: '㎡', scope: 'project' },
  { key: 'pileFoundationArea', field: 'pileFoundationArea', unit: '㎡', scope: 'project' },
  { key: 'earthworkVolume', field: 'earthworkVolume', unit: 'm³', scope: 'project' },
  { key: 'waterproofArea', field: 'waterproofArea', unit: '㎡', scope: 'project' },
  { key: 'roofArea', field: 'roofArea', unit: '㎡', scope: 'project' },
  { key: 'insulationArea', field: 'insulationArea', unit: '㎡', scope: 'project' },
  { key: 'facadeArea', field: 'facadeArea', unit: '㎡', scope: 'project' },
  { key: 'windowArea', field: 'windowArea', unit: '㎡', scope: 'project' },
  { key: 'railingLength', field: 'railingLength', unit: 'm', scope: 'project' },
  { key: 'publicArea', field: 'publicArea', unit: '㎡', scope: 'project' },
  { key: 'lobbyArea', field: 'lobbyArea', unit: '㎡', scope: 'project' },
  { key: 'salesOfficeArea', field: 'salesOfficeArea', unit: '㎡', scope: 'project' },
  { key: 'showFlatArea', field: 'showFlatArea', unit: '㎡', scope: 'project' },
  { key: 'propertyManagementArea', field: 'propertyManagementArea', unit: '㎡', scope: 'project' },
  { key: 'communityServiceArea', field: 'communityServiceArea', unit: '㎡', scope: 'project' },
  { key: 'powerRoomCount', field: 'powerRoomCount', unit: '个', scope: 'project' },
  { key: 'pumpRoomCount', field: 'pumpRoomCount', unit: '个', scope: 'project' },
  { key: 'firePoolVolume', field: 'firePoolVolume', unit: 'm³', scope: 'project' },
  { key: 'chargingPileCount', field: 'chargingPileCount', unit: '个', scope: 'project' },
  { key: 'fastChargingPileCount', field: 'fastChargingPileCount', unit: '个', scope: 'project' },
  { key: 'slowChargingPileCount', field: 'slowChargingPileCount', unit: '个', scope: 'project' },
  { key: 'reservedChargingPileCount', field: 'reservedChargingPileCount', unit: '个', scope: 'project' },
  { key: 'parkingPowerCapacity', field: 'parkingPowerCapacity', unit: 'kVA', scope: 'project' }
];

const productMetricFields: MetricField[] = [
  { key: 'product.buildingArea', field: 'buildingArea', unit: '㎡', scope: 'product' },
  { key: 'product.saleableArea', field: 'saleableArea', unit: '㎡', scope: 'product' },
  { key: 'product.capacityArea', field: 'capacityArea', unit: '㎡', scope: 'product' },
  { key: 'product.nonSaleableArea', field: 'nonSaleableArea', unit: '㎡', scope: 'product' }
];

function numericValue(source: Record<string, unknown>, field: string) {
  const value = source[field];
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (value && typeof value === 'object' && 'toString' in value) return Number(value.toString()) || 0;
  return Number(value || 0) || 0;
}

async function main() {
  const definitions = await prisma.projectMetricDefinition.findMany({ where: { enabled: true }, select: { key: true, unit: true } });
  const definitionMap = new Map(definitions.map((item) => [item.key, item]));
  const projects = await prisma.project.findMany({
    include: {
      versions: {
        include: { products: true }
      }
    }
  });

  let createdCount = 0;

  for (const project of projects) {
    await prisma.projectMetricValue.deleteMany({
      where: {
        projectId: project.id,
        source: { in: ['project_overview_sync', 'product_sync'] }
      }
    });

    const values = [];
    const versions = project.versions.length ? project.versions : [];

    for (const version of versions) {
      for (const metric of projectMetricFields) {
        if (!definitionMap.has(metric.key)) continue;
        values.push({
          projectId: project.id,
          projectVersionId: version.id,
          metricKey: metric.key,
          scope: metric.scope,
          value: numericValue(project as unknown as Record<string, unknown>, metric.field),
          unit: definitionMap.get(metric.key)?.unit || metric.unit,
          source: 'project_overview_sync',
          sourceRef: project.id,
          confidence: 1,
          remark: '由项目概况字段同步生成'
        });
      }

      for (const product of version.products) {
        for (const metric of productMetricFields) {
          if (!definitionMap.has(metric.key)) continue;
          values.push({
            projectId: project.id,
            projectVersionId: version.id,
            productTypeId: product.id,
            metricKey: metric.key,
            scope: metric.scope,
            value: numericValue(product as unknown as Record<string, unknown>, metric.field),
            unit: definitionMap.get(metric.key)?.unit || metric.unit,
            source: 'product_sync',
            sourceRef: product.id,
            confidence: 1,
            remark: '由项目业态字段同步生成'
          });
        }
      }
    }

    if (values.length) {
      await prisma.projectMetricValue.createMany({ data: values });
      createdCount += values.length;
    }
  }

  console.log(`Synced ${createdCount} project metric values from project overview and product fields.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
