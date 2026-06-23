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
  await safeExecute('add RuleTemplate governance columns', `
    ALTER TABLE "RuleTemplate"
    ADD COLUMN IF NOT EXISTS "publishStatus" TEXT NOT NULL DEFAULT 'published',
    ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "publishedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "lockedBy" TEXT
  `);

  await safeExecute('add VersionRuleSnapshot governance columns', `
    ALTER TABLE "VersionRuleSnapshot"
    ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "lockReason" TEXT
  `);

  await safeExecute('add governance remark columns', `
    ALTER TABLE "VersionUnifiedRuleSnapshot"
    ADD COLUMN IF NOT EXISTS "editRemark" TEXT
  `);

  await safeExecute('create RuleChangeLog', `
    CREATE TABLE IF NOT EXISTS "RuleChangeLog" (
      "id" TEXT PRIMARY KEY,
      "scopeType" TEXT NOT NULL,
      "scopeId" TEXT NOT NULL,
      "projectId" TEXT,
      "versionId" TEXT,
      "templateCode" TEXT,
      "ruleType" TEXT,
      "subjectCode" TEXT,
      "changeType" TEXT NOT NULL,
      "fieldName" TEXT,
      "beforeValue" TEXT,
      "afterValue" TEXT,
      "operator" TEXT NOT NULL DEFAULT 'system',
      "remark" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeExecute('create TemplateApplicabilityScope', `
    CREATE TABLE IF NOT EXISTS "TemplateApplicabilityScope" (
      "id" TEXT PRIMARY KEY,
      "templateCode" TEXT NOT NULL,
      "developmentType" TEXT NOT NULL,
      "region" TEXT,
      "productTypes" TEXT,
      "measurementStages" TEXT,
      "precisionLevels" TEXT,
      "requiredFieldGroups" TEXT,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TemplateApplicabilityScope_unique" UNIQUE ("templateCode", "developmentType", "region")
    )
  `);

  await safeExecute('create RuleValidationResult', `
    CREATE TABLE IF NOT EXISTS "RuleValidationResult" (
      "id" TEXT PRIMARY KEY,
      "scopeType" TEXT NOT NULL,
      "scopeId" TEXT NOT NULL,
      "projectId" TEXT,
      "versionId" TEXT,
      "templateCode" TEXT,
      "ruleId" TEXT,
      "ruleType" TEXT,
      "subjectCode" TEXT,
      "checkName" TEXT NOT NULL,
      "severity" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "isResolved" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeExecute('seed residential applicability scope', `
    INSERT INTO "TemplateApplicabilityScope" (
      "id", "templateCode", "developmentType", "region", "productTypes", "measurementStages", "precisionLevels", "requiredFieldGroups", "description", "isActive"
    ) VALUES (
      'scope-residential-v1-general',
      'residential-v1',
      '住宅开发',
      '通用',
      '高层住宅,小高层住宅,洋房,底商,地下车位,配套用房',
      '投前快测,方案估算,目标成本,动态控制,结算复盘',
      'L1 快速估算,L2 方案估算,L3 目标测算,L4 动态控制,L5 结算复盘',
      '基础输入字段,收入测算字段,税费测算字段,财务评价字段,动态成本/结算字段',
      '住宅开发默认适用范围，可作为新住宅项目模板母版。',
      TRUE
    )
    ON CONFLICT ("templateCode", "developmentType", "region") DO UPDATE SET
      "productTypes" = EXCLUDED."productTypes",
      "measurementStages" = EXCLUDED."measurementStages",
      "precisionLevels" = EXCLUDED."precisionLevels",
      "requiredFieldGroups" = EXCLUDED."requiredFieldGroups",
      "description" = EXCLUDED."description",
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
  `);

  await safeExecute('normalize existing template publish status', `
    UPDATE "RuleTemplate"
    SET "publishStatus" = CASE WHEN "isActive" = TRUE THEN 'published' ELSE 'disabled' END,
        "publishedAt" = COALESCE("publishedAt", "updatedAt")
    WHERE "publishStatus" IS NULL OR "publishStatus" = ''
  `);

  console.log('Rule governance ensured.');
}

main().finally(async () => prisma.$disconnect());
