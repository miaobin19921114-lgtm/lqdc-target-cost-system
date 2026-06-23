import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type AnyRecord = Record<string, any>;

type TemplateExport = {
  exportedAt: string;
  schema: 'lqdc-template-json-v1';
  template: AnyRecord | null;
  subjects: AnyRecord[];
  rules: AnyRecord[];
  fields: AnyRecord[];
};

type TemplateListRow = {
  code: string;
  name: string;
  developmentType: string;
  version: string;
  subjectCount: number;
  ruleCount: number;
  fieldCount: number;
};

function valueOf(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

function safeCode(value: string) {
  const code = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return code || `template-import-${Date.now()}`;
}

function cleanStage(value: string) {
  return String(value || '').replace(/[^a-zA-Z0-9一-龥]+/g, '');
}

async function importTemplate(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const rawJson = valueOf(formData, 'templateJson');
  if (!projectId || !rawJson) redirect(projectId ? `/projects/${projectId}/template-import-export` : '/');

  let data: TemplateExport;
  try {
    data = JSON.parse(rawJson) as TemplateExport;
  } catch {
    redirect(`/projects/${projectId}/template-import-export?error=invalid-json`);
  }

  const sourceTemplate = data.template || {};
  const targetCode = safeCode(valueOf(formData, 'targetCode') || sourceTemplate.code || sourceTemplate.id || 'template-import');
  const targetName = valueOf(formData, 'targetName') || sourceTemplate.name || `${targetCode}-导入模板`;
  const targetVersion = valueOf(formData, 'targetVersion') || sourceTemplate.version || 'imported';
  const targetDescription = valueOf(formData, 'description') || sourceTemplate.description || `由模板 JSON 导入：${targetCode}`;

  await prisma.$executeRawUnsafe(`
    INSERT INTO "RuleTemplate" ("id", "code", "name", "developmentType", "region", "version", "description", "isDefault", "isActive")
    VALUES ($1, $1, $2, $3, $4, $5, $6, FALSE, TRUE)
    ON CONFLICT ("code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "developmentType" = EXCLUDED."developmentType",
      "region" = EXCLUDED."region",
      "version" = EXCLUDED."version",
      "description" = EXCLUDED."description",
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
  `,
    targetCode,
    targetName,
    sourceTemplate.developmentType || '住宅开发',
    sourceTemplate.region || '通用',
    targetVersion,
    targetDescription,
  );

  for (const subject of data.subjects || []) {
    const subjectCode = String(subject.subjectCode || '').trim();
    if (!subjectCode) continue;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TemplateRuleSubject" (
        "id", "templateCode", "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled",
        "participateCost", "participateRevenue", "participateTax", "participateFinance", "showInSummary", "allowProjectOverride", "allowVersionOverride", "sortOrder", "remark"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
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
    `,
      `${targetCode}-${subject.ruleType || 'COST'}-${subjectCode}`,
      targetCode,
      subject.ruleType || 'COST',
      subjectCode,
      subject.subjectName || subjectCode,
      subject.parentCode || null,
      Number(subject.level || 1),
      subject.subjectPath || subject.subjectName || subjectCode,
      subject.isEnabled !== false,
      subject.isDefaultEnabled !== false,
      Boolean(subject.participateCost),
      Boolean(subject.participateRevenue),
      Boolean(subject.participateTax),
      Boolean(subject.participateFinance),
      subject.showInSummary !== false,
      subject.allowProjectOverride !== false,
      subject.allowVersionOverride !== false,
      Number(subject.sortOrder || 0),
      subject.remark || null,
    );
  }

  for (const rule of data.rules || []) {
    const ruleType = String(rule.ruleType || 'COST');
    const subjectCode = String(rule.subjectCode || '').trim();
    const stage = String(rule.applicableStage || '目标成本');
    const precision = String(rule.precisionLevel || 'L3 目标测算');
    if (!subjectCode) continue;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TemplateUnifiedRule" (
        "id", "templateCode", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "applicableProductType",
        "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "defaultCoefficient",
        "costAttributionMethod", "revenueAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment",
        "isEnabled", "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder", "remark"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29
      )
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
    `,
      `rule-${targetCode}-${ruleType}-${subjectCode}-${cleanStage(stage)}-${cleanStage(precision)}`,
      targetCode,
      ruleType,
      subjectCode,
      rule.subjectName || subjectCode,
      stage,
      precision,
      rule.applicableProductType || null,
      rule.dataSourceTable || null,
      rule.requiredFields || null,
      rule.measureBasis || null,
      rule.quantityFormula || null,
      rule.pricingUnit || null,
      rule.unitPriceSource || null,
      rule.amountFormula || null,
      Number(rule.defaultCoefficient || 1),
      rule.costAttributionMethod || null,
      rule.revenueAttributionMethod || null,
      rule.allocationMethod || null,
      rule.vatTreatment || null,
      rule.landVatTreatment || null,
      rule.incomeTaxTreatment || null,
      rule.financeTreatment || null,
      rule.isEnabled !== false,
      rule.allowProjectOverride !== false,
      rule.allowVersionOverride !== false,
      rule.participateSettlementFeedback !== false,
      Number(rule.sortOrder || 0),
      rule.remark || null,
    );
  }

  for (const field of data.fields || []) {
    const fieldKey = String(field.fieldKey || '').trim();
    const sourceTable = String(field.sourceTable || '').trim();
    if (!fieldKey || !sourceTable) continue;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TemplateFieldDefinition" (
        "id", "templateCode", "fieldKey", "fieldName", "fieldGroup", "sourceTable", "fieldType", "unit", "isRequired", "applicableStage", "precisionLevel",
        "sourceRuleType", "sourceSubjectCodes", "sourceSubjects", "description", "sortOrder"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      )
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
    `,
      `field-${targetCode}-${sourceTable}-${fieldKey}`,
      targetCode,
      fieldKey,
      field.fieldName || fieldKey,
      field.fieldGroup || null,
      sourceTable,
      field.fieldType || 'number',
      field.unit || null,
      field.isRequired !== false,
      field.applicableStage || null,
      field.precisionLevel || null,
      field.sourceRuleType || null,
      field.sourceSubjectCodes || null,
      field.sourceSubjects || null,
      field.description || null,
      Number(field.sortOrder || 0),
    );
  }

  revalidatePath(`/projects/${projectId}/template-import-export`);
  revalidatePath(`/projects/${projectId}/template-version-management`);
  revalidatePath(`/projects/${projectId}/template-rule-validation`);
  redirect(`/projects/${projectId}/template-import-export?imported=${encodeURIComponent(targetCode)}`);
}

async function loadTemplates() {
  try {
    return await prisma.$queryRawUnsafe<TemplateListRow[]>(`
      SELECT t."code", t."name", t."developmentType", t."version",
        COALESCE(s."subjectCount", 0)::int AS "subjectCount",
        COALESCE(r."ruleCount", 0)::int AS "ruleCount",
        COALESCE(f."fieldCount", 0)::int AS "fieldCount"
      FROM "RuleTemplate" t
      LEFT JOIN (SELECT "templateCode", COUNT(*) AS "subjectCount" FROM "TemplateRuleSubject" GROUP BY "templateCode") s ON s."templateCode" = t."code"
      LEFT JOIN (SELECT "templateCode", COUNT(*) AS "ruleCount" FROM "TemplateUnifiedRule" GROUP BY "templateCode") r ON r."templateCode" = t."code"
      LEFT JOIN (SELECT "templateCode", COUNT(*) AS "fieldCount" FROM "TemplateFieldDefinition" GROUP BY "templateCode") f ON f."templateCode" = t."code"
      ORDER BY t."isDefault" DESC, t."updatedAt" DESC, t."code" ASC
    `);
  } catch {
    return [];
  }
}

async function exportTemplate(templateCode = 'residential-v1'): Promise<TemplateExport> {
  const [template] = await prisma.$queryRawUnsafe<AnyRecord[]>(`SELECT * FROM "RuleTemplate" WHERE "code" = $1`, templateCode).catch(() => [] as AnyRecord[]);
  const subjects = await prisma.$queryRawUnsafe<AnyRecord[]>(`SELECT * FROM "TemplateRuleSubject" WHERE "templateCode" = $1 ORDER BY "sortOrder" ASC, "subjectCode" ASC`, templateCode).catch(() => [] as AnyRecord[]);
  const rules = await prisma.$queryRawUnsafe<AnyRecord[]>(`SELECT * FROM "TemplateUnifiedRule" WHERE "templateCode" = $1 ORDER BY "sortOrder" ASC, "ruleType" ASC, "subjectCode" ASC`, templateCode).catch(() => [] as AnyRecord[]);
  const fields = await prisma.$queryRawUnsafe<AnyRecord[]>(`SELECT * FROM "TemplateFieldDefinition" WHERE "templateCode" = $1 ORDER BY "sourceTable" ASC, "sortOrder" ASC, "fieldName" ASC`, templateCode).catch(() => [] as AnyRecord[]);
  return {
    exportedAt: new Date().toISOString(),
    schema: 'lqdc-template-json-v1',
    template: template || null,
    subjects,
    rules,
    fields,
  };
}

export default async function TemplateImportExportPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string; imported?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [templates, exportData] = await Promise.all([loadTemplates(), exportTemplate('residential-v1')]);
  const exportJson = JSON.stringify(exportData, null, 2);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1450 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板管理</p>
        <h1 className="title">{project.name} · 模板导入导出</h1>
        <p className="subtitle">用于模板备份、迁移和跨环境复制。默认导出 residential-v1 住宅模板。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/template-version-management`} className="btn btn-primary">模板版本管理</Link>
        <Link href={`/projects/${project.id}/template-rule-validation`} className="btn">模板规则校验</Link>
      </div>
    </div>

    {searchParams?.error === 'invalid-json' ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>
      <b style={{ color: '#c92a2a' }}>导入失败：JSON 格式错误</b>
    </section> : null}
    {searchParams?.imported ? <section className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#ebfbee' }}>
      <b style={{ color: '#2b8a3e' }}>导入成功：{searchParams.imported}</b>
    </section> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">模板数量</div><div className="stat-value">{templates.length}</div><div className="meta">当前系统</div></div>
      <div className="stat"><div className="stat-label">导出科目</div><div className="stat-value">{exportData.subjects.length}</div><div className="meta">residential-v1</div></div>
      <div className="stat"><div className="stat-label">导出规则</div><div className="stat-value">{exportData.rules.length}</div><div className="meta">含 L1-L5</div></div>
      <div className="stat"><div className="stat-label">导出字段</div><div className="stat-value">{exportData.fields.length}</div><div className="meta">字段定义库</div></div>
    </div>

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>模板列表</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
          <thead><tr style={{ background: '#f1f5f9' }}>{['编码', '名称', '开发类型', '版本', '科目', '规则', '字段'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' }}>{head}</th>)}</tr></thead>
          <tbody>{templates.map((template) => <tr key={template.code}>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{template.code}</b></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.name}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.developmentType}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.version}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.subjectCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.ruleCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{template.fieldCount}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>导出 residential-v1 模板 JSON</h2>
      <p className="meta">复制下面 JSON 可作为备份，也可粘贴到导入区生成新模板。</p>
      <textarea readOnly value={exportJson} rows={18} style={{ width: '100%', marginTop: 10, border: '1px solid #d8e0ea', borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.45 }} />
    </section>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>导入模板 JSON</h2>
      <form action={importTemplate}>
        <input type="hidden" name="projectId" value={project.id} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 10 }}>
          <label><div className="meta">目标模板编码</div><input name="targetCode" placeholder="例如 residential-v2" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
          <label><div className="meta">目标模板名称</div><input name="targetName" placeholder="例如 住宅开发模板 V2" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
          <label><div className="meta">版本号</div><input name="targetVersion" placeholder="例如 V2" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
          <label><div className="meta">说明</div><input name="description" placeholder="导入说明" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }} /></label>
        </div>
        <textarea name="templateJson" rows={14} placeholder="粘贴模板 JSON" style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.45 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button type="submit" className="btn btn-primary">导入模板</button></div>
      </form>
    </section>
  </div></main>;
}
