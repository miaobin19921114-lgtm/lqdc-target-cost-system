import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: { orderBy: { createdAt: 'asc' } } }
  });

  return NextResponse.json({
    project: {
      landArea: Number(project.landArea || 0),
      redLineArea: Number(project.redLineArea || 0),
      totalBuildingArea: Number(project.totalBuildingArea || 0),
      capacityBuildingArea: Number(project.capacityBuildingArea || 0),
      aboveGroundArea: Number(project.aboveGroundArea || 0),
      undergroundArea: Number(project.undergroundArea || 0),
      saleableArea: Number(project.saleableArea || 0),
      parkingCount: Number(project.parkingCount || 0),
      chargingPileCount: Number(project.chargingPileCount || 0),
      sitePerimeter: Number(project.sitePerimeter || 0),
      gateCount: Number(project.gateCount || 0),
      formalGateCount: Number(project.formalGateCount || 0),
      temporaryGateCount: Number(project.temporaryGateCount || 0),
      temporaryFacilityArea: Number(project.temporaryFacilityArea || 0),
      siteLevelingArea: Number(project.siteLevelingArea || 0),
      landscapeArea: Number(project.landscapeArea || 0),
      hardscapeArea: Number(project.hardscapeArea || 0),
      softscapeArea: Number(project.softscapeArea || 0),
      greenArea: Number(project.greenArea || 0),
      roadArea: Number(project.roadArea || 0),
      fireRoadArea: Number(project.fireRoadArea || 0),
      asphaltRoadArea: Number(project.asphaltRoadArea || 0),
      basementParkingArea: Number(project.basementParkingArea || 0),
      mainBuildingUndergroundArea: Number(project.mainBuildingUndergroundArea || 0),
      civilDefenseArea: Number(project.civilDefenseArea || 0),
      nonCivilDefenseArea: Number(project.nonCivilDefenseArea || 0),
      publicArea: Number(project.publicArea || 0),
      lobbyArea: Number(project.lobbyArea || 0),
      propertyManagementArea: Number(project.propertyManagementArea || 0),
      communityServiceArea: Number(project.communityServiceArea || 0),
      baseArea: Number(project.baseArea || 0),
      pileFoundationArea: Number(project.pileFoundationArea || 0),
      earthworkVolume: Number(project.earthworkVolume || 0),
      waterproofArea: Number(project.waterproofArea || 0),
      roofArea: Number(project.roofArea || 0),
      insulationArea: Number(project.insulationArea || 0),
      facadeArea: Number(project.facadeArea || 0),
      windowArea: Number(project.windowArea || 0),
      railingLength: Number(project.railingLength || 0),
      powerRoomCount: Number(project.powerRoomCount || 0),
      pumpRoomCount: Number(project.pumpRoomCount || 0),
      firePoolVolume: Number(project.firePoolVolume || 0),
      elevatorCount: Number(project.elevatorCount || 0),
      unitCount: Number(project.unitCount || 0),
      householdCount: Number(project.householdCount || 0),
      buildingCount: Number(project.buildingCount || 0),
      standardFloorArea: Number(project.standardFloorArea || 0)
    },
    products: (version?.products || []).filter((item) => item.isActive).map((item) => ({
      name: item.name,
      buildingArea: Number(item.buildingArea || 0),
      saleableArea: Number(item.saleableArea || 0),
      capacityArea: Number(item.capacityArea || 0),
      nonSaleableArea: Number(item.nonSaleableArea || 0)
    }))
  });
}
