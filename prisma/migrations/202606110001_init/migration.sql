CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE "VersionStatus" AS ENUM ('draft', 'locked', 'final');

CREATE TABLE "User" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"role" "UserRole" NOT NULL DEFAULT 'admin',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Project" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"city" TEXT,"district" TEXT,"landArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"plotRatio" DECIMAL(65,30) NOT NULL DEFAULT 0,"totalBuildingArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"capacityBuildingArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"aboveGroundArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"undergroundArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"saleableArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"nonSaleableArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"parkingCount" INTEGER NOT NULL DEFAULT 0,"remark" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Project_pkey" PRIMARY KEY ("id"));

CREATE TABLE "ProjectVersion" ("id" TEXT NOT NULL,"projectId" TEXT NOT NULL,"name" TEXT NOT NULL,"status" "VersionStatus" NOT NULL DEFAULT 'draft',"isLocked" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id"));

CREATE TABLE "ProductType" ("id" TEXT NOT NULL,"projectVersionId" TEXT NOT NULL,"name" TEXT NOT NULL,"buildingArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"saleableArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"capacityArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"nonSaleableArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,"isSaleable" BOOLEAN NOT NULL DEFAULT true,"participateAllocation" BOOLEAN NOT NULL DEFAULT true,"allocationWeight" DECIMAL(65,30) NOT NULL DEFAULT 1,"remark" TEXT,CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id"));

CREATE TABLE "CostSubject" ("id" TEXT NOT NULL,"code" TEXT NOT NULL,"name" TEXT NOT NULL,"level" INTEGER NOT NULL,"parentId" TEXT,"fullPath" TEXT,"defaultUnit" TEXT,"defaultTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,"defaultMeasureBasis" TEXT,"defaultAllocationMethod" TEXT,"sortOrder" INTEGER NOT NULL DEFAULT 0,"enabled" BOOLEAN NOT NULL DEFAULT true,CONSTRAINT "CostSubject_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CostSubject_code_key" ON "CostSubject"("code");

CREATE TABLE "CostLine" ("id" TEXT NOT NULL,"projectVersionId" TEXT NOT NULL,"costSubjectId" TEXT NOT NULL,"productTypeId" TEXT,"detailName" TEXT NOT NULL,"regionOrProductType" TEXT,"professionalGroup" TEXT,"measureBasis" TEXT,"quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,"unit" TEXT,"taxExclusiveUnitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxInclusiveUnitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,"taxExclusiveAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxInclusiveAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,"allocationMethod" TEXT,"isDirectAssigned" BOOLEAN NOT NULL DEFAULT false,"description" TEXT,"remark" TEXT,"sortOrder" INTEGER NOT NULL DEFAULT 0,CONSTRAINT "CostLine_pkey" PRIMARY KEY ("id"));

CREATE TABLE "RevenueLine" ("id" TEXT NOT NULL,"projectVersionId" TEXT NOT NULL,"productTypeId" TEXT NOT NULL,"saleableArea" DECIMAL(65,30) NOT NULL DEFAULT 0,"salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,"taxInclusiveRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxExclusiveRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,"taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,"remark" TEXT,CONSTRAINT "RevenueLine_pkey" PRIMARY KEY ("id"));

CREATE TABLE "TaxParameter" ("id" TEXT NOT NULL,"projectVersionId" TEXT NOT NULL,"vatRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,"urbanMaintenanceRate" DECIMAL(65,30) NOT NULL DEFAULT 0.07,"educationSurchargeRate" DECIMAL(65,30) NOT NULL DEFAULT 0.03,"localEducationSurchargeRate" DECIMAL(65,30) NOT NULL DEFAULT 0.02,"corporateIncomeTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.25,"landValueAddedTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,"remark" TEXT,CONSTRAINT "TaxParameter_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TaxParameter_projectVersionId_key" ON "TaxParameter"("projectVersionId");

ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostSubject" ADD CONSTRAINT "CostSubject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CostSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_costSubjectId_fkey" FOREIGN KEY ("costSubjectId") REFERENCES "CostSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RevenueLine" ADD CONSTRAINT "RevenueLine_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueLine" ADD CONSTRAINT "RevenueLine_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxParameter" ADD CONSTRAINT "TaxParameter_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
