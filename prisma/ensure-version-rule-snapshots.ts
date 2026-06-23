import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeExecute(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  await safeExecute('create VersionRuleSnapshot', `
    CREATE TABLE IF NOT EXISTS "VersionRuleSnapshot" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "sourceProjectSnapshotId" TEXT NOT NULL,
      "sourceTemplateCode" TEXT NOT NULL,
      "snapshotName" TEXT NOT NULL DEFAULT '版本规则快照',
      "snapshotStatus" TEXT NOT NULL DEFAULT 'active',
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VersionRuleSnapshot_version_unique" UNIQUE ("versionId")
    )
  `);

  await safeExecute('create VersionRuleSubjectSnapshot', `
    CREATE TABLE IF NOT EXISTS "VersionRuleSubjectSnapshot" (
      "id" TEXT PRIMARY KEY,
      "snapshotId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "sourceProjectSubjectId" TEXT NOT NULL,
      "ruleType" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "parentCode" TEXT,
      "level" INTEGER NOT NULL DEFAULT 1,
      "subjectPath" TEXT,
      "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "showInSummary" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowVersionOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VersionRuleSubjectSnapshot_unique" UNIQUE ("snapshotId", "subjectCode")
    )
  `);

  await safeExecute('create VersionUnifiedRuleSnapshot', `
    CREATE TABLE IF NOT EXISTS "VersionUnifiedRuleSnapshot" (
      "id" TEXT PRIMARY KEY,
      "snapshotId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "sourceProjectRuleId" TEXT NOT NULL,
      "ruleType" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "applicableStage" TEXT NOT NULL,
      "precisionLevel" TEXT NOT NULL,
      "dataSourceTable" TEXT,
      "requiredFields" TEXT,
      "measureBasis" TEXT,
      "quantityFormula" TEXT,
      "pricingUnit" TEXT,
      "unitPriceSource" TEXT,
      "defaultUnitPrice" DECIMAL(18,2),
      "defaultCoefficient" DECIMAL(18,4),
      "amountFormula" TEXT,
      "costAttributionMethod" TEXT,
      "allocationMethod" TEXT,
      "revenueAttributionMethod" TEXT,
      "vatTreatment" TEXT,
      "landVatTreatment" TEXT,
      "incomeTaxTreatment" TEXT,
      "financeTreatment" TEXT,
      "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowVersionOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "participateSettlementFeedback" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VersionUnifiedRuleSnapshot_unique" UNIQUE ("snapshotId", "ruleType", "subjectCode", "applicableStage", "precisionLevel")
    )
  `);

  await safeExecute('create version snapshots from project snapshots', `
    INSERT INTO "VersionRuleSnapshot" (
      "id", "projectId", "versionId", "sourceProjectSnapshotId", "sourceTemplateCode", "snapshotName", "snapshotStatus", "isActive"
    )
    SELECT
      'version-snapshot-' || pv."id",
      pv."projectId",
      pv."id",
      prs."id",
      prs."sourceTemplateCode",
      pv."name" || ' · 版本规则快照',
      'active',
      TRUE
    FROM "ProjectVersion" pv
    JOIN "ProjectRuleSnapshot" prs ON prs."projectId" = pv."projectId" AND prs."isActive" = TRUE
    ON CONFLICT ("versionId") DO NOTHING
  `);

  await safeExecute('copy project subject snapshots into versions', `
    INSERT INTO "VersionRuleSubjectSnapshot" (
      "id", "snapshotId", "projectId", "versionId", "sourceProjectSubjectId", "ruleType", "subjectCode", "subjectName",
      "parentCode", "level", "subjectPath", "isEnabled", "showInSummary", "allowVersionOverride", "sortOrder"
    )
    SELECT
      vrs."id" || '-subject-' || prss."subjectCode",
      vrs."id",
      vrs."projectId",
      vrs."versionId",
      prss."id",
      prss."ruleType",
      prss."subjectCode",
      prss."subjectName",
      prss."parentCode",
      prss."level",
      prss."subjectPath",
      prss."isEnabled",
      prss."showInSummary",
      prss."allowVersionOverride",
      prss."sortOrder"
    FROM "VersionRuleSnapshot" vrs
    JOIN "ProjectRuleSubjectSnapshot" prss ON prss."snapshotId" = vrs."sourceProjectSnapshotId"
    ON CONFLICT ("snapshotId", "subjectCode") DO NOTHING
  `);

  await safeExecute('copy project rule snapshots into versions', `
    INSERT INTO "VersionUnifiedRuleSnapshot" (
      "id", "snapshotId", "projectId", "versionId", "sourceProjectRuleId", "ruleType", "subjectCode", "subjectName",
      "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit",
      "unitPriceSource", "defaultUnitPrice", "defaultCoefficient", "amountFormula", "costAttributionMethod", "allocationMethod",
      "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled",
      "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
    )
    SELECT
      vrs."id" || '-rule-' || purs."ruleType" || '-' || purs."subjectCode" || '-' || purs."applicableStage" || '-' || purs."precisionLevel",
      vrs."id",
      vrs."projectId",
      vrs."versionId",
      purs."id",
      purs."ruleType",
      purs."subjectCode",
      purs."subjectName",
      purs."applicableStage",
      purs."precisionLevel",
      purs."dataSourceTable",
      purs."requiredFields",
      purs."measureBasis",
      purs."quantityFormula",
      purs."pricingUnit",
      purs."unitPriceSource",
      purs."defaultUnitPrice",
      purs."defaultCoefficient",
      purs."amountFormula",
      purs."costAttributionMethod",
      purs."allocationMethod",
      purs."revenueAttributionMethod",
      purs."vatTreatment",
      purs."landVatTreatment",
      purs."incomeTaxTreatment",
      purs."financeTreatment",
      purs."isEnabled",
      purs."allowVersionOverride",
      purs."participateSettlementFeedback",
      purs."sortOrder"
    FROM "VersionRuleSnapshot" vrs
    JOIN "ProjectUnifiedRuleSnapshot" purs ON purs."snapshotId" = vrs."sourceProjectSnapshotId"
    ON CONFLICT ("snapshotId", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO NOTHING
  `);

  console.log('Version rule snapshots ensured.');
}

main().finally(async () => prisma.$disconnect());
