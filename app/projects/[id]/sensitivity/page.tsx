import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function color(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }

export default async function SensitivityPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: project.activeVersionId ? { id: project.activeVersionId, projectId: params.id } : { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { productType: true, costSubject: true } }, taxes: true }
  });

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const baseRevenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const baseCost = costTotals(effective.effective);

  function calc(revenueRate: number, costRate: number) {
    const revenueExclusive = baseRevenue.taxExclusive * revenueRate;
    const outputVat = baseRevenue.outputVat * revenueRate;
    const costExclusive = baseCost.taxExclusive * costRate;
    const inputVat = baseCost.inputVat * costRate;
    const tax = fullTaxSummary({ revenueExclusive, outputVat, inputVat, costExclusive, landCost: baseCost.landCost * costRate, devCost: baseCost.devCost * costRate, saleManageFinance: baseCost.saleManageFinance * costRate, surchargeRate, incomeTaxRate });
    return { revenueInclusive: baseRevenue.taxInclusive * revenueRate, costInclusive: baseCost.taxInclusive * costRate, netProfit: tax.netProfit, netMargin: baseRevenue.taxInclusive ? tax.netProfit / (baseRevenue.taxInclusive * revenueRate) : 0 };
  }

  const base = calc(1, 1);
  const scenarios = [
    { name: '基准测算', revenueRate: 1, costRate: 1 },
    { name: '售价下降 3%', revenueRate: 0.97, costRate: 1 },
    { name: '售价下降 5%', revenueRate: 0.95, costRate: 1 },
    { name: '成本上升 3%', revenueRate: 1, costRate: 1.03 },
    { name: '成本上升 5%', revenueRate: 1, costRate: 1.05 },
    { name: '售价降 5% + 成本升 5%', revenueRate: 0.95, costRate: 1.05 }
  ].map((row) => ({ ...row, ...calc(row.revenueRate, row.costRate) }));

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">敏感性测算</p><h1 className="title">{project.name}</h1><p className="subtitle">基于当前版本的收入、成本和税率，自动测算售价/成本变化对税后净利的影响。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">业态利润</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">基准含税收入</div><div className="stat-value">{fmt(base.revenueInclusive)}</div></div><div className="stat"><div className="stat-label">基准含税成本</div><div className="stat-value">{fmt(base.costInclusive)}</div></div><div className="stat"><div className="stat-label">基准税后净利</div><div className="stat-value" style={{ color: color(base.netProfit) }}>{fmt(base.netProfit)}</div></div><div className="stat"><div className="stat-label">基准净利率</div><div className="stat-value" style={{ color: color(base.netMargin) }}>{pct(base.netMargin)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>敏感性结果</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['场景', '含税收入', '含税成本', '税后净利', '净利率', '净利变化'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{scenarios.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.costInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.netProfit), fontWeight: 900 }}>{fmt(row.netProfit)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(row.netMargin)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.netProfit - base.netProfit), fontWeight: 900 }}>{fmt(row.netProfit - base.netProfit)}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
