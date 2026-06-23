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
  await safeExecute('create ProjectRuleSnapshot', `
    CREATE TABLE IF NOT EXISTS "ProjectRuleSnapshot" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "sourceTemplateCode" TEXT NOT NULL,
      "sourceTemplateName" TEXT NOT NULL,
      "sourceTemplateVersion" TEXT NOT NULL,
      "snapshotName" TEXT NOT NULL DEFAULT '项目规则快照',
      "snapshotStatus" TEXT NOT NULL DEFAULT 'active',
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectRuleSnapshot_project_template_unique" UNIQUE ("projectId", "sourceTemplateCode")
    )
  `);

  await safeExecute('create ProjectRuleSubjectSnapshot', `
    CREATE TABLE IF NOT EXISTS "ProjectRuleSubjectSnapshot" (
      "id" TEXT PRIMARY KEY,
      "snapshotId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "sourceTemplateCode" TEXT NOT NULL,
      "sourceSubjectCode" TEXT NOT NULL,
      "ruleType" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "parentCode" TEXT,
      "level" INTEGER NOT NULL DEFAULT 1,
      "subjectPath" TEXT,
      "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "isDefaultEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "participateCost" BOOLEAN NOT NULL DEFAULT FALSE,
      "participateRevenue" BOOLEAN NOT NULL DEFAULT FALSE,
      "participateTax" BOOLEAN NOT NULL DEFAULT FALSE,
      "participateFinance" BOOLEAN NOT NULL DEFAULT FALSE,
      "showInSummary" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowProjectOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowVersionOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectRuleSubjectSnapshot_unique" UNIQUE ("snapshotId", "subjectCode")
    )
  `);

  await safeExecute('create ProjectUnifiedRuleSnapshot', `
    CREATE TABLE IF NOT EXISTS "ProjectUnifiedRuleSnapshot" (
      "id" TEXT PRIMARY KEY,
      "snapshotId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "sourceTemplateCode" TEXT NOT NULL,
      "sourceRuleId" TEXT NOT NULL,
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
      "allowProjectOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowVersionOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "participateSettlementFeedback" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectUnifiedRuleSnapshot_unique" UNIQUE ("snapshotId", "ruleType", "subjectCode", "applicableStage", "precisionLevel")
    )
  `);

  await safeExecute('create project snapshots from residential template', `
    INSERT INTO "ProjectRuleSnapshot" (
      "id", "projectId", "sourceTemplateCode", "sourceTemplateName", "sourceTemplateVersion", "snapshotName", "snapshotStatus", "isActive"
    )
    SELECT
      'snapshot-' || p."id" || '-residential-v1',
      p."id",
      rt."code",
      rt."name",
      rt."version",
      '住宅开发模板项目规则快照',
      'active',
      TRUE
    FROM "Project" p
    CROSS JOIN "RuleTemplate" rt
    WHERE rt."code" = 'residential-v1'
    ON CONFLICT ("projectId", "sourceTemplateCode") DO NOTHING
  `);

  await safeExecute('copy template subjects into project snapshots', `
    INSERT INTO "ProjectRuleSubjectSnapshot" (
      "id", "snapshotId", "projectId", "sourceTemplateCode", "sourceSubjectCode", "ruleType", "subjectCode", "subjectName",
      "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled", "participateCost", "participateRevenue",
      "participateTax", "participateFinance", "showInSummary", "allowProjectOverride", "allowVersionOverride", "sortOrder"
    )
    SELECT
      prs."id" || '-subject-' || trs."subjectCode",
      prs."id",
      prs."projectId",
      prs."sourceTemplateCode",
      trs."subjectCode",
      trs."ruleType",
      trs."subjectCode",
      trs."subjectName",
      trs."parentCode",
      trs."level",
      trs."subjectPath",
      trs."isEnabled",
      trs."isDefaultEnabled",
      trs."participateCost",
      trs."participateRevenue",
      trs."participateTax",
      trs."participateFinance",
      trs."showInSummary",
      trs."allowProjectOverride",
      trs."allowVersionOverride",
      trs."sortOrder"
    FROM "ProjectRuleSnapshot" prs
    JOIN "TemplateRuleSubject" trs ON trs."templateCode" = prs."sourceTemplateCode"
    WHERE prs."sourceTemplateCode" = 'residential-v1'
    ON CONFLICT ("snapshotId", "subjectCode") DO NOTHING
  `);

  await safeExecute('copy template rules into project snapshots', `
    INSERT INTO "ProjectUnifiedRuleSnapshot" (
      "id", "snapshotId", "projectId", "sourceTemplateCode", "sourceRuleId", "ruleType", "subjectCode", "subjectName",
      "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit",
      "unitPriceSource", "defaultUnitPrice", "defaultCoefficient", "amountFormula", "costAttributionMethod", "allocationMethod",
      "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled",
      "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
    )
    SELECT
      prs."id" || '-rule-' || tur."ruleType" || '-' || tur."subjectCode" || '-' || tur."applicableStage" || '-' || tur."precisionLevel",
      prs."id",
      prs."projectId",
      prs."sourceTemplateCode",
      tur."id",
      tur."ruleType",
      tur."subjectCode",
      tur."subjectName",
      tur."applicableStage",
      tur."precisionLevel",
      tur."dataSourceTable",
      tur."requiredFields",
      tur."measureBasis",
      tur."quantityFormula",
      tur."pricingUnit",
      tur."unitPriceSource",
      tur."defaultUnitPrice",
      tur."defaultCoefficient",
      tur."amountFormula",
      tur."costAttributionMethod",
      tur."allocationMethod",
      tur."revenueAttributionMethod",
      tur."vatTreatment",
      tur."landVatTreatment",
      tur."incomeTaxTreatment",
      tur."financeTreatment",
      tur."isEnabled",
      tur."allowProjectOverride",
      tur."allowVersionOverride",
      tur."participateSettlementFeedback",
      tur."sortOrder"
    FROM "ProjectRuleSnapshot" prs
    JOIN "TemplateUnifiedRule" tur ON tur."templateCode" = prs."sourceTemplateCode"
    WHERE prs."sourceTemplateCode" = 'residential-v1'
    ON CONFLICT ("snapshotId", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO NOTHING
  `);

  console.log('Project rule snapshots ensured.');
}

main().finally(async () => prisma.$disconnect());
