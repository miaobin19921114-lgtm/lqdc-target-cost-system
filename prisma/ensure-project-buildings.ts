import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS "ProjectBuilding" (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectVersionId" TEXT,
    "productTypeId" TEXT,
    "buildingCode" TEXT NOT NULL,
    "buildingName" TEXT,
    "phaseName" TEXT,
    "groupName" TEXT,
    "buildingType" TEXT DEFAULT '住宅',
    "sortOrder" INTEGER DEFAULT 0,
    "enabled" BOOLEAN DEFAULT TRUE,

    "aboveGroundFloors" INTEGER DEFAULT 0,
    "basementFloors" INTEGER DEFAULT 0,
    "unitCount" INTEGER DEFAULT 0,
    "householdCount" INTEGER DEFAULT 0,
    "elevatorCount" INTEGER DEFAULT 0,
    "standardFloorHeight" DECIMAL(18,4) DEFAULT 0,
    "basementFloorHeight" DECIMAL(18,4) DEFAULT 0,
    "buildingHeight" DECIMAL(18,4) DEFAULT 0,

    "footprintArea" DECIMAL(18,4) DEFAULT 0,
    "baseArea" DECIMAL(18,4) DEFAULT 0,
    "standardFloorArea" DECIMAL(18,4) DEFAULT 0,
    "aboveGroundArea" DECIMAL(18,4) DEFAULT 0,
    "undergroundArea" DECIMAL(18,4) DEFAULT 0,
    "totalBuildingArea" DECIMAL(18,4) DEFAULT 0,
    "capacityArea" DECIMAL(18,4) DEFAULT 0,
    "saleableArea" DECIMAL(18,4) DEFAULT 0,
    "nonSaleableArea" DECIMAL(18,4) DEFAULT 0,
    "publicArea" DECIMAL(18,4) DEFAULT 0,
    "roofArea" DECIMAL(18,4) DEFAULT 0,
    "facadeArea" DECIMAL(18,4) DEFAULT 0,
    "windowArea" DECIMAL(18,4) DEFAULT 0,
    "railingLength" DECIMAL(18,4) DEFAULT 0,

    "mainBuildingUndergroundArea" DECIMAL(18,4) DEFAULT 0,
    "undergroundNonParkingArea" DECIMAL(18,4) DEFAULT 0,
    "undergroundLobbyArea" DECIMAL(18,4) DEFAULT 0,
    "undergroundEquipmentRoomArea" DECIMAL(18,4) DEFAULT 0,
    "civilDefenseArea" DECIMAL(18,4) DEFAULT 0,
    "nonCivilDefenseArea" DECIMAL(18,4) DEFAULT 0,

    "firstFloorLobbyArea" DECIMAL(18,4) DEFAULT 0,
    "elevatedFloorArea" DECIMAL(18,4) DEFAULT 0,
    "propertyManagementArea" DECIMAL(18,4) DEFAULT 0,
    "communityServiceArea" DECIMAL(18,4) DEFAULT 0,
    "commercialPodiumArea" DECIMAL(18,4) DEFAULT 0,

    "structureType" TEXT,
    "isPrefabricated" BOOLEAN DEFAULT FALSE,
    "prefabricationRate" DECIMAL(8,4) DEFAULT 0,
    "fitoutDelivery" BOOLEAN DEFAULT FALSE,
    "fitoutStandard" TEXT,
    "facadeStandard" TEXT,
    "basementQualityStandard" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
    FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE,
    FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL,
    UNIQUE ("projectId", "projectVersionId", "buildingCode")
  )`,
  `CREATE INDEX IF NOT EXISTS "ProjectBuilding_projectId_idx" ON "ProjectBuilding" ("projectId")`,
  `CREATE INDEX IF NOT EXISTS "ProjectBuilding_projectVersionId_idx" ON "ProjectBuilding" ("projectVersionId")`,
  `CREATE INDEX IF NOT EXISTS "ProjectBuilding_productTypeId_idx" ON "ProjectBuilding" ("productTypeId")`,
  `CREATE INDEX IF NOT EXISTS "ProjectBuilding_enabled_idx" ON "ProjectBuilding" ("enabled")`,
  `CREATE INDEX IF NOT EXISTS "ProjectBuilding_buildingType_idx" ON "ProjectBuilding" ("buildingType")`
];

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  console.log('Ensured ProjectBuilding table and indexes.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
