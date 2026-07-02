import Link from 'next/link';
import { EmptyState, StatusNotice, VersionContextBar } from '@/components/commercial-status';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';
import { getProjectVersionRevenueLines } from '@/lib/project-version-revenue-lines';
import { fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

type SummaryAggregateRow = {
  subjectCode: string;
  subjectName: string;
  summaryLevel: number;
  taxInclusiveAmount: string;
  taxExclusiveAmount: string;
  taxAmount: string;
  buildingAreaUnitCost: string | null;
  saleableAreaUnitCost: string | null;
};

type MeasureAggregateRow = {
  subjectCode: string;
  subjectName: string;
  taxInclusiveAmount: string;
  taxExclusiveAmount: string;
  taxAmount: string;
};

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function unitPriceWan(amountWan: number, area: number) { return area ? amountWan * 10000 / area : 0; }
function warningText(amount: number, total: number, buildingArea: number, saleableArea: number) {
  if (!amount) return '待补数据';
  if (!buildingArea || !saleableArea) return '缺面积';
  if (total && amount / total > 0.35) return '占比较高';
  return '正常';
}
function warningColor(text: string) { return text === '正常' ? '#2f9e44' : text === '占比较高' ? '#f08c00' : '#e03131'; }
function detailHref(projectId: string, row: { subjectName: string }) {
  const text = row.subjectName;
  const rules: Array<[RegExp, string]> = [
    [/土地/, 'land'], [/前期|设计|报批|勘察|测绘|三通一平/, 'pre-costs'], [/土建|建筑|结构|主体|桩基|地下室|门窗|防水/, 'building-details'],
    [/安装|给排水|电气|暖通|消防|弱电/, 'installation-details'], [/设备|电梯|充电桩|人防|立体车库/, 'equipment-details'], [/精装|装修|大堂/, 'fitout-details'],
    [/管网|室外管网|综合管线/, 'outdoor-pipe-details'], [/景观|绿化|硬景|软景/, 'landscape-details'], [/道路|总平|交安|标识/, 'road-details'],
    [/围墙|出入口|临设/, 'wall-gate-details'], [/销售|营销|示范区|包装/, 'sales-expense-details'], [/管理|行政|开发间接/, 'admin-expense-details'],
    [/财务|利息|融资/, 'finance-expense-details'], [/税|增值税|所得税|土地增值税/, 'tax-details']
  ];
  return `/projects/${projectId}/${rules.find(([regex]) => regex.test(text))?.[1] || 'costs-batch'}`;
}

export default async function TargetCostSummaryPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } } }
  });
  const locked = version ? isVersionLocked(version) : false;
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(version?.id);

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const allProducts = version?.products || [];
  const activeProducts = allProducts.filter((item) => item.isActive);
  const disabledProductCount = allProducts.length - activeProducts.length;
  const revenue = revenueFromProjectData({ products: allProducts, revenues: version?.revenues || [], commercialRevenueLines, otherRevenueLines, vatRate });

  const summaryRows = version ? await prisma.$queryRawUnsafe<SummaryAggregateRow[]>(`
    SELECT "subjectCode", "subjectName", "summaryLevel", "taxInclusiveAmount"::text, "taxExclusiveAmount"::text, "taxAmount"::text,
           "buildingAreaUnitCost"::text, "saleableAreaUnitCost"::text
    FROM "TargetCostSummaryAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "subjectCode" ASC
  `, project.id, version.id).catch(() => []) : [];

  const measureRows = version ? await prisma.$queryRawUnsafe<MeasureAggregateRow[]>(`
    SELECT "subjectCode", "subjectName", "taxInclusiveAmount"::text, "taxExclusiveAmount"::text, "taxAmount"::text
    FROM "TargetCostMeasureAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "subjectCode" ASC
  `, project.id, version.id).catch(() => []) : [];

  const costTaxInclusive = summaryRows.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const costTaxExclusive = summaryRows.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const costTaxAmount = summaryRows.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const landCost = summaryRows.filter((row) => row.subjectCode === '01').reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const devCost = summaryRows.filter((row) => !['09', '10', '12'].includes(row.subjectCode)).reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const saleManageFinance = summaryRows.filter((row) => ['08', '09', '10'].includes(row.subjectCode)).reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: costTaxAmount, costExclusive: costTaxExclusive, landCost, devCost, saleManageFinance, surchargeRate, incomeTaxRate });

  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const buildingUnitCost = unitPriceWan(costTaxInclusive, buildingArea);
  const saleableUnitCost = unitPriceWan(costTaxInclusive, saleableArea);
  const preTaxMargin = revenue.taxInclusive ? tax.profitBeforeIncomeTax / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;

  const metrics: Array<[string, number, 'money' | 'percent']> = [
    ['总收入（含税）', revenue.taxInclusive, 'money'],
    ['其中：销售收入', revenue.ordinary.taxInclusive, 'money'],
    ['其中：商业专项收入', revenue.commercial.taxInclusive, 'money'],
    ['其中：车位收入', revenue.parking.taxInclusive, 'money'],
    ['其中：其他收入', revenue.other.taxInclusive, 'money'],
    ['总收入（不含税）', revenue.taxExclusive, 'money'],
    ['开发成本及费用合计（含税，明细汇总）', costTaxInclusive, 'money'],
    ['开发成本及费用合计（不含税，明细汇总）', costTaxExclusive, 'money'],
    ['销项税额', revenue.outputVat, 'money'],
    ['进项税额（明细汇总）', costTaxAmount, 'money'],
    ['应缴增值税', tax.payableVat, 'money'],
    ['附加税费', tax.surcharge, 'money'],
    ['土地增值税', tax.landVat.landVat, 'money'],
    ['税前经营利润', tax.profitBeforeIncomeTax, 'money'],
    ['税前销售利润率', preTaxMargin, 'percent'],
    [`所得税（${pct(incomeTaxRate)}）`, tax.incomeTax, 'money'],
    ['税后净利', tax.netProfit, 'money'],
    ['销售净利率', netMargin, 'percent']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">目标成本汇总表</p><h1 className="title">{project.name}</h1><p className="subtitle">本页读取目标成本测算表聚合结果，不直接读取专业明细或手工成本行。金额单位统一为万元，单方统一为元/㎡。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue-summary`} className="btn">收入汇总</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}/summary-check`} className="btn">汇总联动校验</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本测算表</Link><Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link></div></div>

    <VersionContextBar projectName={project.name} versionName={version?.name} versionStatus={version?.status} editable={!locked} extra={[['启用业态', activeProducts.length], ['已停用业态', disabledProductCount]]} />
    {disabledProductCount > 0 ? <StatusNotice title="已按启用业态口径展示" tone="warning">当前版本有 {disabledProductCount} 个停用业态，收入、成本和利润相关结果均按启用业态过滤后的结果展示。</StatusNotice> : null}
    {summaryRows.length === 0 ? <StatusNotice title="暂无目标成本汇总结果" tone="warning">请先进入“目标成本测算表”，从明细测算结果刷新聚合数据。刷新完成后，本页会展示最新的一级成本与经营指标。</StatusNotice> : null}

    <div className="summary-strip"><div className="stat"><div className="stat-label">总收入（含税，万元）</div><div className="stat-value">{fmt(revenue.taxInclusive)}</div></div><div className="stat"><div className="stat-label">目标成本（含税，万元）</div><div className="stat-value">{fmt(costTaxInclusive)}</div></div><div className="stat"><div className="stat-label">建面单方 / 可售单方（元/㎡）</div><div className="stat-value">{fmt(buildingUnitCost)} / {fmt(saleableUnitCost)}</div></div><div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value">{pct(netMargin)}</div></div></div>

    <section className="card" style={{ marginBottom: 18 }}><h2>所得税前 / 所得税后经营指标</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}><tbody>{metrics.map(([name, value, unit]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{unit === 'percent' ? pct(value) : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{unit === 'percent' ? '' : '万元'}</td></tr>)}</tbody></table></div></section>

    <section className="card" style={{ marginBottom: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0 }}>成本汇总（一级科目）</h2><p className="meta" style={{ margin: '6px 0 0' }}>来源：TargetCostSummaryAggregate，由目标成本测算表从明细结果汇总生成。</p></div><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">进入目标成本测算表</Link></div>{summaryRows.length === 0 ? <div style={{ marginTop: 12 }}><EmptyState title="尚未形成聚合结果">当前页面没有可展示的一级成本汇总。完成专业明细测算后，请到目标成本测算表执行刷新。</EmptyState></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>{summaryRows.map((row) => { const amount = Number(row.taxInclusiveAmount || 0); const groupWarning = warningText(amount, costTaxInclusive, buildingArea, saleableArea); return <details key={row.subjectCode} open style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}><summary style={{ cursor: 'pointer', listStyle: 'none', padding: 12, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 90px 130px 110px 110px 100px 110px', gap: 10, alignItems: 'center' }}><b>{row.subjectCode} {row.subjectName}</b><span className="meta">一级</span><span style={{ textAlign: 'right', fontWeight: 900 }}>{fmt(row.taxInclusiveAmount)}</span><span style={{ textAlign: 'right' }}>{fmt(row.buildingAreaUnitCost || unitPriceWan(amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(row.saleableAreaUnitCost || unitPriceWan(amount, saleableArea))}</span><span style={{ color: warningColor(groupWarning), fontWeight: 900 }}>{groupWarning}</span><Link href={detailHref(project.id, row)} style={{ color: '#0b7285', textAlign: 'right' }}>看明细</Link></summary><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}><thead><tr>{['测算科目', '含税成本(万元)', '不含税成本(万元)', '税额(万元)', '建面单方', '可售单方'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{measureRows.filter((child) => child.subjectCode === row.subjectCode || child.subjectCode.startsWith(`${row.subjectCode}.`) || (!child.subjectCode.includes('.') && child.subjectCode.startsWith(row.subjectCode))).map((child) => <tr key={child.subjectCode}><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{child.subjectCode} {child.subjectName}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(child.taxInclusiveAmount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(child.taxExclusiveAmount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(child.taxAmount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(unitPriceWan(Number(child.taxInclusiveAmount || 0), buildingArea))}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(unitPriceWan(Number(child.taxInclusiveAmount || 0), saleableArea))}</td></tr>)}</tbody></table></div></details>; })}</div>}</section>
  </div></main>;
}
