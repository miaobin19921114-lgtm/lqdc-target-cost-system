import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }

export default async function SensitivityPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, costs: { include: { costSubject: true, productType: true } }, taxes: true }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.corporateIncomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter(Boolean));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProducts(version?.products || [], vatRate);
  const cost = costTotals(effective.effective);

  function simulate(priceFactor: number, costFactor: number, landFactor: number) {
    const revenueExclusive = revenue.taxExclusive * priceFactor;
    const outputVat = revenue.outputVat * priceFactor;
    const costExclusive = cost.taxExclusive * costFactor;
    const inputVat = cost.inputVat * costFactor;
    const landCost = cost.landCost * landFactor;
    const devCost = cost.devCost * costFactor;
    const saleManageFinance = cost.saleManageFinance * costFactor;
    const tax = fullTaxSummary({ revenueExclusive, outputVat, inputVat, costExclusive, landCost, devCost, saleManageFinance, surchargeRate, incomeTaxRate });
    const revenueInclusive = revenue.taxInclusive * priceFactor;
    const costInclusive = cost.taxInclusive * costFactor + cost.landCost * (landFactor - costFactor);
    return {
      revenueInclusive,
      costInclusive,
      profitBeforeIncomeTax: tax.profitBeforeIncomeTax,
      incomeTax: tax.incomeTax,
      netProfit: tax.netProfit,
      netMargin: revenueInclusive ? tax.netProfit / revenueInclusive : 0,
      totalTax: tax.totalTax
    };
  }

  const scenarios = [
    { name: '基准方案', price: 1, cost: 1, land: 1, note: '当前售价、当前成本' },
    { name: '售价下降5%', price: 0.95, cost: 1, land: 1, note: '测试市场降价压力' },
    { name: '售价下降10%', price: 0.9, cost: 1, land: 1, note: '测试极端去化压力' },
    { name: '售价上升5%', price: 1.05, cost: 1, land: 1, note: '测试价格改善空间' },
    { name: '成本上升5%', price: 1, cost: 1.05, land: 1, note: '建安、前期、费用上浮' },
    { name: '成本下降5%', price: 1, cost: 0.95, land: 1, note: '成本优化压降空间' },
    { name: '土地成本上升5%', price: 1, cost: 1, land: 1.05, note: '土地或交易成本压力' },
    { name: '双重压力', price: 0.95, cost: 1.05, land: 1, note: '售价降5%且成本涨5%' },
    { name: '改善方案', price: 1.03, cost: 0.97, land: 1, note: '售价提升3%且成本降3%' }
  ].map((item) => ({ ...item, result: simulate(item.price, item.cost, item.land) }));

  const base = scenarios[0].result;

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">敏感性测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">按售价、成本、土地成本变化快速压力测试项目利润，辅助投拓和定案决策。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/report`} className="btn btn-primary">经营报告</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">基准含税收入</div><div className="stat-value">{fmt(base.revenueInclusive)}</div></div><div className="stat"><div className="stat-label">基准含税成本</div><div className="stat-value">{fmt(base.costInclusive)}</div></div><div className="stat"><div className="stat-label">基准税后净利</div><div className="stat-value" style={{ color: statusColor(base.netProfit) }}>{fmt(base.netProfit)}</div></div><div className="stat"><div className="stat-label">基准净利率</div><div className="stat-value">{pct(base.netMargin)}</div></div></div>
    <section className="card"><h2>敏感性方案</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['方案', '售价系数', '成本系数', '土地系数', '含税收入', '含税成本', '税费合计', '税前利润', '所得税', '税后净利', '净利率', '净利变化', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{scenarios.map((row) => <tr key={row.name}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.price - 1)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.cost - 1)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.land - 1)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.revenueInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.costInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.totalTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.profitBeforeIncomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.incomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 900, color: statusColor(row.result.netProfit) }}>{fmt(row.result.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.result.netMargin)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', color: statusColor(row.result.netProfit - base.netProfit), fontWeight: 800 }}>{fmt(row.result.netProfit - base.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.note}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>判断提示</h2><p className="meta">若“售价下降5%”后净利率仍为正，项目具备一定价格安全垫；若“双重压力”后转亏，后续应重点做售价、建安成本、车位收入和土地交易成本敏感性深化。</p></section>
  </div></main>;
}
