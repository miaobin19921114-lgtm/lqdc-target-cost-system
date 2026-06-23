import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TemplateRow = {
  code: string;
  name: string;
  developmentType: string;
  region: string | null;
  version: string;
  description: string | null;
  subjectCount: number;
  ruleCount: number;
  fieldCount: number;
};

type SnapshotRow = {
  id: string;
  sourceTemplateCode: string;
  sourceTemplateName: string;
  sourceTemplateVersion: string;
  snapshotName: string;
  snapshotStatus: string;
  isActive: boolean;
  subjectCount: number;
  ruleCount: number;
};

function valueOf(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

async function generateProjectSnapshot(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const templateCode = valueOf(formData, 'templateCode');
  if (!projectId || !templateCode) redirect(projectId ? `/projects/${projectId}/project-template-selection` : '/');

  const [template] = await prisma.$queryRawUnsafe<Array<{ code: string; name: string; version: string }>>(`
    SELECT "code", "name", "version"
    FROM "RuleTemplate"
    WHERE "code" = $1 AND "isActive" = TRUE
  `, templateCode);

  if (!template) redirect(`/projects/${projectId}/project-template-selection?error=template-not-found`);

  const snapshotId = `snapshot-${projectId}-${templateCode}`;

  await prisma.$executeRawUnsafe(`
    UPDATE "ProjectRuleSnapshot"
    SET "isActive" = FALSE, "snapshotStatus" = 'archived', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "projectId" = $1
  `, projectId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "ProjectRuleSnapshot" (
      "id", "projectId", "sourceTemplateCode", "sourceTemplateName", "sourceTemplateVersion", "snapshotName", "snapshotStatus", "isActive"
    ) VALUES ($1, $2, $3, $4, $5, $6, 'active', TRUE)
    ON CONFLICT ("projectId", "sourceTemplateCode") DO UPDATE SET
      "sourceTemplateName" = EXCLUDED."sourceTemplateName",
      "sourceTemplateVersion" = EXCLUDED."sourceTemplateVersion",
      "snapshotName" = EXCLUDED."snapshotName",
      "snapshotStatus" = 'active',
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
  `, snapshotId, projectId, template.code, template.name, template.version, `${template.name} 项目规则快照`);

  await prisma.$executeRawUnsafe(`DELETE FROM "ProjectRuleSubjectSnapshot" WHERE "snapshotId" = $1`, snapshotId);
  await prisma.$executeRawUnsafe(`DELETE FROM "ProjectUnifiedRuleSnapshot" WHERE "snapshotId" = $1`, snapshotId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "ProjectRuleSubjectSnapshot" (
      "id", "snapshotId", "projectId", "sourceTemplateCode", "sourceSubjectCode", "ruleType", "subjectCode", "subjectName",
      "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled", "participateCost", "participateRevenue",
      "participateTax", "participateFinance", "showInSummary", "allowProjectOverride", "allowVersionOverride", "sortOrder"
    )
    SELECT
      $1 || '-subject-' || trs."ruleType" || '-' || trs."subjectCode",
      $1,
      $2,
      trs."templateCode",
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
    FROM "TemplateRuleSubject" trs
    WHERE trs."templateCode" = $3
  `, snapshotId, projectId, templateCode);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "ProjectUnifiedRuleSnapshot" (
      "id", "snapshotId", "projectId", "sourceTemplateCode", "sourceRuleId", "ruleType", "subjectCode", "subjectName",
      "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit",
      "unitPriceSource", "defaultUnitPrice", "defaultCoefficient", "amountFormula", "costAttributionMethod", "allocationMethod",
      "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled",
      "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
    )
    SELECT
      $1 || '-rule-' || tur."ruleType" || '-' || tur."subjectCode" || '-' || regexp_replace(tur."applicableStage", '[^a-zA-Z0-9一-龥]+', '', 'g') || '-' || regexp_replace(tur."precisionLevel", '[^a-zA-Z0-9一-龥]+', '', 'g'),
      $1,
      $2,
      tur."templateCode",
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
      NULL,
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
    FROM "TemplateUnifiedRule" tur
    WHERE tur."templateCode" = $3
  `, snapshotId, projectId, templateCode);

  revalidatePath(`/projects/${projectId}/project-template-selection`);
  revalidatePath(`/projects/${projectId}/project-rule-snapshot`);
  revalidatePath(`/projects/${projectId}/version-rule-snapshots`);
  redirect(`/projects/${projectId}/project-template-selection?generated=${encodeURIComponent(templateCode)}`);
}

async function loadTemplates() {
  try {
    return await prisma.$queryRawUnsafe<TemplateRow[]>(`
      SELECT t."code", t."name", t."developmentType", t."region", t."version", t."description",
        COALESCE(s."subjectCount", 0)::int AS "subjectCount",
        COALESCE(r."ruleCount", 0)::int AS "ruleCount",
        COALESCE(f."fieldCount", 0)::int AS "fieldCount"
      FROM "RuleTemplate" t
      LEFT JOIN (SELECT "templateCode", COUNT(*) AS "subjectCount" FROM "TemplateRuleSubject" GROUP BY "templateCode") s ON s."templateCode" = t."code"
      LEFT JOIN (SELECT "templateCode", COUNT(*) AS "ruleCount" FROM "TemplateUnifiedRule" GROUP BY "templateCode") r ON r."templateCode" = t."code"
      LEFT JOIN (SELECT "templateCode", COUNT(*) AS "fieldCount" FROM "TemplateFieldDefinition" GROUP BY "templateCode") f ON f."templateCode" = t."code"
      WHERE t."isActive" = TRUE
      ORDER BY t."isDefault" DESC, t."updatedAt" DESC, t."code" ASC
    `);
  } catch {
    return [];
  }
}

async function loadSnapshots(projectId: string) {
  try {
    return await prisma.$queryRawUnsafe<SnapshotRow[]>(`
      SELECT prs."id", prs."sourceTemplateCode", prs."sourceTemplateName", prs."sourceTemplateVersion", prs."snapshotName", prs."snapshotStatus", prs."isActive",
        COALESCE(s."subjectCount", 0)::int AS "subjectCount",
        COALESCE(r."ruleCount", 0)::int AS "ruleCount"
      FROM "ProjectRuleSnapshot" prs
      LEFT JOIN (SELECT "snapshotId", COUNT(*) AS "subjectCount" FROM "ProjectRuleSubjectSnapshot" GROUP BY "snapshotId") s ON s."snapshotId" = prs."id"
      LEFT JOIN (SELECT "snapshotId", COUNT(*) AS "ruleCount" FROM "ProjectUnifiedRuleSnapshot" GROUP BY "snapshotId") r ON r."snapshotId" = prs."id"
      WHERE prs."projectId" = $1
      ORDER BY prs."isActive" DESC, prs."updatedAt" DESC
    `, projectId);
  } catch {
    return [];
  }
}

export default async function ProjectTemplateSelectionPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string; generated?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [templates, snapshots] = await Promise.all([loadTemplates(), loadSnapshots(project.id)]);
  const activeSnapshot = snapshots.find((item) => item.isActive);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">项目模板</p>
        <h1 className="title">{project.name} · 项目模板选择</h1>
        <p className="subtitle">选择模板后生成项目规则快照。快照是项目独立副本，后续项目可在快照层调整，不污染模板母版。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/template-version-management`} className="btn">模板版本管理</Link>
        <Link href={`/projects/${project.id}/project-rule-snapshot`} className="btn btn-primary">项目规则快照</Link>
      </div>
    </div>

    {searchParams?.error === 'template-not-found' ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}><b style={{ color: '#c92a2a' }}>生成失败：模板不存在或已停用。</b></section> : null}
    {searchParams?.generated ? <section className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#ebfbee' }}><b style={{ color: '#2b8a3e' }}>已生成项目规则快照：{searchParams.generated}</b></section> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">可选模板</div><div className="stat-value">{templates.length}</div><div className="meta">启用状态</div></div>
      <div className="stat"><div className="stat-label">当前快照</div><div className="stat-value">{activeSnapshot?.sourceTemplateCode || '-'}</div><div className="meta">项目正在使用</div></div>
      <div className="stat"><div className="stat-label">快照科目</div><div className="stat-value">{activeSnapshot?.subjectCount || 0}</div><div className="meta">项目副本</div></div>
      <div className="stat"><div className="stat-label">快照规则</div><div className="stat-value">{activeSnapshot?.ruleCount || 0}</div><div className="meta">项目副本</div></div>
    </div>

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>选择模板并生成项目快照</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {templates.map((template) => <form key={template.code} action={generateProjectSnapshot} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="templateCode" value={template.code} />
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>{template.name}</b>
              <span className="meta">{template.code}</span>
              <span className="meta">{template.version}</span>
              {activeSnapshot?.sourceTemplateCode === template.code ? <span style={{ color: '#2b8a3e', fontWeight: 800 }}>当前使用</span> : null}
            </div>
            <p className="meta" style={{ margin: '6px 0 0' }}>{template.developmentType} / {template.region || '通用'} / 科目 {template.subjectCount} / 规则 {template.ruleCount} / 字段 {template.fieldCount}</p>
            <p className="meta" style={{ margin: '4px 0 0' }}>{template.description || '无说明'}</p>
          </div>
          <button type="submit" className="btn btn-primary">生成快照</button>
        </form>)}
      </div>
    </section>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>项目历史快照</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead><tr style={{ background: '#f1f5f9' }}>{['模板编码', '模板名称', '版本', '快照名称', '状态', '科目', '规则'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' }}>{head}</th>)}</tr></thead>
          <tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{snapshot.sourceTemplateCode}</b></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{snapshot.sourceTemplateName}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{snapshot.sourceTemplateVersion}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{snapshot.snapshotName}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><span style={{ color: snapshot.isActive ? '#2b8a3e' : '#868e96', fontWeight: 800 }}>{snapshot.isActive ? '当前' : snapshot.snapshotStatus}</span></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{snapshot.subjectCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{snapshot.ruleCount}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div></main>;
}
