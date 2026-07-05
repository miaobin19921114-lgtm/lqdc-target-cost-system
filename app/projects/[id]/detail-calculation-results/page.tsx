import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { aggregateTargetCostFromDetails, generateDetailResultsFromVersionRules } from '@/lib/rule-engine/detail-result-generator';
import { isVersionLocked } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const DETAIL_TYPES = [
  ['land', '土地费用明细表'],
  ['pre-costs', '前期费用明细表'],
  ['building-details', '土建明细表'],
  ['installation-details', '安装明细表'],
  ['equipment-details', '设备明细表'],
  ['fitout-details', '精装修明细表'],
  ['outdoor-pipe-details', '室外管网明细表'],
  ['landscape-details', '景观工程明细表'],
  ['road-details', '道路总平明细表'],
  ['wall-gate-details', '围墙出入口明细表'],
] as const;

type VersionRow = { id: string; name: string; stage: string | null; status: string | null; isLocked: boolean | null; snapshotId: string | null; ruleCount: number };
type DetailStat = { detailType: string; rowCount: number; amountTaxIncluded: string | number | null; amountTaxExcluded: string | number | null; taxAmount: string | number | null };
type DetailRow = { id: string; detailType: string; subjectCode: string; subjectName: string; majorSubjectName: string | null; measureBasis: string | null; quantityFormula: string | null; pricingUnit: string | null; unitPriceSource: string | null; taxInclusiveAmount: string | number; taxExclusiveAmount: string | number; taxAmount: string | number; remark: string | null };
type AggregateRow = { subjectCode: string; subjectName: string; taxInclusiveAmount: string | number; taxExclusiveAmount: string | number; taxAmount: string | number };

function valueOf(formData: FormData, name: string) { return String(formData.get(name) || '').trim(); }
function money(value: string | number | null | undefined) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }

async function generateOneDetail(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const detailType = valueOf(formData, 'detailType');
  if (!projectId || !versionId || !detailType) redirect(projectId ? `/projects/${projectId}/detail-calculation-results` : '/');
  const version = await prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, select: { status: true, isLocked: true } });
  if (!version || isVersionLocked(version) || version.isLocked) redirect(`/projects/${projectId}/detail-calculation-results?versionId=${encodeURIComponent(versionId)}&locked=1`);
  const result = await generateDetailResultsFromVersionRules(projectId, versionId, detailType);
  await aggregateTargetCostFromDetails(projectId, versionId);
  revalidatePath(`/projects/${projectId}/detail-calculation-results`);
  revalidatePath(`/projects/${projectId}/costs-batch`);
  revalidatePath(`/projects/${projectId}/summary`);
  redirect(`/projects/${projectId}/detail-calculation-results?versionId=${encodeURIComponent(versionId)}&generated=${encodeURIComponent(`${detailType}:${result.generatedRows}`)}`);
}

async function generateAllDetails(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  if (!projectId || !versionId) redirect(projectId ? `/projects/${projectId}/detail-calculation-results` : '/');
  const version = await prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, select: { status: true, isLocked: true } });
  if (!version || isVersionLocked(version) || version.isLocked) redirect(`/projects/${projectId}/detail-calculation-results?versionId=${encodeURIComponent(versionId)}&locked=1`);
  let total = 0;
  for (const [detailType] of DETAIL_TYPES) {
    const result = await generateDetailResultsFromVersionRules(projectId, versionId, detailType);
    total += result.generatedRows;
  }
  await aggregateTargetCostFromDetails(projectId, versionId);
  revalidatePath(`/projects/${projectId}/detail-calculation-results`);
  revalidatePath(`/projects/${projectId}/costs-batch`);
  revalidatePath(`/projects/${projectId}/summary`);
  redirect(`/projects/${projectId}/detail-calculation-results?versionId=${encodeURIComponent(versionId)}&generated=${encodeURIComponent(`all:${total}`)}`);
}

async function loadVersions(projectId: string) {
  return prisma.$queryRawUnsafe<VersionRow[]>(`
    SELECT pv."id", pv."name", pv."stage", pv."status", pv."isLocked", vrs."id" AS "snapshotId", COALESCE(r."ruleCount", 0)::int AS "ruleCount"
    FROM "ProjectVersion" pv
    LEFT JOIN "VersionRuleSnapshot" vrs ON vrs."versionId"=pv."id"
    LEFT JOIN (SELECT "snapshotId", COUNT(*) AS "ruleCount" FROM "VersionUnifiedRuleSnapshot" GROUP BY "snapshotId") r ON r."snapshotId"=vrs."id"
    WHERE pv."projectId"=$1
    ORDER BY pv."createdAt" DESC
  `, projectId).catch(() => []);
}

async function loadDetailStats(projectId: string, versionId?: string) {
  if (!versionId) return [];
  return prisma.$queryRawUnsafe<DetailStat[]>(`
    SELECT "detailType", COUNT(*)::int AS "rowCount", SUM("taxInclusiveAmount") AS "amountTaxIncluded", SUM("taxExclusiveAmount") AS "amountTaxExcluded", SUM("taxAmount") AS "taxAmount"
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2
    GROUP BY "detailType"
    ORDER BY "detailType"
  `, projectId, versionId).catch(() => []);
}

async function loadDetailRows(projectId: string, versionId?: string) {
  if (!versionId) return [];
  return prisma.$queryRawUnsafe<DetailRow[]>(`
    SELECT "id", "detailType", "subjectCode", "subjectName", "majorSubjectName", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "remark"
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "detailType" ASC, "subjectCode" ASC
    LIMIT 80
  `, projectId, versionId).catch(() => []);
}

async function loadAggregates(projectId: string, versionId?: string) {
  if (!versionId) return [];
  return prisma.$queryRawUnsafe<AggregateRow[]>(`
    SELECT "subjectCode", "subjectName", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount"
    FROM "TargetCostSummaryAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "subjectCode" ASC
  `, projectId, versionId).catch(() => []);
}

export default async function DetailCalculationResultsPage({ params, searchParams }: { params: { id: string }; searchParams?: { versionId?: string; generated?: string; locked?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const versions = await loadVersions(project.id);
  const selectedVersion = versions.find((item) => item.id === searchParams?.versionId) || versions.find((item) => item.snapshotId) || versions[0];
  const [stats, rows, aggregates] = await Promise.all([
    loadDetailStats(project.id, selectedVersion?.id),
    loadDetailRows(project.id, selectedVersion?.id),
    loadAggregates(project.id, selectedVersion?.id),
  ]);
  const statMap = new Map(stats.map((item) => [item.detailType, item]));
  const selectedLocked = selectedVersion ? isVersionLocked(selectedVersion) || Boolean(selectedVersion.isLocked) : false;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">目标成本测算表</p>
        <h1 className="title">明细测算结果</h1>
        <p className="subtitle">各专业明细保存后，可在本页生成明细测算结果，并汇总至目标成本测算表和目标成本汇总表。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">查看目标成本测算表</Link>
        <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
      </div>
    </div>

    {searchParams?.generated ? <section className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#ebfbee' }}><b style={{ color: '#2b8a3e' }}>已生成：{searchParams.generated}</b></section> : null}
    {searchParams?.locked ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}><b>当前版本已锁定，仅支持查看。如需调整数据，请复制为新版本后编辑。</b></section> : null}

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>选择测算版本</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{versions.map((version) => <Link key={version.id} className={selectedVersion?.id === version.id ? 'btn btn-primary' : 'btn'} href={`/projects/${project.id}/detail-calculation-results?versionId=${version.id}`}>{version.name}{version.snapshotId ? '' : '（无快照）'}</Link>)}</div>
      {!versions.length ? <p className="meta">当前尚未创建测算版本。请先在版本管理中创建项目版本，再生成明细测算结果。</p> : null}
    </section>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">当前版本</div><div className="stat-value">{selectedVersion?.name || '-'}</div><div className="meta">{selectedVersion?.stage || '未设置阶段'}</div></div>
      <div className="stat"><div className="stat-label">版本规则</div><div className="stat-value">{selectedVersion?.ruleCount || 0}</div><div className="meta">来自版本快照</div></div>
      <div className="stat"><div className="stat-label">明细行</div><div className="stat-value">{rows.length}</div><div className="meta">当前展示前80条</div></div>
      <div className="stat"><div className="stat-label">一级汇总</div><div className="stat-value">{aggregates.length}</div><div className="meta">目标成本汇总底表</div></div>
    </div>
    {selectedLocked ? <section className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>当前版本已锁定，仅支持查看。如需调整数据，请在版本管理中复制为新版本后编辑。</section> : null}

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>按专业明细页生成</h2>
      <form action={generateAllDetails} style={{ marginBottom: 12 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="versionId" value={selectedVersion?.id || ''} />
        <button className="btn btn-primary" type="submit" disabled={!selectedVersion?.snapshotId || selectedLocked} title={selectedLocked ? '当前版本已锁定，仅支持查看。' : undefined}>一键生成全部明细页结果并汇总</button>
        {!selectedVersion?.snapshotId ? <span className="meta" style={{ marginLeft: 10 }}>当前版本没有规则快照，请先生成版本快照。</span> : null}
      </form>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
        {DETAIL_TYPES.map(([detailType, label]) => {
          const stat = statMap.get(detailType);
          return <form key={detailType} action={generateOneDetail} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="versionId" value={selectedVersion?.id || ''} />
            <input type="hidden" name="detailType" value={detailType} />
            <b>{label}</b>
            <p className="meta" style={{ margin: '6px 0' }}>行数 {stat?.rowCount || 0} / 含税 {money(stat?.amountTaxIncluded)} / 不含税 {money(stat?.amountTaxExcluded)}</p>
            <button className="btn" type="submit" disabled={!selectedVersion?.snapshotId || selectedLocked} title={selectedLocked ? '当前版本已锁定，仅支持查看。' : undefined}>生成/刷新</button>
          </form>;
        })}
      </div>
    </section>

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>目标成本汇总底表</h2>
      <p className="meta">这个表来自明细结果自动汇总，目标成本测算表读取它，目标成本汇总表再读取目标成本测算表。</p>
      {aggregates.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}><thead><tr style={{ background: '#f1f5f9' }}>{['科目编码','科目名称','含税金额','不含税金额','税额'].map((h)=><th key={h} style={{ textAlign: 'left', padding: 8 }}>{h}</th>)}</tr></thead><tbody>{aggregates.map((item)=><tr key={item.subjectCode}><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}><b>{item.subjectCode}</b></td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{item.subjectName}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{money(item.taxInclusiveAmount)}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{money(item.taxExclusiveAmount)}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{money(item.taxAmount)}</td></tr>)}</tbody></table></div> : <p className="meta">当前尚未生成明细测算结果。请先保存成本明细，再点击“生成/刷新”或“一键生成全部明细页结果并汇总”。</p>}
    </section>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>明细测算结果预览</h2>
      {rows.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}><thead><tr style={{ background: '#f1f5f9' }}>{['明细页','一级科目','科目编码','科目名称','测算依据','工程量公式','计价单位','单价来源','含税金额','备注'].map((h)=><th key={h} style={{ textAlign: 'left', padding: 8 }}>{h}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.detailType}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.majorSubjectName || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}><b>{row.subjectCode}</b></td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.subjectName}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.measureBasis || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.quantityFormula || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.pricingUnit || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.unitPriceSource || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{money(row.taxInclusiveAmount)}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.remark || '-'}</td></tr>)}</tbody></table></div> : <p className="meta">当前没有可预览的明细测算结果。请先保存专业成本明细，并在上方生成明细测算结果。</p>}
    </section>
  </div></main>;
}
