-- Additive catch-up migration for local databases whose applied migration history
-- is marked current but whose physical schema is missing later schema objects.
-- This migration intentionally does not drop tables or columns.

-- Existing tables: add columns now required by prisma/schema.prisma.
ALTER TABLE "CostDictionaryRow"
ADD COLUMN IF NOT EXISTS "name" TEXT;

ALTER TABLE "CostLine"
ADD COLUMN IF NOT EXISTS "coefficient" DECIMAL(65,30) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "importBatchId" TEXT,
ADD COLUMN IF NOT EXISTS "measureValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "quantityOverride" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CostSubject"
ADD COLUMN IF NOT EXISTS "parentCode" TEXT;

ALTER TABLE "ProductType"
ADD COLUMN IF NOT EXISTS "aboveGroundArea" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "baseArea" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "buildingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "category" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "householdCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "parkingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "productTypeKey" TEXT,
ADD COLUMN IF NOT EXISTS "undergroundArea" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unitCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "basementQualityStandard" TEXT NOT NULL DEFAULT '基础美化',
ADD COLUMN IF NOT EXISTS "basementQualityUpgrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "commercialPublicFitout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "commercialPublicFitoutStandard" TEXT NOT NULL DEFAULT '标准',
ADD COLUMN IF NOT EXISTS "communityFitout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "hasSalesOffice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "hasShowFlat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "heatingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "heatingScope" TEXT,
ADD COLUMN IF NOT EXISTS "heatingType" TEXT,
ADD COLUMN IF NOT EXISTS "isPrefabricated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "prefabricatedScope" TEXT,
ADD COLUMN IF NOT EXISTS "prefabricatedSystem" TEXT,
ADD COLUMN IF NOT EXISTS "prefabricationRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "propertyFitout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "residentialFitoutDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "residentialFitoutStandard" TEXT NOT NULL DEFAULT '毛坯',
ADD COLUMN IF NOT EXISTS "residentialFitoutType" TEXT NOT NULL DEFAULT '硬装',
ADD COLUMN IF NOT EXISTS "residentialPublicFitoutStandard" TEXT NOT NULL DEFAULT '标准',
ADD COLUMN IF NOT EXISTS "salesOfficeFitoutType" TEXT NOT NULL DEFAULT '硬装+软装',
ADD COLUMN IF NOT EXISTS "shopDeliveryStandard" TEXT NOT NULL DEFAULT '毛坯',
ADD COLUMN IF NOT EXISTS "showFlatFitoutType" TEXT NOT NULL DEFAULT '全部',
ADD COLUMN IF NOT EXISTS "supportFitout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "undergroundLobbyFitoutStandard" TEXT NOT NULL DEFAULT '标准';

ALTER TABLE "Project"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ProjectVersion"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "stage" DROP NOT NULL,
ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "TaxParameter"
ADD COLUMN IF NOT EXISTS "costAdditionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.20,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "deemedSalesRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "incomeTaxMode" TEXT NOT NULL DEFAULT '项目口径测算',
ADD COLUMN IF NOT EXISTS "incomeTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS "landDeductibleAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "landVatClearanceMode" TEXT NOT NULL DEFAULT '预缴+清算测算',
ADD COLUMN IF NOT EXISTS "landVatPrepayRate" DECIMAL(65,30) NOT NULL DEFAULT 0.02,
ADD COLUMN IF NOT EXISTS "nonDeductibleInputTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "urbanMaintenanceTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS "vatMethod" TEXT NOT NULL DEFAULT '一般计税';

ALTER TABLE "User"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Tables added after the original local database was created.
CREATE TABLE IF NOT EXISTS "ProductTypePreset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isSaleable" BOOLEAN NOT NULL DEFAULT true,
    "participateAllocation" BOOLEAN NOT NULL DEFAULT true,
    "defaultVatRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,
    "defaultAllocationMethod" TEXT NOT NULL DEFAULT '按建筑面积占比',
    "defaultIncomeType" TEXT NOT NULL DEFAULT '销售收入',
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductTypePreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectMetricDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "metricGroup" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'project',
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMetricDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectMetricValue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectVersionId" TEXT,
    "productTypeId" TEXT,
    "metricKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'project',
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "confidence" DECIMAL(65,30),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMetricValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImportBatch" (
    "id" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importType" TEXT NOT NULL DEFAULT 'cost',
    "importMode" TEXT NOT NULL DEFAULT 'update',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "taxInclusiveTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxExclusiveTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmountTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommercialRevenueLine" (
    "id" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "parentProductTypeId" TEXT NOT NULL,
    "subType" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT '出售',
    "area" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyRent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "occupancyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "years" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,
    "taxInclusiveRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxExclusiveRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommercialRevenueLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OtherRevenueLine" (
    "id" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "incomeType" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxInclusiveRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxExclusiveRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "certainty" TEXT,
    "cashDate" TEXT,
    "condition" TEXT,
    "policyBasis" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtherRevenueLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesSchedulePlan" (
    "id" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "periodName" TEXT NOT NULL DEFAULT '默认去化计划',
    "periodIndex" INTEGER NOT NULL DEFAULT 0,
    "months" INTEGER NOT NULL DEFAULT 12,
    "downPaymentRate" DECIMAL(65,30) NOT NULL DEFAULT 0.30,
    "mortgageRate" DECIMAL(65,30) NOT NULL DEFAULT 0.65,
    "tailRate" DECIMAL(65,30) NOT NULL DEFAULT 0.05,
    "mortgageDelay" INTEGER NOT NULL DEFAULT 2,
    "tailDelay" INTEGER NOT NULL DEFAULT 6,
    "plannedSaleableArea" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plannedRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plannedCollectionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.90,
    "actualCollectedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesSchedulePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesScheduleLine" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "sellThroughRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "contractAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "downPayment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "mortgageCollection" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tailCollection" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCollection" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cumulativeContract" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cumulativeCollection" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "receivableBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesScheduleLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MeasureBasisRule" (
    "id" TEXT NOT NULL,
    "costCode" TEXT NOT NULL,
    "basisName" TEXT NOT NULL,
    "metricKey" TEXT,
    "metricScope" TEXT NOT NULL DEFAULT 'project',
    "quantityUnit" TEXT,
    "pricingUnit" TEXT,
    "defaultCoefficient" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "quantityFormula" TEXT,
    "amountFormula" TEXT,
    "applicableProductType" TEXT,
    "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasureBasisRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MeasureBasisStageRule" (
    "id" TEXT NOT NULL,
    "costCode" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "basisRuleId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasureBasisStageRule_pkey" PRIMARY KEY ("id")
);

-- Indexes required by the current Prisma schema.
CREATE UNIQUE INDEX IF NOT EXISTS "ProductTypePreset_key_key" ON "ProductTypePreset"("key");
CREATE INDEX IF NOT EXISTS "ProductTypePreset_category_idx" ON "ProductTypePreset"("category");
CREATE INDEX IF NOT EXISTS "ProductTypePreset_enabled_idx" ON "ProductTypePreset"("enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMetricDefinition_key_key" ON "ProjectMetricDefinition"("key");
CREATE INDEX IF NOT EXISTS "ProjectMetricDefinition_scope_idx" ON "ProjectMetricDefinition"("scope");
CREATE INDEX IF NOT EXISTS "ProjectMetricDefinition_enabled_idx" ON "ProjectMetricDefinition"("enabled");
CREATE INDEX IF NOT EXISTS "ProjectMetricDefinition_metricGroup_idx" ON "ProjectMetricDefinition"("metricGroup");

CREATE INDEX IF NOT EXISTS "ProjectMetricValue_projectId_idx" ON "ProjectMetricValue"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectMetricValue_projectVersionId_idx" ON "ProjectMetricValue"("projectVersionId");
CREATE INDEX IF NOT EXISTS "ProjectMetricValue_productTypeId_idx" ON "ProjectMetricValue"("productTypeId");
CREATE INDEX IF NOT EXISTS "ProjectMetricValue_metricKey_idx" ON "ProjectMetricValue"("metricKey");
CREATE INDEX IF NOT EXISTS "ProjectMetricValue_scope_idx" ON "ProjectMetricValue"("scope");
CREATE INDEX IF NOT EXISTS "ProjectMetricValue_source_idx" ON "ProjectMetricValue"("source");

CREATE INDEX IF NOT EXISTS "ImportBatch_projectVersionId_idx" ON "ImportBatch"("projectVersionId");
CREATE INDEX IF NOT EXISTS "ImportBatch_projectVersionId_status_idx" ON "ImportBatch"("projectVersionId", "status");

CREATE INDEX IF NOT EXISTS "CommercialRevenueLine_projectVersionId_idx" ON "CommercialRevenueLine"("projectVersionId");
CREATE INDEX IF NOT EXISTS "CommercialRevenueLine_parentProductTypeId_idx" ON "CommercialRevenueLine"("parentProductTypeId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialRevenueLine_projectVersionId_parentProductTypeId__key" ON "CommercialRevenueLine"("projectVersionId", "parentProductTypeId", "subType");

CREATE INDEX IF NOT EXISTS "OtherRevenueLine_projectVersionId_idx" ON "OtherRevenueLine"("projectVersionId");
CREATE UNIQUE INDEX IF NOT EXISTS "OtherRevenueLine_projectVersionId_incomeType_key" ON "OtherRevenueLine"("projectVersionId", "incomeType");

CREATE INDEX IF NOT EXISTS "SalesSchedulePlan_projectVersionId_idx" ON "SalesSchedulePlan"("projectVersionId");
CREATE INDEX IF NOT EXISTS "SalesScheduleLine_planId_idx" ON "SalesScheduleLine"("planId");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesScheduleLine_planId_monthIndex_key" ON "SalesScheduleLine"("planId", "monthIndex");

CREATE INDEX IF NOT EXISTS "MeasureBasisRule_costCode_idx" ON "MeasureBasisRule"("costCode");
CREATE INDEX IF NOT EXISTS "MeasureBasisRule_metricKey_idx" ON "MeasureBasisRule"("metricKey");
CREATE INDEX IF NOT EXISTS "MeasureBasisRule_enabled_idx" ON "MeasureBasisRule"("enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "MeasureBasisRule_costCode_basisName_key" ON "MeasureBasisRule"("costCode", "basisName");

CREATE INDEX IF NOT EXISTS "MeasureBasisStageRule_costCode_idx" ON "MeasureBasisStageRule"("costCode");
CREATE INDEX IF NOT EXISTS "MeasureBasisStageRule_stage_idx" ON "MeasureBasisStageRule"("stage");
CREATE INDEX IF NOT EXISTS "MeasureBasisStageRule_basisRuleId_idx" ON "MeasureBasisStageRule"("basisRuleId");
CREATE INDEX IF NOT EXISTS "MeasureBasisStageRule_enabled_idx" ON "MeasureBasisStageRule"("enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "MeasureBasisStageRule_costCode_stage_basisRuleId_key" ON "MeasureBasisStageRule"("costCode", "stage", "basisRuleId");

CREATE INDEX IF NOT EXISTS "CostLine_importBatchId_idx" ON "CostLine"("importBatchId");
CREATE INDEX IF NOT EXISTS "ProductType_projectVersionId_idx" ON "ProductType"("projectVersionId");
CREATE INDEX IF NOT EXISTS "ProductType_productTypeKey_idx" ON "ProductType"("productTypeKey");
CREATE INDEX IF NOT EXISTS "ProductType_category_idx" ON "ProductType"("category");
