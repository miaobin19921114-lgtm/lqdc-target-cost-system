import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { ProjectTopNav } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function color(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function unitCost(amountWan: number, area: number) { return area ? amountWan * 10000 / area : 0; }

export default async function SensitivityPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { productType: true, costSubject: true } }, taxes: true }
  });
  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const baseRevenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const baseCost = costTotals(effective.effective);
  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);

  function calc(revenueRate: number, costRate: number) {
    const tax = fullTaxSummary({
      revenueExclusive: baseRevenue.taxExclusive * revenueRate,
      outputVat: baseRevenue.outputVat * revenueRate,
      inputVat: baseCost.inputVat * costRate,
      costExclusive: baseCost.taxExclusive * costRate,
      landCost: baseCost.landCost * costRate,
      devCost: baseCost.devCost * costRate,
      saleManageFinance: baseCost.saleManageFinance * costRate,
      surchargeRate,
      incomeTaxRate
    });
    const revenueInclusive = baseRevenue.taxInclusive * revenueRate;
    return { revenueInclusive, costInclusive: baseCost.taxInclusive * costRate, netProfit: tax.netProfit, netMargin: revenueInclusive ? tax.netProfit / revenueInclusive : 0, totalTax: tax.totalTax };
  }

  const base = calc(1, 1);
  const scenarios = [
    { name: '基准测算', revenueRate: 1, costRate: 1 },
    { name: '售价下降 5%', revenueRate: 0.95, costRate: 1 },
    { name: '成本上升 5%', revenueRate: 1, costRate: 1.05 },
    { name: '售价下降 5% + 成本上升 5%', revenueRate: 0.95, costRate: 1.05 }
  ].map((row) => ({ ...row, ...calc(row.revenueRate, row.costRate) }));

  return <main className="page"><ProjectTopNav projectId={project.id} projectName={project.name} current="敏感性分析" /><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">敏感性分析</p><h1 className="title">{project.name}</h1><p className="subtitle">基于当前版本的收入、成本和税率，测算售价与成本变化对税后净利的影响。金额单位为万元，单方为元/㎡。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/sensitivity-report`} className="btn btn-primary">敏感性分析报告</Link><Link href={`/projects/${project.id}/decision`} className="btn">投决评审</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印经营报告</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">基准含税收入</div><div className="stat-value">{fmt(base.revenueInclusive)}</div><div className="meta">万元</div></div><div className="stat"><div className="stat-label">基准含税成本</div><div className="stat-value">{fmt(base.costInclusive)}</div><div className="meta">万元</div></div><div className="stat"><div className="stat-label">基准税后净利</div><div className="stat-value" style={{ color: color(base.netProfit) }}>{fmt(base.netProfit)}</div><div className="meta">万元</div></div><div className="stat"><div className="stat-label">基准净利率</div><div className="stat-value" style={{ color: color(base.netMargin) }}>{pct(base.netMargin)}</div><div className="meta">比例</div></div><div className="stat"><div className="stat-label">可售单方成本</div><div className="stat-value">{fmt(unitCost(baseCost.taxInclusive, saleableArea))}</div><div className="meta">元/㎡</div></div><div className="stat"><div className="stat-label">建面单方成本</div><div className="stat-value">{fmt(unitCost(baseCost.taxInclusive, buildingArea))}</div><div className="meta">元/㎡</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>敏感性结果</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['场景', '含税收入(万元)', '含税成本(万元)', '税费合计(万元)', '税后净利(万元)', '净利率', '净利变化(万元)'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{scenarios.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.costInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.totalTax)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.netProfit), fontWeight: 900 }}>{fmt(row.netProfit)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(row.netMargin)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.netProfit - base.netProfit), fontWeight: 900 }}>{fmt(row.netProfit - base.netProfit)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>评审提示</h2><ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}><li>重点关注售价下降、成本上升、售价与成本同时变化三类场景。</li><li>正式上会前应同步复核税费测算总表、土地增值税清算测算表和业态利润分析。</li><li>如临时导入科目未映射，需先完成科目映射再输出正式报告。</li></ol></section>
  </div></main>;
}
