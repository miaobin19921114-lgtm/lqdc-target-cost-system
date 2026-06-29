import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function color(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function statusText(status: string) { if (status === 'locked') return '已锁定'; if (status === 'final') return '定稿'; return '草稿'; }

export default async function VersionComparePage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const versions = await prisma.projectVersion.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, revenues: { include: { productType: true } }, costs: { include: { productType: true, costSubject: true } }, taxes: true }
  });
  const versionIds = versions.map((version) => version.id);
  const [commercialRevenueLines, otherRevenueLines] = await Promise.all([
    prisma.commercialRevenueLine.findMany({ where: { projectVersionId: { in: versionIds } } }),
    prisma.otherRevenueLine.findMany({ where: { projectVersionId: { in: versionIds } } })
  ]);
  const commercialRevenueLinesByVersionId = new Map<string, typeof commercialRevenueLines>();
  for (const line of commercialRevenueLines) {
    const items = commercialRevenueLinesByVersionId.get(line.projectVersionId) || [];
    items.push(line);
    commercialRevenueLinesByVersionId.set(line.projectVersionId, items);
  }
  const otherRevenueLinesByVersionId = new Map<string, typeof otherRevenueLines>();
  for (const line of otherRevenueLines) {
    const items = otherRevenueLinesByVersionId.get(line.projectVersionId) || [];
    items.push(line);
    otherRevenueLinesByVersionId.set(line.projectVersionId, items);
  }
  const base = versions.find((v) => v.id === searchParams?.baseId) || versions[0];
  const target = versions.find((v) => v.id === searchParams?.targetId) || versions.find((v) => v.id === project.activeVersionId) || versions[versions.length - 1];

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));

  function calc(version: typeof versions[number] | undefined) {
    if (!version) return { revenue: 0, cost: 0, netProfit: 0, netMargin: 0, products: 0, costs: 0, revenues: 0 };
    const vatRate = n(version.taxes?.vatRate || 0.09);
    const surchargeRate = n(version.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version.taxes?.educationSurchargeRate || 0.03) + n(version.taxes?.localEducationSurchargeRate || 0.02);
    const incomeTaxRate = n(version.taxes?.incomeTaxRate || 0.25);
    const effective = effectiveCostRows(version.costs || [], leafCodes);
    const revenue = revenueFromProjectData({
      products: version.products || [],
      revenues: version.revenues || [],
      commercialRevenueLines: commercialRevenueLinesByVersionId.get(version.id) || [],
      otherRevenueLines: otherRevenueLinesByVersionId.get(version.id) || [],
      vatRate
    });
    const cost = costTotals(effective.effective);
    const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });
    return { revenue: revenue.taxInclusive, cost: cost.taxInclusive, netProfit: tax.netProfit, netMargin: revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0, products: version.products.length, costs: version.costs.length, revenues: version.revenues.length };
  }

  const baseData = calc(base);
  const targetData = calc(target);
  const rows = [
    ['含税收入', baseData.revenue, targetData.revenue],
    ['含税成本', baseData.cost, targetData.cost],
    ['税后净利', baseData.netProfit, targetData.netProfit],
    ['税后净利率', baseData.netMargin, targetData.netMargin],
    ['业态数量', baseData.products, targetData.products],
    ['成本明细行', baseData.costs, targetData.costs],
    ['收入明细行', baseData.revenues, targetData.revenues]
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">版本对比</p><h1 className="title">{project.name}</h1><p className="subtitle">对比不同测算阶段版本的收入、成本、利润和基础数据规模。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/versions`} className="btn btn-primary">返回版本中心</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link></div></div>
    <section className="card" style={{ marginBottom: 16 }}><h2>选择对比版本</h2><form method="get" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10, alignItems: 'end' }}><label>基准版本<select name="baseId" defaultValue={base?.id}>{versions.map((v) => <option key={v.id} value={v.id}>{v.stage || '未分阶段'}｜{v.name}</option>)}</select></label><label>对比版本<select name="targetId" defaultValue={target?.id}>{versions.map((v) => <option key={v.id} value={v.id}>{v.id === project.activeVersionId ? '当前｜' : ''}{v.stage || '未分阶段'}｜{v.name}</option>)}</select></label><button className="btn btn-primary">对比</button></form></section>
    <div className="summary-strip"><div className="stat"><div className="stat-label">基准版本</div><div className="stat-value" style={{ fontSize: 18 }}>{base?.name || '-'}</div></div><div className="stat"><div className="stat-label">对比版本</div><div className="stat-value" style={{ fontSize: 18 }}>{target?.name || '-'}</div></div><div className="stat"><div className="stat-label">收入变化</div><div className="stat-value" style={{ color: color(targetData.revenue - baseData.revenue) }}>{fmt(targetData.revenue - baseData.revenue)}</div></div><div className="stat"><div className="stat-label">净利变化</div><div className="stat-value" style={{ color: color(targetData.netProfit - baseData.netProfit) }}>{fmt(targetData.netProfit - baseData.netProfit)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>核心指标对比</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['指标', '基准版本', '对比版本', '差异'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{rows.map(([name, a, b]) => { const isRate = String(name).includes('率'); const diff = Number(b) - Number(a); return <tr key={String(name)}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{String(name)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{isRate ? pct(Number(a)) : fmt(a)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{isRate ? pct(Number(b)) : fmt(b)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(diff), fontWeight: 900 }}>{isRate ? pct(diff) : fmt(diff)}</td></tr>; })}</tbody></table></div></section>
  </div></main>;
}
