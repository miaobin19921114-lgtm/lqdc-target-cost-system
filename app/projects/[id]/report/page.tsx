import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusText(value: number) { return value >= 0 ? '盈利' : '亏损'; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }

export default async function ProjectOperatingReport({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, costs: { include: { costSubject: true, productType: true } }, taxes: true, importBatches: { orderBy: { createdAt: 'desc' }, take: 3 } }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.corporateIncomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter(Boolean));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProducts(version?.products || [], vatRate);
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const activeProducts = (version?.products || []).filter((item) => item.isActive);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const taxBurden = revenue.taxInclusive ? tax.totalTax / revenue.taxInclusive : 0;
  const saleableUnitCost = saleableArea ? cost.taxInclusive / saleableArea : 0;
  const dataWarnings = [
    effective.ignoredNonLeaf ? `已排除非末级历史成本 ${effective.ignoredNonLeaf} 行` : '',
    effective.importedLeafRows ? `存在 Excel 导入临时四级科目 ${effective.importedLeafRows} 行，建议做科目映射` : '',
    saleableProducts.filter((item) => !n(item.salePrice) || !n(item.saleableArea)).length ? '存在可售业态缺销售面积或销售单价' : '',
    !buildingArea || !saleableArea ? '项目建筑面积或可售面积未完整维护' : ''
  ].filter(Boolean);

  const productRows = saleableProducts.map((product, index) => {
    const row = revenue.rows[index];
    const ratio = revenue.taxInclusive ? (row?.taxInclusiveRevenue || 0) / revenue.taxInclusive : 0;
    const allocatedCost = cost.taxInclusive * ratio;
    const allocatedTax = tax.totalTax * ratio;
    const netProfit = (row?.taxInclusiveRevenue || 0) - allocatedCost - allocatedTax;
    return { name: product.name, buildingArea: n(product.buildingArea), saleableArea: n(product.saleableArea), salePrice: n(product.salePrice), revenueInclusive: row?.taxInclusiveRevenue || 0, revenueExclusive: row?.taxExclusiveRevenue || 0, allocatedCost, allocatedTax, netProfit };
  });

  function simulate(priceFactor: number, costFactor: number, landFactor: number) {
    const revenueExclusive = revenue.taxExclusive * priceFactor;
    const outputVat = revenue.outputVat * priceFactor;
    const costExclusive = cost.taxExclusive * costFactor;
    const inputVat = cost.inputVat * costFactor;
    const landCost = cost.landCost * landFactor;
    const devCost = cost.devCost * costFactor;
    const saleManageFinance = cost.saleManageFinance * costFactor;
    const t = fullTaxSummary({ revenueExclusive, outputVat, inputVat, costExclusive, landCost, devCost, saleManageFinance, surchargeRate, incomeTaxRate });
    const revenueInclusive = revenue.taxInclusive * priceFactor;
    return { revenueInclusive, netProfit: t.netProfit, netMargin: revenueInclusive ? t.netProfit / revenueInclusive : 0 };
  }

  const baseSensitivity = simulate(1, 1, 1);
  const sensitivityRows = [
    ['售价下降5%', '售价 -5%', simulate(0.95, 1, 1)],
    ['成本上升5%', '成本 +5%', simulate(1, 1.05, 1)],
    ['土地成本上升5%', '土地 +5%', simulate(1, 1, 1.05)],
    ['双重压力', '售价 -5%，成本 +5%', simulate(0.95, 1.05, 1)],
    ['改善方案', '售价 +3%，成本 -3%', simulate(1.03, 0.97, 1)]
  ] as const;

  const summaryRows = [
    ['含税销售收入', revenue.taxInclusive, '元'], ['不含税销售收入', revenue.taxExclusive, '元'], ['含税目标成本', cost.taxInclusive, '元'], ['不含税目标成本', cost.taxExclusive, '元'],
    ['毛利', grossProfit, '元'], ['毛利率', grossMargin, 'percent'], ['税前利润', tax.profitBeforeIncomeTax, '元'], ['税后净利', tax.netProfit, '元'],
    ['销售净利率', netMargin, 'percent'], ['建面单方成本', buildingArea ? cost.taxInclusive / buildingArea : 0, '元/㎡'], ['可售单方成本', saleableUnitCost, '元/㎡']
  ] as const;
  const taxRows = [['销项税额', revenue.outputVat], ['进项税额', cost.inputVat], ['应缴增值税', tax.payableVat], ['附加税费', tax.surcharge], ['土地增值税', tax.landVat.landVat], ['企业所得税', tax.incomeTax], ['税费合计', tax.totalTax]] as const;
  const costRows = [['土地成本', cost.landCost], ['开发成本', cost.devCost], ['销售/管理/财务费用', cost.saleManageFinance], ['其他成本', Math.max(cost.taxExclusive - cost.landCost - cost.devCost - cost.saleManageFinance, 0)]] as const;
  const conclusionItems = [
    tax.netProfit >= 0 ? `项目整体测算为盈利，税后净利 ${fmt(tax.netProfit)} 元，销售净利率 ${pct(netMargin)}。` : `项目整体测算为亏损，税后净利 ${fmt(tax.netProfit)} 元，需重点复核售价、土地成本和建安成本。`,
    netMargin >= 0.08 ? '净利率具备一定安全垫，可继续深化方案和成本精细化测算。' : netMargin >= 0 ? '净利率偏薄，建议优先复核售价、车位收入、建安单方和营销费用。' : '当前利润为负，建议暂缓定案，先做敏感性测算和成本压降方案。',
    `含税可售单方成本为 ${fmt(saleableUnitCost)} 元/㎡，税费占含税收入比例为 ${pct(taxBurden)}。`,
    dataWarnings.length ? '存在数据口径风险，报告结论需结合下方风险提示复核。' : '核心数据暂未发现明显缺口，可作为阶段性经营判断依据。'
  ];

  return <main className="page report-page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header no-print"><div><p className="eyebrow">项目经营测算报告</p><h1 className="title">{project.name}</h1><p className="subtitle">可直接浏览器打印或另存为 PDF。</p></div><div className="actions" style={{ marginTop: 0 }}><span className="btn btn-primary">打印：Ctrl/Cmd + P</span><Link href={`/projects/${project.id}/sensitivity`} className="btn">敏感性测算</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card report-cover"><div className="eyebrow">源信达地产目标成本测算系统</div><h1 style={{ margin: '8px 0 4px', fontSize: 30 }}>{project.name}</h1><p className="meta">经营测算报告｜当前版本：{version?.name || '当前版本'}｜阶段：{version?.stage || '投拓阶段'}</p><div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}><div><span className="meta">城市/区域</span><div style={{ fontWeight: 900 }}>{project.city || '-'} / {project.district || '-'}</div></div><div><span className="meta">总建面</span><div style={{ fontWeight: 900 }}>{fmt(buildingArea)}㎡</div></div><div><span className="meta">可售面积</span><div style={{ fontWeight: 900 }}>{fmt(saleableArea)}㎡</div></div><div><span className="meta">经营结论</span><div style={{ fontWeight: 900, color: statusColor(tax.netProfit) }}>{statusText(tax.netProfit)}</div></div></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>一、经营结论与建议</h2><ol style={{ margin: 0, paddingLeft: 20 }}>{conclusionItems.map((item) => <li key={item} style={{ marginBottom: 8, lineHeight: 1.7 }}>{item}</li>)}</ol></section>
    <section className="card" style={{ marginTop: 16 }}><h2>二、敏感性压力测试摘要</h2><p className="meta">摘要取关键情景，完整测算请进入“敏感性测算表”。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr>{['情景', '变化', '税后净利', '净利率', '较基准变化'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{sensitivityRows.map(([name, change, result]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{change}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900, color: statusColor(result.netProfit) }}>{fmt(result.netProfit)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(result.netMargin)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: statusColor(result.netProfit - baseSensitivity.netProfit), fontWeight: 800 }}>{fmt(result.netProfit - baseSensitivity.netProfit)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>三、核心经营指标</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}><tbody>{summaryRows.map(([name, value, unit]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900, color: String(name).includes('利润') || String(name).includes('净利') ? statusColor(Number(value)) : undefined }}>{unit === 'percent' ? pct(Number(value)) : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{unit === 'percent' ? '' : unit}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>四、成本结构摘要</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>{costRows.map(([name, value]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">{name}</div><div style={{ fontWeight: 900, fontSize: 18 }}>{fmt(value)}</div><div className="meta">占不含税成本 {pct(cost.taxExclusive ? Number(value) / cost.taxExclusive : 0)}</div></div>)}</div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>五、税费测算</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>{taxRows.map(([name, value]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">{name}</div><div style={{ fontWeight: 900, fontSize: 18 }}>{fmt(value)}</div></div>)}</div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>六、业态利润摘要</h2><p className="meta">摘要按收入占比快速分摊项目成本和税费；更精细口径以“业态经营利润测算表”为准。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['业态', '含税收入', '分摊成本', '分摊税费', '税后净利', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{productRows.length ? productRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.allocatedCost)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.allocatedTax)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900, color: statusColor(row.netProfit) }}>{fmt(row.netProfit)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={6} style={{ padding: 12, color: 'var(--muted)' }}>暂无业态利润数据。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>七、可售业态收入</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse' }}><thead><tr>{['业态', '建筑面积', '可售面积', '销售单价', '含税收入', '不含税收入'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{productRows.length ? productRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.buildingArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.saleableArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.salePrice)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueExclusive)}</td></tr>) : <tr><td colSpan={6} style={{ padding: 12, color: 'var(--muted)' }}>暂无可售业态收入。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>八、数据口径与风险提示</h2><div style={{ display: 'grid', gap: 8 }}>{dataWarnings.length ? dataWarnings.map((item) => <div key={item} style={{ border: '1px solid #ffd8a8', background: '#fff9db', borderRadius: 10, padding: 10 }}>{item}</div>) : <div style={{ border: '1px solid #b2f2bb', background: '#f0fff4', borderRadius: 10, padding: 10 }}>当前核心数据未发现明显缺口。</div>}</div><p className="meta" style={{ marginTop: 12 }}>本报告按当前启用版本、启用业态、末级成本及 Excel 导入四级科目统计；土增税与所得税为测算口径，后续可结合清算规则继续深化。</p></section>
    <style>{`@media print{.no-print, nav, header{display:none!important}.report-page{background:#fff!important}.card{break-inside:avoid;box-shadow:none!important}.container{max-width:100%!important}.page{padding:0!important}}`}</style>
  </div></main>;
}
