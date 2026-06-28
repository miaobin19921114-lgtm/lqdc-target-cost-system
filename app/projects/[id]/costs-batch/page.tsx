import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

type AggregateRow = {
  subjectCode: string;
  subjectName: string;
  ruleType: string;
  subjectLevel: number;
  subjectPath: string | null;
  taxInclusiveAmount: string;
  taxExclusiveAmount: string;
  taxAmount: string;
  buildingAreaUnitCost: string | null;
  saleableAreaUnitCost: string | null;
};

function num(value: unknown) { return Number(value || 0); }
function fmt(value: unknown) { return num(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function unitCost(amountWan: number, area: number) { return area ? amountWan * 10000 / area : 0; }
function subjectLevel(code: string) { return code ? code.split('.').filter(Boolean).length || Math.ceil(code.length / 2) : 0; }
function subjectIndent(code: string) { return Math.max(0, subjectLevel(code) - 1) * 18; }

const SUBJECT_NAMES: Record<string, string> = {
  '01': '土地费',
  '02': '前期工程费',
  '03': '建安工程费',
  '04': '室外景观及配套',
  '05': '设备工程',
  '06': '精装修工程',
  '07': '咨询顾问费',
  '08': '开发间接费',
  '09': '营销费用',
  '10': '财务费用',
  '11': '预备费',
  '12': '税金'
};

function majorCode(code: string) {
  return code.includes('.') ? code.split('.')[0] : code.slice(0, 2);
}

async function refreshTargetCostFromDetails(formData: FormData) {
  'use server';
  const projectId = String(formData.get('projectId') || '').trim();
  const versionId = String(formData.get('versionId') || '').trim();
  if (!projectId || !versionId) redirect(`/projects/${projectId}/costs-batch?missing=1`);

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { totalBuildingArea: true, saleableArea: true } });
  const buildingArea = Number(project?.totalBuildingArea || 0);
  const saleableArea = Number(project?.saleableArea || 0);

  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostMeasureAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostMeasureAggregate" (
      "id", "projectId", "versionId", "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath",
      "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
    )
    SELECT
      'target-cost-' || $2 || '-' || d."subjectCode",
      $1,
      $2,
      d."subjectCode",
      MAX(d."subjectName"),
      MAX(d."ruleType"),
      CASE WHEN POSITION('.' IN d."subjectCode") > 0 THEN array_length(string_to_array(d."subjectCode", '.'), 1) ELSE CEIL(LENGTH(d."subjectCode")::numeric / 2)::int END,
      MAX(COALESCE(d."subjectPath", d."subjectCode" || ' ' || d."subjectName")),
      SUM(d."taxInclusiveAmount"),
      SUM(d."taxExclusiveAmount"),
      SUM(d."taxAmount"),
      CASE WHEN $3::numeric > 0 THEN SUM(d."taxInclusiveAmount") * 10000 / $3::numeric ELSE NULL END,
      CASE WHEN $4::numeric > 0 THEN SUM(d."taxInclusiveAmount") * 10000 / $4::numeric ELSE NULL END
    FROM "DetailCalculationResult" d
    WHERE d."projectId"=$1 AND d."versionId"=$2
    GROUP BY d."subjectCode"
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "subjectName"=EXCLUDED."subjectName",
      "ruleType"=EXCLUDED."ruleType",
      "subjectLevel"=EXCLUDED."subjectLevel",
      "subjectPath"=EXCLUDED."subjectPath",
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
      "taxAmount"=EXCLUDED."taxAmount",
      "buildingAreaUnitCost"=EXCLUDED."buildingAreaUnitCost",
      "saleableAreaUnitCost"=EXCLUDED."saleableAreaUnitCost",
      "updatedAt"=CURRENT_TIMESTAMP
  `, projectId, versionId, buildingArea, saleableArea);

  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostSummaryAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostSummaryAggregate" (
      "id", "projectId", "versionId", "subjectCode", "subjectName", "summaryLevel",
      "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
    )
    SELECT
      'target-summary-' || $2 || '-' || CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END,
      $1,
      $2,
      CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END,
      MAX(CASE CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END
        WHEN '01' THEN '土地费'
        WHEN '02' THEN '前期工程费'
        WHEN '03' THEN '建安工程费'
        WHEN '04' THEN '室外景观及配套'
        WHEN '05' THEN '设备工程'
        WHEN '06' THEN '精装修工程'
        WHEN '07' THEN '咨询顾问费'
        WHEN '08' THEN '开发间接费'
        WHEN '09' THEN '营销费用'
        WHEN '10' THEN '财务费用'
        WHEN '11' THEN '预备费'
        WHEN '12' THEN '税金'
        ELSE CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END END),
      1,
      SUM(a."taxInclusiveAmount"),
      SUM(a."taxExclusiveAmount"),
      SUM(a."taxAmount"),
      CASE WHEN $3::numeric > 0 THEN SUM(a."taxInclusiveAmount") * 10000 / $3::numeric ELSE NULL END,
      CASE WHEN $4::numeric > 0 THEN SUM(a."taxInclusiveAmount") * 10000 / $4::numeric ELSE NULL END
    FROM "TargetCostMeasureAggregate" a
    WHERE a."projectId"=$1 AND a."versionId"=$2
    GROUP BY CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "subjectName"=EXCLUDED."subjectName",
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
      "taxAmount"=EXCLUDED."taxAmount",
      "buildingAreaUnitCost"=EXCLUDED."buildingAreaUnitCost",
      "saleableAreaUnitCost"=EXCLUDED."saleableAreaUnitCost",
      "updatedAt"=CURRENT_TIMESTAMP
  `, projectId, versionId, buildingArea, saleableArea);

  revalidatePath(`/projects/${projectId}/costs-batch`);
  revalidatePath(`/projects/${projectId}/summary`);
  redirect(`/projects/${projectId}/costs-batch?aggregated=1`);
}

export default async function TargetCostBatchPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    select: { id: true, name: true, stage: true }
  });

  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  const detailCount = version ? await prisma.$queryRawUnsafe<Array<{ count: string }>>(`
    SELECT COUNT(*)::text AS count FROM "DetailCalculationResult" WHERE "projectId"=$1 AND "versionId"=$2
  `, project.id, version.id).then((rows) => Number(rows[0]?.count || 0)).catch(() => 0) : 0;

  const rows = version ? await prisma.$queryRawUnsafe<AggregateRow[]>(`
    SELECT "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath",
           "taxInclusiveAmount"::text, "taxExclusiveAmount"::text, "taxAmount"::text,
           "buildingAreaUnitCost"::text, "saleableAreaUnitCost"::text
    FROM "TargetCostMeasureAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "subjectCode" ASC
  `, project.id, version.id).catch(() => []) : [];

  const levelOneRows = rows.filter((row) => subjectLevel(row.subjectCode) <= 1 || Object.keys(SUBJECT_NAMES).includes(row.subjectCode));
  const total = rows.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = rows.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = rows.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);

  return <main className="page">
    <ProjectTopNav projectId={project.id} projectName={project.name} current="目标成本测算表" />
    <div className="container" style={{ maxWidth: 1680 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">目标成本测算表</p>
          <h1 className="title">{project.name}</h1>
          <p className="subtitle">本页不手算明细，只读取各专业明细页汇总后的 TargetCostMeasureAggregate。当前版本：{version?.name || '暂无版本'}。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href={`/projects/${project.id}/detail-rule-calculation`} className="btn">规则驱动明细测算</Link>
          <Link href={`/projects/${project.id}/detail-calculation-results`} className="btn">明细测算结果</Link>
          <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总表</Link>
          <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
        </div>
      </div>

      {searchParams?.aggregated ? <section className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}><b>已从明细测算结果刷新目标成本测算表。</b></section> : null}

      <section className="card" style={{ marginBottom: 12, borderColor: '#d0ebff', background: '#f8fbff' }}>
        <b>数据流说明</b>
        <p className="meta" style={{ margin: '6px 0 0' }}>版本规则快照 → 各专业明细页计算 → 本页自动汇总 → 目标成本汇总表自动展示经营结果。</p>
      </section>

      <div className="summary-strip" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="stat-label">明细结果行</div><div className="stat-value">{detailCount}</div></div>
        <div className="stat"><div className="stat-label">含税目标成本（万元）</div><div className="stat-value">{fmt(total)}</div></div>
        <div className="stat"><div className="stat-label">建面单方（元/㎡）</div><div className="stat-value">{fmt(unitCost(total, buildingArea))}</div></div>
        <div className="stat"><div className="stat-label">可售单方（元/㎡）</div><div className="stat-value">{fmt(unitCost(total, saleableArea))}</div></div>
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>刷新目标成本测算表</h2>
            <p className="meta" style={{ margin: '6px 0 0' }}>从 DetailCalculationResult 汇总到 TargetCostMeasureAggregate，并同步刷新 TargetCostSummaryAggregate。</p>
          </div>
          {version ? <form action={refreshTargetCostFromDetails}><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="versionId" value={version.id} /><button className="btn btn-primary">从明细结果刷新</button></form> : null}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2>一级科目成本看板</h2>
        {rows.length === 0 ? <p className="meta">暂无目标成本聚合数据。请先进入“规则驱动明细测算”生成明细行，录入工程量/单价后，再点击“从明细结果刷新”。</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 12 }}>
          {levelOneRows.map((row) => <div key={row.subjectCode} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#fbfdff' }}><b>{row.subjectCode} {row.subjectName}</b><div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{fmt(row.taxInclusiveAmount)}</div><div className="meta">万元｜占比 {total ? fmt(Number(row.taxInclusiveAmount) / total * 100) : '0'}%</div><div className="meta">建面 {fmt(unitCost(Number(row.taxInclusiveAmount), buildingArea))} 元/㎡</div><div className="meta">可售 {fmt(unitCost(Number(row.taxInclusiveAmount), saleableArea))} 元/㎡</div></div>)}
        </div>}
      </section>

      <section className="card">
        <h2>目标成本测算表</h2>
        <p className="meta">金额单位：万元。该表只做汇总，不直接手工测算。</p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead><tr>{['科目编码', '目标成本科目', '层级', '含税金额', '不含税金额', '税额', '建面单方', '可售单方', '来源'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', background: '#f8fafc', color: '#667085' }}>{head}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.subjectCode}>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{row.subjectCode}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', paddingLeft: 10 + subjectIndent(row.subjectCode) }}>{row.subjectName}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>L{row.subjectLevel || subjectLevel(row.subjectCode)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right', fontWeight: 900 }}>{fmt(row.taxInclusiveAmount)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.taxExclusiveAmount)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.taxAmount)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.buildingAreaUnitCost || unitCost(Number(row.taxInclusiveAmount), buildingArea))}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.saleableAreaUnitCost || unitCost(Number(row.taxInclusiveAmount), saleableArea))}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>明细页汇总</td>
            </tr>)}</tbody>
            <tfoot><tr><td colSpan={3} style={{ padding: 10, fontWeight: 900 }}>合计</td><td style={{ padding: 10, textAlign: 'right', fontWeight: 900 }}>{fmt(total)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(totalExclusive)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(totalTax)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(unitCost(total, buildingArea))}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(unitCost(total, saleableArea))}</td><td /></tr></tfoot>
          </table>
        </div>
      </section>
    </div>
  </main>;
}
