import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`;
}

function color(value: number) {
  return value >= 0 ? '#2f9e44' : '#e03131';
}

export default async function ProfitAnalysisPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: project.activeVersionId ? { id: project.activeVersionId, projectId: params.id } : { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      revenues: { include: { productType: true } },
      commercialRevenueLines: true,
      otherRevenueLines: true,
      costs: { include: { productType: true, costSubject: true } },
      taxes: true
    }
  });

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;

  const productRows = (version?.products || []).filter((p) => p.isActive).map((p) => {
    const revenueLine = (version?.revenues || []).filter((r) => r.productTypeId === p.id).reduce((sum, r) => sum + n(r.taxInclusiveRevenue), 0);
    const directCost = effective.effective.filter((c) => c.productTypeId === p.id).reduce((sum, c) => sum + n(c.taxInclusiveAmount), 0);
    const estimateRevenue = revenueLine || (p.isSaleable ? n(p.saleableArea) * n(p.salePrice) : 0);
    return { id: p.id, name: p.name, revenue: estimateRevenue, directCost, profit: estimateRevenue - directCost, area: n(p.saleableArea || p.buildingArea) };
  });

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">业态利润分析</p><h1 className="title">{project.name}</h1><p className="subtitle">当前版本：{version?.name || '暂无'}。先恢复项目利润和业态收入/直接成本预览，后续继续细化分摊成本。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税收入</div><div className="stat-value">{fmt(revenue.taxInclusive)}</div></div><div className="stat"><div className="stat-label">含税成本</div><div className="stat-value">{fmt(cost.taxInclusive)}</div></div><div className="stat"><div className="stat-label">毛利率</div><div className="stat-value" style={{ color: color(grossMargin) }}>{pct(grossMargin)}</div></div><div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value" style={{ color: color(netMargin) }}>{pct(netMargin)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>项目利润口径</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}><tbody>{[['不含税收入', revenue.taxExclusive], ['不含税成本', cost.taxExclusive], ['应缴增值税', tax.payableVat], ['附加税费', tax.surcharge], ['土地增值税', tax.landVat.landVat], ['企业所得税', tax.incomeTax], ['税前利润', tax.profitBeforeIncomeTax], ['税后净利', tax.netProfit]].map(([name, value]) => <tr key={String(name)}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 800 }}>{String(name)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900 }}>{fmt(value)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>业态收入 / 直接成本预览</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['业态', '面积', '收入', '直接成本', '毛利预览'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{productRows.length ? productRows.map((row) => <tr key={row.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.area)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenue)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.directCost)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.profit), fontWeight: 900 }}>{fmt(row.profit)}</td></tr>) : <tr><td colSpan={5} style={{ padding: 12, color: 'var(--muted)' }}>暂无业态数据。</td></tr>}</tbody></table></div></section>
  </div></main>;
}
