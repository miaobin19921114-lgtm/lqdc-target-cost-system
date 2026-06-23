import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const residentialTopSubjects = [
  ['COST', '01', '土地费', 1, 10],
  ['COST', '02', '前期工程费', 1, 20],
  ['COST', '03', '建安工程费', 1, 30],
  ['COST', '04', '室外景观及配套', 1, 40],
  ['COST', '05', '设备工程', 1, 50],
  ['COST', '06', '精装修工程', 1, 60],
  ['COST', '07', '咨询顾问费', 1, 70],
  ['COST', '08', '开发间接费', 1, 80],
  ['COST', '09', '营销费用', 1, 90],
  ['COST', '10', '财务费用', 1, 100],
  ['COST', '11', '预备费', 1, 110],
  ['TAX', '12', '税金', 1, 120],
  ['REVENUE', 'R01', '住宅销售收入', 1, 1000],
  ['REVENUE', 'R02', '商业销售收入', 1, 1010],
  ['REVENUE', 'R03', '车位销售收入', 1, 1020],
  ['REVENUE', 'R04', '其他收入', 1, 1030],
  ['FINANCE', 'F01', '融资成本', 1, 2000],
  ['FINANCE', 'F02', '资本化利息', 1, 2010],
  ['FINANCE', 'F03', '费用化利息', 1, 2020],
  ['FINANCE', 'F04', '现金流指标', 1, 2030],
  ['FINANCE', 'F05', 'IRR', 1, 2040],
] as const;

async function safeExecute(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  await safeExecute('create RuleTemplate', `
    CREATE TABLE IF NOT EXISTS "RuleTemplate" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "developmentType" TEXT NOT NULL DEFAULT '住宅开发',
      "region" TEXT,
      "version" TEXT NOT NULL DEFAULT 'V1',
      "description" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeExecute('create TemplateRuleSubject', `
    CREATE TABLE IF NOT EXISTS "TemplateRuleSubject" (
      "id" TEXT PRIMARY KEY,
      "templateCode" TEXT NOT NULL,
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
      "remark" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TemplateRuleSubject_templateCode_subjectCode_key" UNIQUE ("templateCode", "subjectCode")
    )
  `);

  await safeExecute('create TemplateUnifiedRule', `
    CREATE TABLE IF NOT EXISTS "TemplateUnifiedRule" (
      "id" TEXT PRIMARY KEY,
      "templateCode" TEXT NOT NULL,
      "ruleType" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "applicableStage" TEXT NOT NULL DEFAULT '目标成本',
      "precisionLevel" TEXT NOT NULL DEFAULT 'L3 目标测算',
      "applicableProductType" TEXT,
      "dataSourceTable" TEXT,
      "requiredFields" TEXT,
      "measureBasis" TEXT,
      "quantityFormula" TEXT,
      "pricingUnit" TEXT,
      "unitPriceSource" TEXT,
      "amountFormula" TEXT,
      "defaultCoefficient" NUMERIC(18,6) NOT NULL DEFAULT 1,
      "costAttributionMethod" TEXT,
      "revenueAttributionMethod" TEXT,
      "allocationMethod" TEXT,
      "vatTreatment" TEXT,
      "landVatTreatment" TEXT,
      "incomeTaxTreatment" TEXT,
      "financeTreatment" TEXT,
      "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowProjectOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowVersionOverride" BOOLEAN NOT NULL DEFAULT TRUE,
      "participateSettlementFeedback" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "remark" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TemplateUnifiedRule_unique" UNIQUE ("templateCode", "ruleType", "subjectCode", "applicableStage", "precisionLevel")
    )
  `);

  await safeExecute('seed residential rule template', `
    INSERT INTO "RuleTemplate" ("id", "code", "name", "developmentType", "region", "version", "description", "isDefault", "isActive")
    VALUES ('residential-v1', 'residential-v1', '住宅开发模板', '住宅开发', '通用', 'V1', '住宅开发默认规则模板：全量预设科目，项目按需启用；前期也采用参数化和工程量化高精度测算。', TRUE, TRUE)
    ON CONFLICT ("code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "developmentType" = EXCLUDED."developmentType",
      "region" = EXCLUDED."region",
      "version" = EXCLUDED."version",
      "description" = EXCLUDED."description",
      "isDefault" = TRUE,
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
  `);

  for (const [ruleType, code, name, level, sortOrder] of residentialTopSubjects) {
    const participateCost = ruleType === 'COST';
    const participateRevenue = ruleType === 'REVENUE';
    const participateTax = ruleType === 'TAX';
    const participateFinance = ruleType === 'FINANCE';
    await safeExecute(`seed top subject ${code} ${name}`, `
      INSERT INTO "TemplateRuleSubject" (
        "id", "templateCode", "ruleType", "subjectCode", "subjectName", "level", "subjectPath",
        "isEnabled", "isDefaultEnabled", "participateCost", "participateRevenue", "participateTax", "participateFinance", "showInSummary", "sortOrder"
      ) VALUES (
        'residential-v1-${code}', 'residential-v1', '${ruleType}', '${code}', '${name}', ${level}, '${name}',
        TRUE, TRUE, ${participateCost}, ${participateRevenue}, ${participateTax}, ${participateFinance}, TRUE, ${sortOrder}
      )
      ON CONFLICT ("templateCode", "subjectCode") DO UPDATE SET
        "ruleType" = EXCLUDED."ruleType",
        "subjectName" = EXCLUDED."subjectName",
        "level" = EXCLUDED."level",
        "subjectPath" = EXCLUDED."subjectPath",
        "participateCost" = EXCLUDED."participateCost",
        "participateRevenue" = EXCLUDED."participateRevenue",
        "participateTax" = EXCLUDED."participateTax",
        "participateFinance" = EXCLUDED."participateFinance",
        "sortOrder" = EXCLUDED."sortOrder",
        "updatedAt" = CURRENT_TIMESTAMP
    `);
  }

  await safeExecute('copy existing CostSubject leaves into residential template', `
    INSERT INTO "TemplateRuleSubject" (
      "id", "templateCode", "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath",
      "isEnabled", "isDefaultEnabled", "participateCost", "showInSummary", "sortOrder"
    )
    SELECT
      'residential-v1-cost-' || cs."code",
      'residential-v1',
      'COST',
      cs."code",
      CASE WHEN cs."name" = '土地成本' AND cs."code" = '01' THEN '土地费' ELSE cs."name" END,
      cs."parentCode",
      cs."level",
      regexp_replace(COALESCE(cs."fullPath", cs."name"), '^土地成本', '土地费'),
      cs."enabled",
      cs."enabled",
      TRUE,
      TRUE,
      cs."sortOrder"
    FROM "CostSubject" cs
    ON CONFLICT ("templateCode", "subjectCode") DO UPDATE SET
      "subjectName" = EXCLUDED."subjectName",
      "parentCode" = EXCLUDED."parentCode",
      "level" = EXCLUDED."level",
      "subjectPath" = EXCLUDED."subjectPath",
      "isEnabled" = EXCLUDED."isEnabled",
      "isDefaultEnabled" = EXCLUDED."isDefaultEnabled",
      "participateCost" = TRUE,
      "showInSummary" = TRUE,
      "sortOrder" = EXCLUDED."sortOrder",
      "updatedAt" = CURRENT_TIMESTAMP
  `);

  await safeExecute('seed template rules from template subjects', `
    INSERT INTO "TemplateUnifiedRule" (
      "id", "templateCode", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel",
      "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula",
      "costAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "sortOrder"
    )
    SELECT
      'rule-' || trs."templateCode" || '-' || trs."ruleType" || '-' || trs."subjectCode" || '-L3',
      trs."templateCode",
      trs."ruleType",
      trs."subjectCode",
      trs."subjectName",
      '目标成本',
      'L3 目标测算',
      CASE
        WHEN trs."ruleType" = 'REVENUE' THEN '收入明细表'
        WHEN trs."ruleType" = 'TAX' THEN '税费参数表'
        WHEN trs."ruleType" = 'FINANCE' THEN '财务测算表'
        ELSE '项目概况表/业态产品表/工程量指标表'
      END,
      CASE
        WHEN trs."ruleType" = 'REVENUE' THEN '业态面积,销售单价,去化计划,税率'
        WHEN trs."ruleType" = 'TAX' THEN '收入,成本,可扣除项目,税率,清算对象'
        WHEN trs."ruleType" = 'FINANCE' THEN '融资金额,利率,周期,现金流'
        ELSE '项目概况,业态产品,工程量指标,配置档次,单价库'
      END,
      CASE
        WHEN trs."ruleType" = 'COST' THEN '参数化工程量规则'
        WHEN trs."ruleType" = 'REVENUE' THEN '收入明细规则'
        WHEN trs."ruleType" = 'TAX' THEN '税费计算规则'
        ELSE '财务评价规则'
      END,
      NULL,
      CASE WHEN trs."ruleType" = 'TAX' THEN '%' ELSE NULL END,
      '模板默认指标库/地区单价库',
      '按规则公式计算，允许项目级修正',
      CASE WHEN trs."ruleType" = 'COST' THEN '按受益对象归属' ELSE NULL END,
      CASE WHEN trs."ruleType" = 'COST' THEN '直接归属优先，不能直接归属则按建筑面积/可售面积分摊' ELSE NULL END,
      '按一般计税口径处理，含税价拆分不含税及税额',
      CASE WHEN trs."ruleType" IN ('COST', 'TAX') THEN '按土增税扣除类别及清算对象处理' ELSE NULL END,
      CASE WHEN trs."ruleType" IN ('COST', 'TAX') THEN '按企业所得税成本对象及税前扣除口径处理' ELSE NULL END,
      CASE WHEN trs."ruleType" = 'FINANCE' THEN '区分资本化利息、费用化利息及现金流口径' ELSE NULL END,
      trs."sortOrder"
    FROM "TemplateRuleSubject" trs
    WHERE trs."templateCode" = 'residential-v1'
    ON CONFLICT ("templateCode", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO UPDATE SET
      "subjectName" = EXCLUDED."subjectName",
      "dataSourceTable" = EXCLUDED."dataSourceTable",
      "requiredFields" = EXCLUDED."requiredFields",
      "measureBasis" = EXCLUDED."measureBasis",
      "unitPriceSource" = EXCLUDED."unitPriceSource",
      "amountFormula" = EXCLUDED."amountFormula",
      "costAttributionMethod" = EXCLUDED."costAttributionMethod",
      "allocationMethod" = EXCLUDED."allocationMethod",
      "vatTreatment" = EXCLUDED."vatTreatment",
      "landVatTreatment" = EXCLUDED."landVatTreatment",
      "incomeTaxTreatment" = EXCLUDED."incomeTaxTreatment",
      "financeTreatment" = EXCLUDED."financeTreatment",
      "sortOrder" = EXCLUDED."sortOrder",
      "updatedAt" = CURRENT_TIMESTAMP
  `);

  console.log('Rule template center ensured: residential-v1');
}

main().finally(async () => prisma.$disconnect());
