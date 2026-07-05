import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { EmptyState, StatusNotice, VersionContextBar } from '@/components/commercial-status';
import { RefreshSubmitButton } from '@/components/refresh-submit-button';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';

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

type CostLinePreview = {
  id: string;
  costSubject: { code: string; name: string };
  productType: { name: string } | null;
  detailName: string;
  professionalGroup: string | null;
  regionOrProductType: string | null;
  measureBasis: string | null;
  quantity: unknown;
  unit: string | null;
  taxInclusiveUnitPrice: unknown;
  taxRate: unknown;
  taxInclusiveAmount: unknown;
  taxExclusiveAmount: unknown;
  taxAmount: unknown;
  quantityOverride: boolean;
  importBatchId: string | null;
  measureValue: unknown;
  coefficient: unknown;
  remark: string | null;
};

function num(value: unknown) { return Number(value || 0); }
function fmt(value: unknown) { return num(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function unitCost(amountWan: number, area: number) { return area ? amountWan * 10000 / area : 0; }
function subjectLevel(code: string) { return code ? code.split('.').filter(Boolean).length || Math.ceil(code.length / 2) : 0; }
function subjectIndent(code: string) { return Math.max(0, subjectLevel(code) - 1) * 18; }
function round2(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function quantityMode(line: CostLinePreview) { return line.quantityOverride ? (line.importBatchId ? 'excel_imported' : 'manual_entered') : 'auto_calculated'; }
function quantityModeLabel(mode: string) {
  return { auto_calculated: '系统推算', manual_entered: '手算输入', excel_imported: 'Excel 导入', drawing_measured: '图纸算量', locked_confirmed: '锁定确认' }[mode] || mode;
}
function priceSource(line: CostLinePreview) {
  if (line.importBatchId) return 'excel_imported';
  if (line.quantityOverride) return 'user_project_manual';
  return 'system_default';
}
function priceSourceLabel(source: string) {
  return { system_default: '系统默认', region_price_library: '地区价格库', user_project_manual: '项目手工', historical_project: '历史项目', excel_imported: 'Excel 导入', contract_price: '合同价', market_inquiry: '市场询价', supplier_quote: '供应商报价' }[source] || source;
}
function calculatedQuantity(line: CostLinePreview) { return round2(num(line.measureValue) * (num(line.coefficient) || 1)); }
function overrideNotice(mode: string) {
  if (mode === 'manual_entered') return '当前工程量已手算覆盖，后续含量变化不会自动覆盖 finalQuantity';
  if (mode === 'auto_calculated') return '当前工程量由基础指标 × 含量自动推算';
  if (mode === 'locked_confirmed') return '当前工程量已锁定，不允许修改';
  return '按接口返回口径展示';
}

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
  const version = await prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, select: { status: true, isLocked: true } });
  if (!version || isVersionLocked(version) || version.isLocked) redirect(`/projects/${projectId}/costs-batch?locked=1`);
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
      AND NOT EXISTS (
        SELECT 1 FROM "ProductType" p
        WHERE p."projectVersionId"=$2
          AND p."isActive"=FALSE
          AND (
            d."areaBizType" = p."name"
            OR d."areaZone" = p."name"
            OR d."professionalGroup" = p."name"
            OR d."remark" LIKE '%' || p."name" || '%'
          )
      )
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
    select: { id: true, name: true, stage: true, status: true }
  });
  const locked = version ? isVersionLocked(version) : false;

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

  const costLinePreview: CostLinePreview[] = version ? await prisma.costLine.findMany({
    where: {
      projectVersionId: version.id,
      OR: [{ productTypeId: null }, { productType: { isActive: true } }]
    },
    include: { costSubject: { select: { code: true, name: true } }, productType: { select: { name: true } } },
    orderBy: [{ professionalGroup: 'asc' }, { sortOrder: 'asc' }, { detailName: 'asc' }],
    take: 80
  }) as CostLinePreview[] : [];

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
          <p className="subtitle">本页汇总各专业明细测算结果，形成目标成本科目树和目标成本汇总表。当前版本：{version?.name || '暂无版本'}。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href={`/projects/${project.id}/detail-calculation-results`} className="btn">查看明细测算结果</Link>
          <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">查看目标成本汇总表</Link>
          <Link href={`/projects/${project.id}/excel`} className="btn">导出 Excel</Link>
          <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
        </div>
      </div>

      <VersionContextBar projectName={project.name} versionName={version?.name} versionStatus={version?.status} editable={!locked} extra={[['明细结果行', detailCount], ['聚合科目', rows.length]]} />
      {searchParams?.aggregated ? <StatusNotice title="刷新已完成" tone="success">已从明细测算结果刷新目标成本测算表，并同步更新目标成本汇总表。当前页面展示的是本次刷新后的聚合结果。</StatusNotice> : null}
      {searchParams?.missing ? <StatusNotice title="缺少刷新上下文" tone="warning">当前项目或版本信息不完整，未执行刷新。请确认已选择有效测算版本后再操作。</StatusNotice> : null}
      {searchParams?.locked ? <StatusNotice title="当前版本已锁定" tone="warning">当前版本已锁定，仅支持查看。如需调整数据，请复制为新版本后编辑。</StatusNotice> : null}

      <StatusNotice title="数据流说明">版本规则快照 → 各专业明细页计算 → 本页汇总 → 目标成本汇总表展示经营结果。刷新前，本页保留上一次聚合结果；刷新完成后会显示成功提示。</StatusNotice>

      <div className="summary-strip" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="stat-label">明细结果行</div><div className="stat-value">{detailCount}</div></div>
        <div className="stat"><div className="stat-label">含税目标成本（万元）</div><div className="stat-value">{fmt(total)}</div></div>
        <div className="stat"><div className="stat-label">建面单方（元/㎡）</div><div className="stat-value">{fmt(unitCost(total, buildingArea))}</div></div>
        <div className="stat"><div className="stat-label">可售单方（元/㎡）</div><div className="stat-value">{fmt(unitCost(total, saleableArea))}</div></div>
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>重新生成目标成本测算表</h2>
            <p className="meta" style={{ margin: '6px 0 0' }}>从明细测算结果汇总到目标成本测算表，并同步刷新目标成本汇总表。刷新完成前，页面仍展示上一次结果。</p>
          </div>
          {version ? <form action={refreshTargetCostFromDetails}><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="versionId" value={version.id} /><RefreshSubmitButton pendingText="正在生成" disabled={locked}>重新生成目标成本测算表</RefreshSubmitButton></form> : null}
        </div>
        {locked ? <p className="meta" style={{ margin: '10px 0 0', color: '#c92a2a' }}>当前版本已锁定，目标成本刷新操作只读禁用。</p> : null}
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2>一级科目成本看板</h2>
        {rows.length === 0 ? <EmptyState title="当前目标成本测算表尚未聚合">当前目标成本测算表尚未聚合，暂不能形成成本汇总。请先保存成本明细并生成明细测算结果，再点击“重新生成目标成本测算表”。</EmptyState> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 12 }}>
          {levelOneRows.map((row) => <div key={row.subjectCode} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#fbfdff' }}><b>{row.subjectCode} {row.subjectName}</b><div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{fmt(row.taxInclusiveAmount)}</div><div className="meta">万元｜占比 {total ? fmt(Number(row.taxInclusiveAmount) / total * 100) : '0'}%</div><div className="meta">建面 {fmt(unitCost(Number(row.taxInclusiveAmount), buildingArea))} 元/㎡</div><div className="meta">可售 {fmt(unitCost(Number(row.taxInclusiveAmount), saleableArea))} 元/㎡</div></div>)}
        </div>}
      </section>

      <section className="card">
        <h2>目标成本测算表</h2>
        <p className="meta">金额单位：万元。该表只做汇总，不直接手工测算。</p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead><tr>{['科目编码', '科目名称', '层级', '测算依据', '工程量', '单位', '含税单价', '税率', '不含税金额', '税额', '含税金额', '建面单方', '可售单方', '业态列', '来源'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', background: '#f8fafc', color: '#667085' }}>{head}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.subjectCode}>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{row.subjectCode}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', paddingLeft: 10 + subjectIndent(row.subjectCode) }}>{row.subjectName}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>L{row.subjectLevel || subjectLevel(row.subjectCode)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{row.ruleType || '明细汇总'}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>-</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>-</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>-</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>-</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.taxExclusiveAmount)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.taxAmount)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right', fontWeight: 900 }}>{fmt(row.taxInclusiveAmount)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.buildingAreaUnitCost || unitCost(Number(row.taxInclusiveAmount), buildingArea))}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', textAlign: 'right' }}>{fmt(row.saleableAreaUnitCost || unitCost(Number(row.taxInclusiveAmount), saleableArea))}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>全项目</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>明细页汇总</td>
            </tr>)}</tbody>
            <tfoot><tr><td colSpan={8} style={{ padding: 10, fontWeight: 900 }}>合计</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(totalExclusive)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(totalTax)}</td><td style={{ padding: 10, textAlign: 'right', fontWeight: 900 }}>{fmt(total)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(unitCost(total, buildingArea))}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmt(unitCost(total, saleableArea))}</td><td /><td /></tr></tfoot>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>目标成本量价额明细预览</h2>
        <p className="meta">金额单位：万元；工程量和含税单价来自专业明细页，本区用于复核量价额和手算覆盖状态。</p>
        {costLinePreview.length === 0 ? <EmptyState title="当前尚未生成目标成本明细">请先保存成本明细，再点击“生成明细测算结果”。形成成本行后，本区会展示工程量、单价、含税金额和手算覆盖状态。</EmptyState> : <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1680, fontSize: 12 }}>
            <thead><tr>{['科目', '对象 / 依据', '系统计算工程量', '生效工程量', '含税单价', '单价来源', '税率', '含税金额', '不含税 / 税额', '工程量来源', '手算覆盖状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', background: '#f8fafc', color: '#667085' }}>{head}</th>)}</tr></thead>
            <tbody>{costLinePreview.map((line) => {
              const mode = quantityMode(line);
              const source = priceSource(line);
              return <tr key={line.id} style={line.quantityOverride ? { background: '#fffaf0' } : undefined}>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{line.costSubject.code} {line.costSubject.name}<div className="meta">{line.detailName}</div></td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{line.productType?.name || line.regionOrProductType || '全项目'}<div className="meta">{line.measureBasis || '未配置基础指标绑定'}</div></td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{fmt(calculatedQuantity(line))} {line.unit || ''}<div className="meta">基础指标 {fmt(line.measureValue)} x 含量 {fmt(line.coefficient || 1)}</div></td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{fmt(line.quantity)} {line.unit || ''}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{fmt(line.taxInclusiveUnitPrice)}<div className="meta">{line.unit ? `元/${line.unit}` : '按后端返回'}</div></td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{priceSourceLabel(source)}<div className="meta">{source}</div></td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{fmt(num(line.taxRate) * 100)}%</td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{fmt(line.taxInclusiveAmount)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{fmt(line.taxExclusiveAmount)} / {fmt(line.taxAmount)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{quantityModeLabel(mode)}<div className="meta">{mode}</div></td>
                <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{line.quantityOverride ? '已手算覆盖' : '未覆盖'}<div className="meta" style={{ maxWidth: 260 }}>{line.quantityOverride ? (line.remark || overrideNotice(mode)) : overrideNotice(mode)}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>}
      </section>
    </div>
  </main>;
}
