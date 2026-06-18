import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, isChargingProductName, isCommercialRevenueProductName, isOtherRevenueProductName, isParkingProductName, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function barWidth(amount: number, total: number) { return `${Math.min(100, total ? Math.max(amount / total * 100, 2) : 0)}%`; }

export default async function DashboardLite({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { costSubject: true, productType: true } }, taxes: true, importBatches: { orderBy: { createdAt: 'desc' }, take: 5 } }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string | null>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });
  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const activeProducts = (version?.products || []).filter((item) => item.isActive);
  const ordinarySaleableProducts = activeProducts.filter((item) => item.isSaleable && !isParkingProductName(item.name) && !isChargingProductName(item.name) && !isOtherRevenueProductName(item.name) && !isCommercialRevenueProductName(item.name));
  const noRevenueProducts = ordinarySaleableProducts.filter((item) => !n(item.salePrice) || !n(item.saleableArea));
  const activeBatches = version?.importBatches || [];

  function simulate(priceFactor: number, costFactor: number) {
    const t = fullTaxSummary({ revenueExclusive: revenue.taxExclusive * priceFactor, outputVat: revenue.outputVat * priceFactor, inputVat: cost.inputVat * costFactor, costExclusive: cost.taxExclusive * costFactor, landCost: cost.landCost, devCost: cost.devCost * costFactor, saleManageFinance: cost.saleManageFinance * costFactor, surchargeRate, incomeTaxRate });
    const revenueInclusive = revenue.taxInclusive * priceFactor;
    return { netProfit: t.netProfit, netMargin: revenueInclusive ? t.netProfit / revenueInclusive : 0 };
  }

  const priceFactors = [0.9, 0.95, 1, 1.05];
  const costFactors = [0.95, 1, 1.05, 1.1];
  const matrixCells = priceFactors.flatMap((price) => costFactors.map((costFactor) => ({ price, costFactor, result: simulate(price, costFactor) })));
  const lossCells = matrixCells.filter((cell) => cell.result.netProfit < 0).length;
  const priceDown5 = simulate(0.95, 1);
  const costUp5 = simulate(1, 1.05);
  const decision = tax.netProfit < 0 ? { level: '暂缓推进', color: '#e03131', reason: '基准方案已经亏损，应先复核售价、成本和税费口径。', action: '先暂停推进，优先做成本压降、售价复核和税费口径复核。' } : lossCells === 0 && netMargin >= 0.08 && priceDown5.netProfit >= 0 && costUp5.netProfit >= 0 ? { level: '建议推进', color: '#2f9e44', reason: '基准净利率较好，主要压力情景下仍保持盈利。', action: '可进入深化方案、融资测算和关键成本锁定。' } : lossCells <= 4 && netMargin > 0 ? { level: '谨慎推进', color: '#f08c00', reason: '基准方案盈利，但部分压力组合会明显压缩利润。', action: '先锁定土地、建安、售价和去化假设，再进入投决会。' } : { level: '暂缓推进', color: '#e03131', reason: '矩阵中亏损格子较多，项目抗压能力偏弱。', action: '建议先做方案优化和成本重构，再复测经营指标。' };

  const cards = [['投决评级', decision.level, 'rating'], ['含税总收入', revenue.taxInclusive, '元'], ['含税目标成本', cost.taxInclusive, '元'], ['税前利润', tax.profitBeforeIncomeTax, '元'], ['税后净利', tax.netProfit, '元'], ['毛利率', grossMargin * 100, '%'], ['净利率', netMargin * 100, '%'], ['建面单方成本', buildingArea ? cost.taxInclusive / buildingArea : 0, '元/㎡'], ['可售单方成本', saleableArea ? cost.taxInclusive / saleableArea : 0, '元/㎡']] as const;
  const incomeStructure = [['销售收入', revenue.ordinary.taxInclusive, '住宅、普通商业、配套等面积收入', 'revenue'], ['商业专项收入', revenue.commercial.taxInclusive, '分层商业、自持出租、租售混合', 'commercial-revenue'], ['车位收入', revenue.parking.taxInclusive, '车位个数×单个车位单价', 'parking-revenue'], ['其他收入', revenue.other.taxInclusive, '税收返还、产业奖励、财政补贴等', 'other-revenue']] as const;
  const costStructure = [['土地费', cost.landCost, '含税口径'], ['开发成本', cost.devCost, '不含税口径'], ['销管财费用', cost.saleManageFinance, '不含税口径'], ['进项税额', cost.inputVat, '税额口径']] as const;
  const checks = [
    { name: '投决评级', ok: decision.level !== '暂缓推进', text: `${decision.level}：${decision.reason}`, href: 'decision' },
    { name: '项目基础指标', ok: buildingArea > 0 && saleableArea > 0, text: buildingArea && saleableArea ? '总建面和可售面积已维护' : '总建面或可售面积缺失', href: 'indicator-check' },
    { name: '销售收入单价', ok: noRevenueProducts.length === 0, text: noRevenueProducts.length ? `${noRevenueProducts.length} 个普通可售业态缺面积或单价` : '普通销售业态面积/单价完整', href: 'revenue' },
    { name: '商业专项收入', ok: true, text: revenue.commercial.taxInclusive ? `商业专项收入 ${fmt(revenue.commercial.taxInclusive)} 元，已纳入总收入` : '无复杂商业专项收入或尚未维护', href: 'commercial-revenue' },
    { name: '车位收入', ok: revenue.parking.taxInclusive > 0 || !n(project.parkingCount), text: revenue.parking.taxInclusive ? `车位收入 ${fmt(revenue.parking.taxInclusive)} 元` : '有车位时建议维护车位收入', href: 'parking-revenue' },
    { name: '其他收入', ok: true, text: revenue.other.taxInclusive ? `其他收入 ${fmt(revenue.other.taxInclusive)} 元，已纳入总收入` : '无其他收入或尚未维护', href: 'other-revenue' },
    { name: '成本明细', ok: effective.effective.length > 0, text: `有效末级成本 ${effective.effective.length} 行`, href: 'costs-batch' },
    { name: '敏感性测算', ok: lossCells === 0, text: `收入×成本矩阵亏损格子 ${lossCells}/${matrixCells.length}`, href: 'sensitivity-report' },
    { name: 'Excel临时科目', ok: effective.importedLeafRows === 0, text: effective.importedLeafRows ? `${effective.importedLeafRows} 条临时四级科目，建议映射` : '无临时四级科目或已映射', href: 'cost-mapping' },
    { name: '经营利润', ok: tax.netProfit >= 0, text: `税后净利 ${fmt(tax.netProfit)}，净利率 ${pct(netMargin)}`, href: 'profit-analysis' }
  ];
  const issueChecks = checks.filter((row) => !row.ok);

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">经营看板</p><h1 className="title">经营总控</h1><p className="subtitle">定位为项目经营驾驶舱：看结论、看指标、看收入构成、看成本税费、看风险和下一步动作。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">投决评审</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印版报告</Link><Link href={`/projects/${project.id}/sensitivity-report`} className="btn">敏感性报告</Link><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    <section className="card" style={{ marginBottom: 18, borderColor: decision.color }}><div className="meta">一、项目经营结论</div><div style={{ fontSize: 30, fontWeight: 900, color: decision.color, marginTop: 6 }}>{decision.level}</div><p className="meta" style={{ marginTop: 8 }}>{decision.reason}</p><p style={{ marginTop: 8, fontWeight: 900 }}>下一步：{decision.action}</p><div className="actions"><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">查看投决评审</Link><Link href={`/projects/${project.id}/sensitivity-report`} className="btn">敏感性报告</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印版报告</Link></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>二、核心经营指标</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 12 }}>{cards.map(([label, value, unit]) => <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}><div className="meta">{label}</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: unit === 'rating' ? decision.color : label.includes('利润') || label.includes('净利') ? statusColor(Number(value)) : undefined }}>{unit === 'rating' ? value : fmt(value)}{unit === '%' ? '%' : ''}</div><div className="meta" style={{ marginTop: 4 }}>{unit === '%' ? '比例' : unit === 'rating' ? '自动判断' : unit}</div></div>)}</div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>三、收入构成校验</h2><div style={{ display: 'grid', gap: 12 }}>{incomeStructure.map(([name, amount, note, href]) => <div key={name}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><b>{name}</b><span>{fmt(amount)} 元 · {note}</span></div><div style={{ height: 10, background: '#eef2f6', borderRadius: 999, marginTop: 6 }}><div style={{ width: barWidth(Number(amount), revenue.taxInclusive || 1), height: 10, borderRadius: 999, background: '#0b7285' }} /></div><div style={{ marginTop: 6 }}><Link className="btn" href={`/projects/${project.id}/${href}`}>进入维护</Link></div></div>)}</div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>四、收入 / 成本 / 利润总览</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}><div><span className="meta">含税总收入</span><div style={{ fontSize: 24, fontWeight: 900 }}>{fmt(revenue.taxInclusive)}</div></div><div><span className="meta">含税目标成本</span><div style={{ fontSize: 24, fontWeight: 900 }}>{fmt(cost.taxInclusive)}</div></div><div><span className="meta">税前利润</span><div style={{ fontSize: 24, fontWeight: 900, color: statusColor(tax.profitBeforeIncomeTax) }}>{fmt(tax.profitBeforeIncomeTax)}</div></div><div><span className="meta">税后净利</span><div style={{ fontSize: 24, fontWeight: 900, color: statusColor(tax.netProfit) }}>{fmt(tax.netProfit)}</div></div></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>五、成本结构分析</h2><div style={{ display: 'grid', gap: 12 }}>{costStructure.map(([name, amount, note]) => <div key={name}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><b>{name}</b><span>{fmt(amount)} · {note}</span></div><div style={{ height: 10, background: '#eef2f6', borderRadius: 999, marginTop: 6 }}><div style={{ width: barWidth(Number(amount), cost.taxInclusive || 1), height: 10, borderRadius: 999, background: '#0b7285' }} /></div></div>)}</div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>六、税费与利润影响</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">应缴增值税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.payableVat)}</div></div><div><span className="meta">附加税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.surcharge)}</div></div><div><span className="meta">土地增值税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.landVat.landVat)}</div></div><div><span className="meta">企业所得税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.incomeTax)}</div></div><div><span className="meta">综合税负</span><div style={{ fontSize: 22, fontWeight: 900 }}>{revenue.taxInclusive ? pct(tax.totalTax / revenue.taxInclusive) : '0%'}</div></div></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>七、敏感性预警</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}><div><span className="meta">收入下跌5%</span><div style={{ fontSize: 22, fontWeight: 900, color: statusColor(priceDown5.netProfit) }}>{fmt(priceDown5.netProfit)}</div></div><div><span className="meta">成本上涨5%</span><div style={{ fontSize: 22, fontWeight: 900, color: statusColor(costUp5.netProfit) }}>{fmt(costUp5.netProfit)}</div></div><div><span className="meta">矩阵亏损格子</span><div style={{ fontSize: 22, fontWeight: 900, color: lossCells ? '#f08c00' : '#2f9e44' }}>{lossCells}/{matrixCells.length}</div></div></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>八、数据完整性检查</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '入口'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: row.ok ? '#2f9e44' : '#f08c00', fontWeight: 900 }}>{row.ok ? '正常' : '需关注'}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>九、下一步动作入口</h2>{issueChecks.length ? <p className="meta">当前优先处理 {issueChecks.length} 个关注项：{issueChecks.map((item) => item.name).join('、')}。</p> : <p className="meta">当前关键检查项正常，可进入投决报告或打印经营报告。</p>}<div className="actions"><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验中心</Link><Link href={`/projects/${project.id}/revenue-summary`} className="btn">收入汇总</Link><Link href={`/projects/${project.id}/commercial-revenue`} className="btn">商业收入</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本</Link><Link href={`/projects/${project.id}/tax-report`} className="btn">税务报告</Link><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">投决评审</Link></div></section>
    <section className="card"><h2>最近导入批次</h2>{activeBatches.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['文件', '模式', '行数', '含税合计', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{activeBatches.map((batch) => <tr key={batch.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><Link href={`/projects/${project.id}/import-batches/${batch.id}`}>{batch.fileName}</Link></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.importMode}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.rowCount}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(batch.taxInclusiveTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.status}</td></tr>)}</tbody></table></div> : <p className="meta">暂无导入批次。</p>}<div className="actions"><Link href={`/projects/${project.id}/export`} className="btn">Excel导入导出</Link><Link href={`/projects/${project.id}/import-batches`} className="btn">导入批次</Link><Link href={`/projects/${project.id}/cost-mapping`} className="btn">科目映射</Link></div></section>
  </div></main>;
}
