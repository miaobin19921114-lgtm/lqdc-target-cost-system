import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`;
}

function statusColor(value: number) {
  return value >= 0 ? '#2f9e44' : '#e03131';
}

export default async function ProjectOperatingReport({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: {
      products: true,
      revenues: { include: { productType: true } },
      commercialRevenueLines: true,
      otherRevenueLines: true,
      costs: { include: { costSubject: true, productType: true } },
      taxes: true
    }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    select: { costCode: true }
  });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({
    revenueExclusive: revenue.taxExclusive,
    outputVat: revenue.outputVat,
    inputVat: cost.inputVat,
    costExclusive: cost.taxExclusive,
    landCost: cost.landCost,
    devCost: cost.devCost,
    saleManageFinance: cost.saleManageFinance,
    surchargeRate,
    incomeTaxRate
  });

  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const saleableUnitCost = saleableArea ? cost.taxInclusive / saleableArea : 0;
  const buildingUnitCost = buildingArea ? cost.taxInclusive / buildingArea : 0;

  const rows = [
    ['含税销售收入', revenue.taxInclusive, '元'],
    ['不含税销售收入', revenue.taxExclusive, '元'],
    ['含税目标成本', cost.taxInclusive, '元'],
    ['不含税目标成本', cost.taxExclusive, '元'],
    ['毛利', grossProfit, '元'],
    ['毛利率', grossMargin, 'percent'],
    ['税前利润', tax.profitBeforeIncomeTax, '元'],
    ['税后净利', tax.netProfit, '元'],
    ['销售净利率', netMargin, 'percent'],
    ['建面单方成本', buildingUnitCost, '元/㎡'],
    ['可售单方成本', saleableUnitCost, '元/㎡'],
    ['应缴增值税', tax.payableVat, '元'],
    ['附加税费', tax.surcharge, '元'],
    ['土地增值税', tax.landVat.landVat, '元'],
    ['企业所得税', tax.incomeTax, '元'],
    ['税费合计', tax.totalTax, '元']
  ] as const;

  return <main className="page report-page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header no-print"><div><p className="eyebrow">项目经营测算报告</p><h1 className="title">{project.name}</h1><p className="subtitle">当前版本：{version?.name || '当前版本'}｜阶段：{version?.stage || '投拓阶段'}</p></div><div className="actions" style={{ marginTop: 0 }}><span className="btn btn-primary">打印：Ctrl/Cmd + P</span><Link href={`/projects/${project.id}/decision`} className="btn">投决评审</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>

    <section className="card report-cover"><div className="eyebrow">源信达地产目标成本测算系统</div><h1 style={{ margin: '8px 0 4px', fontSize: 30 }}>{project.name}</h1><p className="meta">城市/区域：{project.city || '-'} / {project.district || '-'}</p><div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">税后净利</span><div style={{ fontWeight: 900, color: statusColor(tax.netProfit) }}>{fmt(tax.netProfit)}</div></div><div><span className="meta">销售净利率</span><div style={{ fontWeight: 900 }}>{pct(netMargin)}</div></div><div><span className="meta">含税收入</span><div style={{ fontWeight: 900 }}>{fmt(revenue.taxInclusive)}</div></div><div><span className="meta">含税成本</span><div style={{ fontWeight: 900 }}>{fmt(cost.taxInclusive)}</div></div></div></section>

    <section className="card" style={{ marginTop: 16 }}><h2>一、经营结论</h2><ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}><li>项目整体税后净利 {fmt(tax.netProfit)} 元，销售净利率 {pct(netMargin)}。</li><li>含税收入 {fmt(revenue.taxInclusive)} 元，含税目标成本 {fmt(cost.taxInclusive)} 元。</li><li>毛利率 {pct(grossMargin)}，税费合计 {fmt(tax.totalTax)} 元。</li><li>已按完整收入口径统计：普通销售、商业专项、车位及其他收入；成本按有效末级成本行汇总。</li><li>已排除非末级历史成本 {effective.ignoredNonLeaf} 行，避免土地费或科目汇总行重复计入。</li></ol></section>

    <section className="card" style={{ marginTop: 16 }}><h2>二、核心经营指标</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}><tbody>{rows.map(([name, value, unit]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900, color: String(name).includes('利润') || String(name).includes('净利') ? statusColor(Number(value)) : undefined }}>{unit === 'percent' ? pct(Number(value)) : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{unit === 'percent' ? '' : unit}</td></tr>)}</tbody></table></div></section>

    <section className="card" style={{ marginTop: 16 }}><h2>三、数据口径提示</h2><p className="meta">本报告按当前启用版本、启用业态、完整收入明细、末级成本及 Excel 导入四级科目统计；土增税与所得税为测算口径，后续可结合清算规则继续深化。</p>{effective.importedLeafRows ? <div style={{ marginTop: 12, border: '1px solid #b2f2bb', background: '#f0fff4', borderRadius: 10, padding: 10 }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}</section>

    <style>{`@media print{.no-print, nav, header{display:none!important}.report-page{background:#fff!important}.card{break-inside:avoid;box-shadow:none!important}.container{max-width:100%!important}.page{padding:0!important}}`}</style>
  </div></main>;
}
