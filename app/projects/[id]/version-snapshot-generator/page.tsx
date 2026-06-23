import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type VersionRow = {
  id: string;
  name: string;
  stage: string | null;
  status: string | null;
  createdAt: Date;
  snapshotId: string | null;
  sourceTemplateCode: string | null;
  sourceProjectSnapshotId: string | null;
  subjectCount: number;
  ruleCount: number;
};

type ProjectSnapshotRow = {
  id: string;
  sourceTemplateCode: string;
  sourceTemplateName: string;
  sourceTemplateVersion: string;
  snapshotName: string;
  isActive: boolean;
  subjectCount: number;
  ruleCount: number;
};

function valueOf(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

async function generateVersionSnapshot(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const projectSnapshotId = valueOf(formData, 'projectSnapshotId');

  if (!projectId || !versionId || !projectSnapshotId) redirect(projectId ? `/projects/${projectId}/version-snapshot-generator` : '/');

  const [projectSnapshot] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    sourceTemplateCode: string;
    sourceTemplateName: string;
    sourceTemplateVersion: string;
  }>>(`
    SELECT "id", "sourceTemplateCode", "sourceTemplateName", "sourceTemplateVersion"
    FROM "ProjectRuleSnapshot"
    WHERE "id" = $1 AND "projectId" = $2
  `, projectSnapshotId, projectId);

  if (!projectSnapshot) redirect(`/projects/${projectId}/version-snapshot-generator?error=snapshot-not-found`);

  const [version] = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; projectId: string }>>(`
    SELECT "id", "name", "projectId"
    FROM "ProjectVersion"
    WHERE "id" = $1 AND "projectId" = $2
  `, versionId, projectId);

  if (!version) redirect(`/projects/${projectId}/version-snapshot-generator?error=version-not-found`);

  const versionSnapshotId = `version-snapshot-${versionId}`;

  await prisma.$executeRawUnsafe(`
    INSERT INTO "VersionRuleSnapshot" (
      "id", "projectId", "versionId", "sourceProjectSnapshotId", "sourceTemplateCode", "snapshotName", "snapshotStatus", "isActive"
    ) VALUES ($1, $2, $3, $4, $5, $6, 'active', TRUE)
    ON CONFLICT ("versionId") DO UPDATE SET
      "sourceProjectSnapshotId" = EXCLUDED."sourceProjectSnapshotId",
      "sourceTemplateCode" = EXCLUDED."sourceTemplateCode",
      "snapshotName" = EXCLUDED."snapshotName",
      "snapshotStatus" = 'active',
      "isActive" = TRUE,
      "updatedAt" = CURRENT_TIMESTAMP
  `,
    versionSnapshotId,
    projectId,
    versionId,
    projectSnapshot.id,
    projectSnapshot.sourceTemplateCode,
    `${version.name} · ${projectSnapshot.sourceTemplateName} 版本规则快照`,
  );

  await prisma.$executeRawUnsafe(`DELETE FROM "VersionRuleSubjectSnapshot" WHERE "snapshotId" = $1`, versionSnapshotId);
  await prisma.$executeRawUnsafe(`DELETE FROM "VersionUnifiedRuleSnapshot" WHERE "snapshotId" = $1`, versionSnapshotId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "VersionRuleSubjectSnapshot" (
      "id", "snapshotId", "projectId", "versionId", "sourceProjectSubjectId", "ruleType", "subjectCode", "subjectName",
      "parentCode", "level", "subjectPath", "isEnabled", "showInSummary", "allowVersionOverride", "sortOrder"
    )
    SELECT
      $1 || '-subject-' || prss."ruleType" || '-' || prss."subjectCode",
      $1,
      $2,
      $3,
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
    FROM "ProjectRuleSubjectSnapshot" prss
    WHERE prss."snapshotId" = $4
  `, versionSnapshotId, projectId, versionId, projectSnapshot.id);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "VersionUnifiedRuleSnapshot" (
      "id", "snapshotId", "projectId", "versionId", "sourceProjectRuleId", "ruleType", "subjectCode", "subjectName",
      "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit",
      "unitPriceSource", "defaultUnitPrice", "defaultCoefficient", "amountFormula", "costAttributionMethod", "allocationMethod",
      "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled",
      "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
    )
    SELECT
      $1 || '-rule-' || purs."ruleType" || '-' || purs."subjectCode" || '-' || regexp_replace(purs."applicableStage", '[^a-zA-Z0-9一-龥]+', '', 'g') || '-' || regexp_replace(purs."precisionLevel", '[^a-zA-Z0-9一-龥]+', '', 'g'),
      $1,
      $2,
      $3,
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
    FROM "ProjectUnifiedRuleSnapshot" purs
    WHERE purs."snapshotId" = $4
  `, versionSnapshotId, projectId, versionId, projectSnapshot.id);

  revalidatePath(`/projects/${projectId}/version-snapshot-generator`);
  revalidatePath(`/projects/${projectId}/version-rule-snapshots`);
  redirect(`/projects/${projectId}/version-snapshot-generator?generated=${encodeURIComponent(version.name)}`);
}

async function loadProjectSnapshots(projectId: string) {
  try {
    return await prisma.$queryRawUnsafe<ProjectSnapshotRow[]>(`
      SELECT prs."id", prs."sourceTemplateCode", prs."sourceTemplateName", prs."sourceTemplateVersion", prs."snapshotName", prs."isActive",
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

async function loadVersions(projectId: string) {
  try {
    return await prisma.$queryRawUnsafe<VersionRow[]>(`
      SELECT pv."id", pv."name", pv."stage", pv."status", pv."createdAt",
        vrs."id" AS "snapshotId", vrs."sourceTemplateCode", vrs."sourceProjectSnapshotId",
        COALESCE(s."subjectCount", 0)::int AS "subjectCount",
        COALESCE(r."ruleCount", 0)::int AS "ruleCount"
      FROM "ProjectVersion" pv
      LEFT JOIN "VersionRuleSnapshot" vrs ON vrs."versionId" = pv."id"
      LEFT JOIN (SELECT "snapshotId", COUNT(*) AS "subjectCount" FROM "VersionRuleSubjectSnapshot" GROUP BY "snapshotId") s ON s."snapshotId" = vrs."id"
      LEFT JOIN (SELECT "snapshotId", COUNT(*) AS "ruleCount" FROM "VersionUnifiedRuleSnapshot" GROUP BY "snapshotId") r ON r."snapshotId" = vrs."id"
      WHERE pv."projectId" = $1
      ORDER BY pv."createdAt" DESC
    `, projectId);
  } catch {
    return [];
  }
}

export default async function VersionSnapshotGeneratorPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string; generated?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [projectSnapshots, versions] = await Promise.all([loadProjectSnapshots(project.id), loadVersions(project.id)]);
  const activeProjectSnapshot = projectSnapshots.find((snapshot) => snapshot.isActive) || projectSnapshots[0];
  const versionsWithSnapshot = versions.filter((version) => version.snapshotId).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">版本规则</p>
        <h1 className="title">{project.name} · 版本快照生成</h1>
        <p className="subtitle">把项目当前规则快照复制到具体测算版本，形成版本固定规则副本。后续版本调整不影响模板和项目快照。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/project-template-selection`} className="btn">项目模板选择</Link>
        <Link href={`/projects/${project.id}/version-rule-snapshots`} className="btn btn-primary">版本规则快照</Link>
      </div>
    </div>

    {searchParams?.error === 'snapshot-not-found' ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}><b style={{ color: '#c92a2a' }}>生成失败：项目规则快照不存在。</b></section> : null}
    {searchParams?.error === 'version-not-found' ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}><b style={{ color: '#c92a2a' }}>生成失败：版本不存在。</b></section> : null}
    {searchParams?.generated ? <section className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#ebfbee' }}><b style={{ color: '#2b8a3e' }}>已生成版本规则快照：{searchParams.generated}</b></section> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">项目快照</div><div className="stat-value">{activeProjectSnapshot?.sourceTemplateCode || '-'}</div><div className="meta">当前来源模板</div></div>
      <div className="stat"><div className="stat-label">项目快照规则</div><div className="stat-value">{activeProjectSnapshot?.ruleCount || 0}</div><div className="meta">可复制到版本</div></div>
      <div className="stat"><div className="stat-label">版本数量</div><div className="stat-value">{versions.length}</div><div className="meta">ProjectVersion</div></div>
      <div className="stat"><div className="stat-label">已有版本快照</div><div className="stat-value">{versionsWithSnapshot}</div><div className="meta">已生成</div></div>
    </div>

    {!activeProjectSnapshot ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>当前项目还没有项目规则快照</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>请先到“项目模板选择”生成项目规则快照。</p>
    </section> : null}

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>当前项目规则快照</h2>
      {activeProjectSnapshot ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div><div className="meta">来源模板</div><b>{activeProjectSnapshot.sourceTemplateCode}</b></div>
        <div><div className="meta">模板名称</div><b>{activeProjectSnapshot.sourceTemplateName}</b></div>
        <div><div className="meta">模板版本</div><b>{activeProjectSnapshot.sourceTemplateVersion}</b></div>
        <div><div className="meta">科目</div><b>{activeProjectSnapshot.subjectCount}</b></div>
        <div><div className="meta">规则</div><b>{activeProjectSnapshot.ruleCount}</b></div>
      </div> : <p className="meta">暂无项目规则快照。</p>}
    </section>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>选择版本生成规则快照</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {versions.map((version) => <form key={version.id} action={generateVersionSnapshot} style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="versionId" value={version.id} />
          <input type="hidden" name="projectSnapshotId" value={activeProjectSnapshot?.id || ''} />
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>{version.name}</b>
              <span className="meta">{version.stage || '未设置阶段'}</span>
              <span className="meta">{version.status || '未设置状态'}</span>
              {version.snapshotId ? <span style={{ color: '#2b8a3e', fontWeight: 800 }}>已有快照</span> : <span style={{ color: '#f08c00', fontWeight: 800 }}>未生成</span>}
            </div>
            <p className="meta" style={{ margin: '6px 0 0' }}>来源模板：{version.sourceTemplateCode || '-'} / 版本快照科目 {version.subjectCount} / 规则 {version.ruleCount}</p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!activeProjectSnapshot}>{version.snapshotId ? '重建快照' : '生成快照'}</button>
        </form>)}
        {!versions.length ? <p className="meta">暂无测算版本，请先到“版本管理”创建版本。</p> : null}
      </div>
    </section>
  </div></main>;
}
