import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TemplateRow = {
  id: string;
  code: string;
  name: string;
  developmentType: string;
  region: string | null;
  version: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  subjectCount: number;
  ruleCount: number;
  fieldCount: number;
};

function valueOf(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

function safeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function duplicateTemplate(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const sourceCode = valueOf(formData, 'sourceCode') || 'residential-v1';
  const newCode = safeCode(valueOf(formData, 'newCode'));
  const newName = valueOf(formData, 'newName');
  const newVersion = valueOf(formData, 'newVersion') || 'V1-copy';
  const description = valueOf(formData, 'description') || `由 ${sourceCode} 复制生成`;

  if (!projectId || !newCode || !newName) redirect(projectId ? `/projects/${projectId}/template-version-management` : '/');

  await prisma.$executeRawUnsafe(`
    INSERT INTO "RuleTemplate" ("id", "code", "name", "developmentType", "region", "version", "description", "isDefault", "isActive")
    SELECT $1, $1, $2, "developmentType", "region", $3, $4, FALSE, TRUE
    FROM "RuleTemplate"
    WHERE "code" = $5
    ON CONFLICT ("code") DO NOTHING
  `, newCode, newName, newVersion, description, sourceCode);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "TemplateRuleSubject" (
      "id", "templateCode", "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled",
      "participateCost", "participateRevenue", "participateTax", "participateFinance", "showInSummary", "allowProjectOverride", "allowVersionOverride", "sortOrder", "remark"
    )
    SELECT
      $1 || '-' || "ruleType" || '-' || "subjectCode",
      $1,
      "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled",
      "participateCost", "participateRevenue", "participateTax", "participateFinance", "showInSummary", "allowProjectOverride", "allowVersionOverride", "sortOrder", "remark"
    FROM "TemplateRuleSubject"
    WHERE "templateCode" = $2
    ON CONFLICT ("templateCode", "subjectCode") DO UPDATE SET
      "ruleType" = EXCLUDED."ruleType",
      "subjectName" = EXCLUDED."subjectName",
      "parentCode" = EXCLUDED."parentCode",
      "level" = EXCLUDED."level",
      "subjectPath" = EXCLUDED."subjectPath",
      "isEnabled" = EXCLUDED."isEnabled",
      "isDefaultEnabled" = EXCLUDED."isDefaultEnabled",
      "participateCost" = EXCLUDED."participateCost",
      "participateRevenue" = EXCLUDED."participateRevenue",
      "participateTax" = EXCLUDED."participateTax",
      "participateFinance" = EXCLUDED."participateFinance",
      "showInSummary" = EXCLUDED."showInSummary",
      "allowProjectOverride" = EXCLUDED."allowProjectOverride",
      "allowVersionOverride" = EXCLUDED."allowVersionOverride",
      "sortOrder" = EXCLUDED."sortOrder",
      "remark" = EXCLUDED."remark",
      "updatedAt" = CURRENT_TIMESTAMP
  `, newCode, sourceCode);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "TemplateUnifiedRule" (
      "id", "templateCode", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "applicableProductType",
      "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "defaultCoefficient",
      "costAttributionMethod", "revenueAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment",
      "isEnabled", "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder", "remark"
    )
    SELECT
      'rule-' || $1 || '-' || "ruleType" || '-' || "subjectCode" || '-' || regexp_replace("applicableStage", '[^a-zA-Z0-9一-龥]+', '', 'g') || '-' || regexp_replace("precisionLevel", '[^a-zA-Z0-9一-龥]+', '', 'g'),
      $1,
      "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "applicableProductType",
      "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "defaultCoefficient",
      "costAttributionMethod", "revenueAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment",
      "isEnabled", "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder", "remark"
    FROM "TemplateUnifiedRule"
    WHERE "templateCode" = $2
    ON CONFLICT ("templateCode", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO UPDATE SET
      "subjectName" = EXCLUDED."subjectName",
      "applicableProductType" = EXCLUDED."applicableProductType",
      "dataSourceTable" = EXCLUDED."dataSourceTable",
      "requiredFields" = EXCLUDED."requiredFields",
      "measureBasis" = EXCLUDED."measureBasis",
      "quantityFormula" = EXCLUDED."quantityFormula",
      "pricingUnit" = EXCLUDED."pricingUnit",
      "unitPriceSource" = EXCLUDED."unitPriceSource",
      "amountFormula" = EXCLUDED."amountFormula",
      "defaultCoefficient" = EXCLUDED."defaultCoefficient",
      "costAttributionMethod" = EXCLUDED."costAttributionMethod",
      "revenueAttributionMethod" = EXCLUDED."revenueAttributionMethod",
      "allocationMethod" = EXCLUDED."allocationMethod",
      "vatTreatment" = EXCLUDED."vatTreatment",
      "landVatTreatment" = EXCLUDED."landVatTreatment",
      "incomeTaxTreatment" = EXCLUDED."incomeTaxTreatment",
      "financeTreatment" = EXCLUDED."financeTreatment",
      "isEnabled" = EXCLUDED."isEnabled",
      "allowProjectOverride" = EXCLUDED."allowProjectOverride",
      "allowVersionOverride" = EXCLUDED."allowVersionOverride",
      "participateSettlementFeedback" = EXCLUDED."participateSettlementFeedback",
      "sortOrder" = EXCLUDED."sortOrder",
      "remark" = EXCLUDED."remark",
      "updatedAt" = CURRENT_TIMESTAMP
  `, newCode, sourceCode);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "TemplateFieldDefinition" (
      "id", "templateCode", "fieldKey", "fieldName", "fieldGroup", "sourceTable", "fieldType", "unit", "isRequired", "applicableStage", "precisionLevel",
      "sourceRuleType", "sourceSubjectCodes", "sourceSubjects", "description", "sortOrder"
    )
    SELECT
      'field-' || $1 || '-' || "sourceTable" || '-' || "fieldKey",
      $1,
      "fieldKey", "fieldName", "fieldGroup", "sourceTable", "fieldType", "unit", "isRequired", "applicableStage", "precisionLevel",
      "sourceRuleType", "sourceSubjectCodes", "sourceSubjects", "description", "sortOrder"
    FROM "TemplateFieldDefinition"
    WHERE "templateCode" = $2
    ON CONFLICT ("templateCode", "sourceTable", "fieldKey") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "fieldGroup" = EXCLUDED."fieldGroup",
      "fieldType" = EXCLUDED."fieldType",
      "unit" = EXCLUDED."unit",
      "isRequired" = EXCLUDED."isRequired",
      "applicableStage" = EXCLUDED."applicableStage",
      "precisionLevel" = EXCLUDED."precisionLevel",
      "sourceRuleType" = EXCLUDED."sourceRuleType",
      "sourceSubjectCodes" = EXCLUDED."sourceSubjectCodes",
      "sourceSubjects" = EXCLUDED."sourceSubjects",
      "description" = EXCLUDED."description",
      "sortOrder" = EXCLUDED."sortOrder",
      "updatedAt" = CURRENT_TIMESTAMP
  `, newCode, sourceCode);

  revalidatePath(`/projects/${projectId}/template-version-management`);
  redirect(`/projects/${projectId}/template-version-management`);
}

async function loadTemplates() {
  try {
    return await prisma.$queryRawUnsafe<TemplateRow[]>(`
      SELECT t."id", t."code", t."name", t."developmentType", t."region", t."version", t."description", t."isDefault", t."isActive",
        COALESCE(s."subjectCount", 0)::int AS "subjectCount",
        COALESCE(r."ruleCount", 0)::int AS "ruleCount",
        COALESCE(f."fieldCount", 0)::int AS "fieldCount"
      FROM "RuleTemplate" t
      LEFT JOIN (
        SELECT "templateCode", COUNT(*) AS "subjectCount"
        FROM "TemplateRuleSubject"
        GROUP BY "templateCode"
      ) s ON s."templateCode" = t."code"
      LEFT JOIN (
        SELECT "templateCode", COUNT(*) AS "ruleCount"
        FROM "TemplateUnifiedRule"
        GROUP BY "templateCode"
      ) r ON r."templateCode" = t."code"
      LEFT JOIN (
        SELECT "templateCode", COUNT(*) AS "fieldCount"
        FROM "TemplateFieldDefinition"
        GROUP BY "templateCode"
      ) f ON f."templateCode" = t."code"
      ORDER BY t."isDefault" DESC, t."updatedAt" DESC, t."code" ASC
    `);
  } catch {
    return [];
  }
}

function defaultCopyCode() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `residential-copy-${stamp}`;
}

export default async function TemplateVersionManagementPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const templates = await loadTemplates();
  const residential = templates.find((item) => item.code === 'residential-v1');

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1300 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板管理</p>
        <h1 className="title">{project.name} · 模板版本管理</h1>
        <p className="subtitle">用于复制模板母版，形成独立模板版本。复制后不影响原住宅模板 residential-v1。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn btn-primary">规则模板中心</Link>
        <Link href={`/projects/${project.id}/template-rule-validation`} className="btn">模板规则校验</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">模板数量</div><div className="stat-value">{templates.length}</div><div className="meta">RuleTemplate</div></div>
      <div className="stat"><div className="stat-label">住宅母版科目</div><div className="stat-value">{residential?.subjectCount ?? 0}</div><div className="meta">可复制</div></div>
      <div className="stat"><div className="stat-label">住宅母版规则</div><div className="stat-value">{residential?.ruleCount ?? 0}</div><div className="meta">含 L1-L5</div></div>
      <div className="stat"><div className="stat-label">住宅母版字段</div><div className="stat-value">{residential?.fieldCount ?? 0}</div><div className="meta">字段定义库</div></div>
    </div>

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>复制住宅模板</h2>
      <form action={duplicateTemplate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="sourceCode" value="residential-v1" />
        <label><div className="meta">新模板编码</div><input name="newCode" defaultValue={defaultCopyCode()} style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
        <label><div className="meta">新模板名称</div><input name="newName" defaultValue="住宅开发模板-副本" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
        <label><div className="meta">版本号</div><input name="newVersion" defaultValue="V1-copy" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
        <label><div className="meta">说明</div><input name="description" defaultValue="由住宅开发模板复制生成，用于项目独立调试" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
        <div style={{ display: 'flex', alignItems: 'end' }}><button type="submit" className="btn btn-primary" style={{ width: '100%' }}>复制模板</button></div>
      </form>
      <p className="meta" style={{ marginTop: 10 }}>复制内容包含：模板信息、科目树、统一规则、字段定义。不直接生成项目快照。</p>
    </section>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>模板列表</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead><tr style={{ background: '#f1f5f9' }}>{['编码', '名称', '开发类型', '地区', '版本', '科目', '规则', '字段', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' }}>{head}</th>)}</tr></thead>
          <tbody>{templates.map((template) => <tr key={template.id}>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{template.code}</b></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.name}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.developmentType}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.region || '-'}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.version}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.subjectCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.ruleCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.fieldCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>
              {template.isDefault ? <b style={{ color: '#1c7ed6' }}>默认</b> : null}
              {template.isDefault ? ' / ' : null}
              <span style={{ color: template.isActive ? '#2b8a3e' : '#868e96' }}>{template.isActive ? '启用' : '停用'}</span>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div></main>;
}
