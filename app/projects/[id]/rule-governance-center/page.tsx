import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getVersionRuleEngineContext } from '@/lib/rule-engine/version-rule-engine';

export const dynamic = 'force-dynamic';

type VersionRow = { id: string; name: string; stage: string | null; snapshotId: string | null; snapshotStatus: string | null; sourceTemplateCode: string | null; ruleCount: number };
type RuleRow = { id: string; ruleType: string; subjectCode: string; subjectName: string; applicableStage: string; precisionLevel: string; dataSourceTable: string | null; requiredFields: string | null; measureBasis: string | null; quantityFormula: string | null; pricingUnit: string | null; unitPriceSource: string | null; amountFormula: string | null; allocationMethod: string | null; vatTreatment: string | null; landVatTreatment: string | null; incomeTaxTreatment: string | null; editRemark: string | null };
type LogRow = { id: string; scopeType: string; scopeId: string; changeType: string; fieldName: string | null; beforeValue: string | null; afterValue: string | null; operator: string; remark: string | null; createdAt: Date };
type ValidationRow = { id: string; checkName: string; severity: string; message: string; subjectCode: string | null; ruleType: string | null; createdAt: Date };
type TemplateRow = { code: string; name: string; version: string; publishStatus: string; isActive: boolean; developmentType: string; scopeText: string | null };
type DiffSummary = { changedRules: number; missingInVersion: number; extraInVersion: number };

function valueOf(formData: FormData, name: string) { return String(formData.get(name) || '').trim(); }
function boolText(value: boolean) { return value ? '是' : '否'; }
function isLocked(status?: string | null) { return status === 'locked'; }

async function logChange(data: { scopeType: string; scopeId: string; projectId?: string; versionId?: string; templateCode?: string; ruleType?: string; subjectCode?: string; changeType: string; fieldName?: string; beforeValue?: string | null; afterValue?: string | null; remark?: string }) {
  await prisma.$executeRawUnsafe(`
    INSERT INTO "RuleChangeLog" ("id", "scopeType", "scopeId", "projectId", "versionId", "templateCode", "ruleType", "subjectCode", "changeType", "fieldName", "beforeValue", "afterValue", "operator", "remark")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'system',$13)
  `, `log-${Date.now()}-${Math.random().toString(16).slice(2)}`, data.scopeType, data.scopeId, data.projectId || null, data.versionId || null, data.templateCode || null, data.ruleType || null, data.subjectCode || null, data.changeType, data.fieldName || null, data.beforeValue || null, data.afterValue || null, data.remark || null);
}

async function updateVersionRule(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const ruleId = valueOf(formData, 'ruleId');
  const backUrl = `/projects/${projectId}/rule-governance-center?versionId=${encodeURIComponent(versionId)}`;
  const [snapshot] = await prisma.$queryRawUnsafe<Array<{ snapshotStatus: string }>>(`SELECT "snapshotStatus" FROM "VersionRuleSnapshot" WHERE "versionId"=$1`, versionId).catch(() => []);
  if (!snapshot || isLocked(snapshot.snapshotStatus)) redirect(`${backUrl}&error=locked`);

  const [before] = await prisma.$queryRawUnsafe<RuleRow[]>(`SELECT * FROM "VersionUnifiedRuleSnapshot" WHERE "id"=$1`, ruleId).catch(() => []);
  if (!before) redirect(backUrl);

  const next = {
    quantityFormula: valueOf(formData, 'quantityFormula'),
    unitPriceSource: valueOf(formData, 'unitPriceSource'),
    amountFormula: valueOf(formData, 'amountFormula'),
    allocationMethod: valueOf(formData, 'allocationMethod'),
    vatTreatment: valueOf(formData, 'vatTreatment'),
    landVatTreatment: valueOf(formData, 'landVatTreatment'),
    incomeTaxTreatment: valueOf(formData, 'incomeTaxTreatment'),
    editRemark: valueOf(formData, 'editRemark'),
  };

  await prisma.$executeRawUnsafe(`
    UPDATE "VersionUnifiedRuleSnapshot"
    SET "quantityFormula"=$1, "unitPriceSource"=$2, "amountFormula"=$3, "allocationMethod"=$4, "vatTreatment"=$5, "landVatTreatment"=$6, "incomeTaxTreatment"=$7, "editRemark"=$8, "updatedAt"=CURRENT_TIMESTAMP
    WHERE "id"=$9
  `, next.quantityFormula, next.unitPriceSource, next.amountFormula, next.allocationMethod, next.vatTreatment, next.landVatTreatment, next.incomeTaxTreatment, next.editRemark, ruleId);

  for (const field of Object.keys(next) as Array<keyof typeof next>) {
    if (String(before[field] || '') !== String(next[field] || '')) {
      await logChange({ scopeType: 'VERSION_RULE', scopeId: ruleId, projectId, versionId, ruleType: before.ruleType, subjectCode: before.subjectCode, changeType: 'update', fieldName: field, beforeValue: String(before[field] || ''), afterValue: String(next[field] || ''), remark: next.editRemark || '版本规则编辑' });
    }
  }
  revalidatePath(`/projects/${projectId}/rule-governance-center`);
  redirect(backUrl);
}

async function changeVersionLock(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const action = valueOf(formData, 'action');
  const status = action === 'lock' ? 'locked' : 'active';
  const reason = valueOf(formData, 'reason') || (action === 'lock' ? '版本规则定稿锁定' : '版本规则解锁调整');
  await prisma.$executeRawUnsafe(`
    UPDATE "VersionRuleSnapshot"
    SET "snapshotStatus"=$1, "lockedAt"=CASE WHEN $1='locked' THEN CURRENT_TIMESTAMP ELSE NULL END, "lockedBy"=CASE WHEN $1='locked' THEN 'system' ELSE NULL END, "lockReason"=$2, "updatedAt"=CURRENT_TIMESTAMP
    WHERE "versionId"=$3 AND "projectId"=$4
  `, status, reason, versionId, projectId);
  await logChange({ scopeType: 'VERSION_SNAPSHOT', scopeId: versionId, projectId, versionId, changeType: action === 'lock' ? 'lock' : 'unlock', afterValue: status, remark: reason });
  revalidatePath(`/projects/${projectId}/rule-governance-center`);
  redirect(`/projects/${projectId}/rule-governance-center?versionId=${encodeURIComponent(versionId)}`);
}

async function validateVersionRules(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const [snapshot] = await prisma.$queryRawUnsafe<Array<{ id: string; sourceTemplateCode: string }>>(`SELECT "id", "sourceTemplateCode" FROM "VersionRuleSnapshot" WHERE "versionId"=$1 AND "projectId"=$2`, versionId, projectId).catch(() => []);
  if (!snapshot) redirect(`/projects/${projectId}/rule-governance-center?versionId=${encodeURIComponent(versionId)}&error=no-version-snapshot`);

  await prisma.$executeRawUnsafe(`DELETE FROM "RuleValidationResult" WHERE "scopeType"='VERSION_SNAPSHOT' AND "scopeId"=$1`, snapshot.id);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "RuleValidationResult" ("id", "scopeType", "scopeId", "projectId", "versionId", "templateCode", "ruleId", "ruleType", "subjectCode", "checkName", "severity", "message")
    SELECT 'validation-' || "id" || '-missing-formula', 'VERSION_SNAPSHOT', $1, $2, $3, $4, "id", "ruleType", "subjectCode", '公式完整度', 'warning', '规则缺少工程量公式或金额公式'
    FROM "VersionUnifiedRuleSnapshot"
    WHERE "snapshotId"=$1 AND "isEnabled"=TRUE AND (COALESCE("quantityFormula", '')='' OR COALESCE("amountFormula", '')='')
  `, snapshot.id, projectId, versionId, snapshot.sourceTemplateCode);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "RuleValidationResult" ("id", "scopeType", "scopeId", "projectId", "versionId", "templateCode", "ruleId", "ruleType", "subjectCode", "checkName", "severity", "message")
    SELECT 'validation-' || "id" || '-missing-tax', 'VERSION_SNAPSHOT', $1, $2, $3, $4, "id", "ruleType", "subjectCode", '税务口径', 'warning', '成本/税费规则缺少税务处理口径'
    FROM "VersionUnifiedRuleSnapshot"
    WHERE "snapshotId"=$1 AND "isEnabled"=TRUE AND "ruleType" IN ('COST','TAX') AND (COALESCE("vatTreatment", '')='' OR COALESCE("landVatTreatment", '')='' OR COALESCE("incomeTaxTreatment", '')='')
    ON CONFLICT DO NOTHING
  `, snapshot.id, projectId, versionId, snapshot.sourceTemplateCode);
  await logChange({ scopeType: 'VERSION_SNAPSHOT', scopeId: snapshot.id, projectId, versionId, templateCode: snapshot.sourceTemplateCode, changeType: 'validate', remark: '执行版本规则公式/税务口径校验' });
  revalidatePath(`/projects/${projectId}/rule-governance-center`);
  redirect(`/projects/${projectId}/rule-governance-center?versionId=${encodeURIComponent(versionId)}`);
}

async function updateTemplateStatus(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const templateCode = valueOf(formData, 'templateCode');
  const status = valueOf(formData, 'publishStatus');
  const isActive = status !== 'disabled';
  await prisma.$executeRawUnsafe(`
    UPDATE "RuleTemplate"
    SET "publishStatus"=$1, "isActive"=$2, "publishedAt"=CASE WHEN $1='published' THEN CURRENT_TIMESTAMP ELSE "publishedAt" END, "publishedBy"=CASE WHEN $1='published' THEN 'system' ELSE "publishedBy" END, "updatedAt"=CURRENT_TIMESTAMP
    WHERE "code"=$3
  `, status, isActive, templateCode);
  await logChange({ scopeType: 'TEMPLATE', scopeId: templateCode, projectId, templateCode, changeType: 'publish_status', afterValue: status, remark: '模板发布状态调整' });
  revalidatePath(`/projects/${projectId}/rule-governance-center`);
  redirect(`/projects/${projectId}/rule-governance-center`);
}

async function rollbackVersionSnapshot(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const [snapshot] = await prisma.$queryRawUnsafe<Array<{ id: string; sourceProjectSnapshotId: string; snapshotStatus: string }>>(`SELECT "id", "sourceProjectSnapshotId", "snapshotStatus" FROM "VersionRuleSnapshot" WHERE "versionId"=$1 AND "projectId"=$2`, versionId, projectId).catch(() => []);
  if (!snapshot || isLocked(snapshot.snapshotStatus)) redirect(`/projects/${projectId}/rule-governance-center?versionId=${encodeURIComponent(versionId)}&error=locked`);
  await prisma.$executeRawUnsafe(`DELETE FROM "VersionRuleSubjectSnapshot" WHERE "snapshotId"=$1`, snapshot.id);
  await prisma.$executeRawUnsafe(`DELETE FROM "VersionUnifiedRuleSnapshot" WHERE "snapshotId"=$1`, snapshot.id);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "VersionRuleSubjectSnapshot" ("id", "snapshotId", "projectId", "versionId", "sourceProjectSubjectId", "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "showInSummary", "allowVersionOverride", "sortOrder")
    SELECT $1 || '-subject-' || "ruleType" || '-' || "subjectCode", $1, $2, $3, "id", "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "showInSummary", "allowVersionOverride", "sortOrder"
    FROM "ProjectRuleSubjectSnapshot" WHERE "snapshotId"=$4
  `, snapshot.id, projectId, versionId, snapshot.sourceProjectSnapshotId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "VersionUnifiedRuleSnapshot" ("id", "snapshotId", "projectId", "versionId", "sourceProjectRuleId", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "defaultUnitPrice", "defaultCoefficient", "amountFormula", "costAttributionMethod", "allocationMethod", "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled", "allowVersionOverride", "participateSettlementFeedback", "sortOrder")
    SELECT $1 || '-rule-' || "ruleType" || '-' || "subjectCode" || '-' || regexp_replace("applicableStage", '[^a-zA-Z0-9一-龥]+', '', 'g') || '-' || regexp_replace("precisionLevel", '[^a-zA-Z0-9一-龥]+', '', 'g'), $1, $2, $3, "id", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "defaultUnitPrice", "defaultCoefficient", "amountFormula", "costAttributionMethod", "allocationMethod", "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
    FROM "ProjectUnifiedRuleSnapshot" WHERE "snapshotId"=$4
  `, snapshot.id, projectId, versionId, snapshot.sourceProjectSnapshotId);
  await logChange({ scopeType: 'VERSION_SNAPSHOT', scopeId: snapshot.id, projectId, versionId, changeType: 'rollback', remark: '从项目规则快照回滚/重建版本规则' });
  revalidatePath(`/projects/${projectId}/rule-governance-center`);
  redirect(`/projects/${projectId}/rule-governance-center?versionId=${encodeURIComponent(versionId)}`);
}

async function loadVersions(projectId: string) {
  return prisma.$queryRawUnsafe<VersionRow[]>(`
    SELECT pv."id", pv."name", pv."stage", vrs."id" AS "snapshotId", vrs."snapshotStatus", vrs."sourceTemplateCode", COALESCE(r."ruleCount", 0)::int AS "ruleCount"
    FROM "ProjectVersion" pv
    LEFT JOIN "VersionRuleSnapshot" vrs ON vrs."versionId"=pv."id"
    LEFT JOIN (SELECT "snapshotId", COUNT(*) AS "ruleCount" FROM "VersionUnifiedRuleSnapshot" GROUP BY "snapshotId") r ON r."snapshotId"=vrs."id"
    WHERE pv."projectId"=$1 ORDER BY pv."createdAt" DESC
  `, projectId).catch(() => []);
}

async function loadRules(snapshotId?: string | null) {
  if (!snapshotId) return [];
  return prisma.$queryRawUnsafe<RuleRow[]>(`
    SELECT "id", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "editRemark"
    FROM "VersionUnifiedRuleSnapshot" WHERE "snapshotId"=$1 ORDER BY "sortOrder" ASC, "ruleType" ASC, "subjectCode" ASC LIMIT 30
  `, snapshotId).catch(() => []);
}

async function loadLogs(projectId: string) {
  return prisma.$queryRawUnsafe<LogRow[]>(`SELECT * FROM "RuleChangeLog" WHERE "projectId"=$1 ORDER BY "createdAt" DESC LIMIT 20`, projectId).catch(() => []);
}

async function loadValidations(snapshotId?: string | null) {
  if (!snapshotId) return [];
  return prisma.$queryRawUnsafe<ValidationRow[]>(`SELECT * FROM "RuleValidationResult" WHERE "scopeType"='VERSION_SNAPSHOT' AND "scopeId"=$1 ORDER BY "createdAt" DESC LIMIT 30`, snapshotId).catch(() => []);
}

async function loadTemplates() {
  return prisma.$queryRawUnsafe<TemplateRow[]>(`
    SELECT t."code", t."name", t."version", COALESCE(t."publishStatus", CASE WHEN t."isActive" THEN 'published' ELSE 'disabled' END) AS "publishStatus", t."isActive", t."developmentType", s."description" AS "scopeText"
    FROM "RuleTemplate" t LEFT JOIN "TemplateApplicabilityScope" s ON s."templateCode"=t."code" AND s."isActive"=TRUE
    ORDER BY t."isDefault" DESC, t."updatedAt" DESC
  `).catch(() => []);
}

async function loadDiff(snapshotId?: string | null) {
  if (!snapshotId) return { changedRules: 0, missingInVersion: 0, extraInVersion: 0 };
  const [row] = await prisma.$queryRawUnsafe<DiffSummary[]>(`
    WITH vrs AS (SELECT "sourceProjectSnapshotId" FROM "VersionRuleSnapshot" WHERE "id"=$1),
    p AS (SELECT * FROM "ProjectUnifiedRuleSnapshot" WHERE "snapshotId"=(SELECT "sourceProjectSnapshotId" FROM vrs)),
    v AS (SELECT * FROM "VersionUnifiedRuleSnapshot" WHERE "snapshotId"=$1),
    joined AS (
      SELECT p."id" AS p_id, v."id" AS v_id,
             (COALESCE(p."quantityFormula",'')<>COALESCE(v."quantityFormula",'') OR COALESCE(p."amountFormula",'')<>COALESCE(v."amountFormula",'') OR COALESCE(p."allocationMethod",'')<>COALESCE(v."allocationMethod",'') OR COALESCE(p."vatTreatment",'')<>COALESCE(v."vatTreatment",'')) AS changed
      FROM p FULL JOIN v ON p."ruleType"=v."ruleType" AND p."subjectCode"=v."subjectCode" AND p."applicableStage"=v."applicableStage" AND p."precisionLevel"=v."precisionLevel"
    )
    SELECT COUNT(*) FILTER (WHERE changed)::int AS "changedRules", COUNT(*) FILTER (WHERE p_id IS NOT NULL AND v_id IS NULL)::int AS "missingInVersion", COUNT(*) FILTER (WHERE p_id IS NULL AND v_id IS NOT NULL)::int AS "extraInVersion" FROM joined
  `, snapshotId).catch(() => [{ changedRules: 0, missingInVersion: 0, extraInVersion: 0 }]);
  return row || { changedRules: 0, missingInVersion: 0, extraInVersion: 0 };
}

export default async function RuleGovernanceCenterPage({ params, searchParams }: { params: { id: string }; searchParams?: { versionId?: string; error?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;
  const versions = await loadVersions(project.id);
  const selectedVersion = versions.find((item) => item.id === searchParams?.versionId) || versions.find((item) => item.snapshotId) || versions[0];
  const engine = selectedVersion ? await getVersionRuleEngineContext(selectedVersion.id) : null;
  const [rules, logs, validations, templates, diff] = await Promise.all([loadRules(selectedVersion?.snapshotId), loadLogs(project.id), loadValidations(selectedVersion?.snapshotId), loadTemplates(), loadDiff(selectedVersion?.snapshotId)]);
  const locked = isLocked(selectedVersion?.snapshotStatus);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">规则治理</p><h1 className="title">{project.name} · 规则治理中心</h1><p className="subtitle">集中管理版本规则编辑、锁定、日志、差异、回滚、发布、校验、适用范围和测算规则读取。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/version-snapshot-generator`} className="btn">版本快照生成</Link><Link href={`/projects/${project.id}/version-rule-snapshots`} className="btn btn-primary">版本规则快照</Link></div></div>
    {searchParams?.error === 'locked' ? <section className="card" style={{ marginBottom: 14, background: '#fff5f5', borderColor: '#ffc9c9' }}><b style={{ color: '#c92a2a' }}>当前版本规则已锁定，不能编辑或回滚。</b></section> : null}
    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">当前版本</div><div className="stat-value">{selectedVersion?.name || '-'}</div><div className="meta">{selectedVersion?.stage || '未设置阶段'}</div></div><div className="stat"><div className="stat-label">规则状态</div><div className="stat-value">{locked ? '已锁定' : '可编辑'}</div><div className="meta">版本快照</div></div><div className="stat"><div className="stat-label">引擎读取规则</div><div className="stat-value">{engine?.rules.length || 0}</div><div className="meta">优先版本快照</div></div><div className="stat"><div className="stat-label">差异规则</div><div className="stat-value">{diff.changedRules}</div><div className="meta">版本 vs 项目</div></div></div>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>版本选择 / 锁定 / 校验 / 回滚</h2><div style={{ display: 'grid', gap: 10 }}>{versions.map((version) => <div key={version.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}><div><Link href={`/projects/${project.id}/rule-governance-center?versionId=${version.id}`}><b>{version.name}</b></Link><p className="meta" style={{ margin: '4px 0 0' }}>模板 {version.sourceTemplateCode || '-'} / 快照 {version.snapshotId ? '已生成' : '未生成'} / 规则 {version.ruleCount} / 状态 {version.snapshotStatus || '-'}</p></div>{version.snapshotId ? <div style={{ display: 'flex', gap: 6 }}><form action={changeVersionLock}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={version.id}/><input type="hidden" name="action" value={isLocked(version.snapshotStatus) ? 'unlock' : 'lock'}/><button className="btn" type="submit">{isLocked(version.snapshotStatus) ? '解锁' : '锁定'}</button></form><form action={validateVersionRules}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={version.id}/><button className="btn" type="submit">校验</button></form><form action={rollbackVersionSnapshot}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={version.id}/><button className="btn" type="submit" disabled={isLocked(version.snapshotStatus)}>回滚/重建</button></form></div> : <Link className="btn" href={`/projects/${project.id}/version-snapshot-generator`}>生成快照</Link>}</div>)}</div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>版本规则编辑</h2><p className="meta">只展示前 30 条规则。锁定后禁止修改。</p><div style={{ display: 'grid', gap: 12, marginTop: 10 }}>{rules.map((rule) => <form key={rule.id} action={updateVersionRule} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fff' }}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={selectedVersion?.id || ''}/><input type="hidden" name="ruleId" value={rule.id}/><b>{rule.subjectCode} {rule.subjectName}</b><span className="meta"> / {rule.ruleType} / {rule.applicableStage} / {rule.precisionLevel}</span><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8, marginTop: 8 }}>{['quantityFormula','unitPriceSource','amountFormula','allocationMethod','vatTreatment','landVatTreatment','incomeTaxTreatment','editRemark'].map((field) => <label key={field}><div className="meta">{field}</div><textarea name={field} defaultValue={String((rule as any)[field] || '')} rows={2} disabled={locked} style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }}/></label>)}</div><div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><button className="btn btn-primary" type="submit" disabled={locked}>保存规则</button></div></form>)}</div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>快照差异对比</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}><div><div className="meta">已变更规则</div><b>{diff.changedRules}</b></div><div><div className="meta">版本缺少</div><b>{diff.missingInVersion}</b></div><div><div className="meta">版本多出</div><b>{diff.extraInVersion}</b></div></div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>公式校验结果</h2>{validations.length ? <div style={{ display: 'grid', gap: 8 }}>{validations.map((item) => <div key={item.id} style={{ borderBottom: '1px solid #edf2f7', paddingBottom: 8 }}><b>{item.severity}</b> <span>{item.checkName}</span><p className="meta" style={{ margin: '4px 0 0' }}>{item.ruleType || '-'} {item.subjectCode || '-'}：{item.message}</p></div>)}</div> : <p className="meta">暂无校验结果，可点击上方“校验”。</p>}</section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>模板发布机制 / 适用范围</h2><div style={{ display: 'grid', gap: 10 }}>{templates.map((tpl) => <form key={tpl.code} action={updateTemplateStatus} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 90px', gap: 10, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="templateCode" value={tpl.code}/><div><b>{tpl.name}</b><p className="meta" style={{ margin: '4px 0 0' }}>{tpl.code} / {tpl.developmentType} / {tpl.version} / 启用：{boolText(tpl.isActive)} / {tpl.scopeText || '未配置适用范围'}</p></div><select name="publishStatus" defaultValue={tpl.publishStatus} style={{ border: '1px solid #d8e0ea', borderRadius: 8, padding: 8 }}><option value="draft">草稿</option><option value="published">已发布</option><option value="disabled">停用</option><option value="archived">归档</option></select><button className="btn" type="submit">保存</button></form>)}</div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>测算引擎读取预览</h2><p className="meta">当前版本规则来源：{engine?.snapshotId || '无版本快照'}；测算引擎应优先读取 VersionUnifiedRuleSnapshot，再回退到项目快照/模板。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}><thead><tr style={{ background: '#f1f5f9' }}>{['科目','阶段','精度','工程量公式','金额公式'].map((h)=><th key={h} style={{ textAlign: 'left', padding: 8 }}>{h}</th>)}</tr></thead><tbody>{(engine?.rules || []).slice(0, 12).map((rule)=><tr key={rule.id}><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{rule.subjectCode} {rule.subjectName}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{rule.applicableStage}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{rule.precisionLevel}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{rule.quantityFormula || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{rule.amountFormula || '-'}</td></tr>)}</tbody></table></div></section>

    <section className="card"><h2 style={{ marginTop: 0 }}>规则变更记录</h2>{logs.length ? <div style={{ display: 'grid', gap: 8 }}>{logs.map((log) => <div key={log.id} style={{ borderBottom: '1px solid #edf2f7', paddingBottom: 8 }}><b>{log.changeType}</b> <span className="meta">{log.scopeType} / {log.fieldName || '-'} / {new Date(log.createdAt).toLocaleString('zh-CN')}</span><p className="meta" style={{ margin: '4px 0 0' }}>{log.beforeValue || '-'} → {log.afterValue || '-'}；{log.remark || ''}</p></div>)}</div> : <p className="meta">暂无变更记录。</p>}</section>
  </div></main>;
}
