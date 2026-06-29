import Link from 'next/link';
import { NonV1Placeholder } from '@/components/non-v1-placeholder';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { ProjectTopNav } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function color(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function riskColor(level: string) { return level === '高' ? '#e03131' : level === '中' ? '#f08c00' : '#2f9e44'; }
function unitCost(amountWan: number, area: number) { return area ? amountWan * 10000 / area : 0; }

export default async function DecisionPage({ params }: { params: { id: string } }) {
  if (process.env.NEXT_PUBLIC_ENABLE_NON_V1_PAGES !== 'true') return <NonV1Placeholder projectId={params.id} />;

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { costSubject: true, productType: true } }, taxes: true }
  });
  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const saleableUnitCost = unitCost(cost.taxInclusive, saleableArea);
  const buildingUnitCost = unitCost(cost.taxInclusive, buildingArea);
  const investmentRatio = revenue.taxInclusive ? cost.taxInclusive / revenue.taxInclusive : 0;

  function simulate(priceFactor: number, costFactor: number, landFactor = 1) {
    const t = fullTaxSummary({
      revenueExclusive: revenue.taxExclusive * priceFactor,
      outputVat: revenue.outputVat * priceFactor,
      inputVat: cost.inputVat * costFactor,
      costExclusive: cost.taxExclusive * costFactor,
      landCost: cost.landCost * landFactor,
      devCost: cost.devCost * costFactor,
      saleManageFinance: cost.saleManageFinance * costFactor,
      surchargeRate,
      incomeTaxRate
    });
    const revenueInclusive = revenue.taxInclusive * priceFactor;
    return { netProfit: t.netProfit, netMargin: revenueInclusive ? t.netProfit / revenueInclusive : 0 };
  }

  function solveBreakEvenPrice() {
    if (simulate(2, 1).netProfit < 0) return null;
    let low = 0;
    let high = 2;
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (simulate(mid, 1).netProfit >= 0) high = mid;
      else low = mid;
    }
    return high;
  }

  function solveMaxCostFactor() {
    if (simulate(1, 0).netProfit < 0) return null;
    if (simulate(1, 2).netProfit >= 0) return 2;
    let low = 0;
    let high = 2;
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (simulate(1, mid).netProfit >= 0) low = mid;
      else high = mid;
    }
    return low;
  }

  const priceDown5 = simulate(0.95, 1);
  const costUp5 = simulate(1, 1.05);
  const doublePressure = simulate(0.95, 1.05);
  const priceFactors = [0.9, 0.95, 1, 1.05];
  const costFactors = [0.95, 1, 1.05, 1.1];
  const matrixCells = priceFactors.flatMap((price) => costFactors.map((costFactor) => ({ price, costFactor, result: simulate(price, costFactor) })));
  const lossCells = matrixCells.filter((cell) => cell.result.netProfit < 0).length;
  const worstCell = matrixCells.reduce((worst, cell) => cell.result.netProfit < worst.result.netProfit ? cell : worst, matrixCells[0]);
  const breakEvenPrice = solveBreakEvenPrice();
  const maxCostFactor = solveMaxCostFactor();

  const decision = tax.netProfit < 0
    ? { level: '暂缓推进', color: '#e03131', reason: '基准方案已经亏损，应先复核售价、成本和税费口径。', action: '先做成本压降、售价修正和方案优化，再进入下一轮投决。' }
    : lossCells === 0 && netMargin >= 0.08 && (breakEvenPrice ?? 1) <= 0.95 && (maxCostFactor ?? 1) >= 1.05
      ? { level: '建议推进', color: '#2f9e44', reason: '基准净利率较好，主要压力区间内暂无亏损格子，价格和成本具备安全垫。', action: '进入方案深化、成本锁定、融资计划和销售去化验证。' }
      : lossCells <= 4 && netMargin > 0
        ? { level: '谨慎推进', color: '#f08c00', reason: '基准方案盈利，但部分压力组合会明显压缩利润，需要重点控制售价下滑和成本上涨。', action: '先锁定建安成本、复核售价去化、优化车位及商业收入，再推进。' }
        : { level: '暂缓推进', color: '#e03131', reason: '矩阵中亏损格子较多，项目抗压能力偏弱。', action: '建议先做强排优化、成本压降、售价复核和税费口径复核。' };

  const risks = [
    { name: '利润安全垫', level: tax.netProfit < 0 ? '高' : netMargin < 0.05 ? '中' : '低', text: `税后净利 ${fmt(tax.netProfit)} 万元，净利率 ${pct(netMargin)}` },
    { name: '售价下行情景', level: priceDown5.netProfit < 0 ? '高' : priceDown5.netMargin < 0.03 ? '中' : '低', text: `售价下降5%后税后净利 ${fmt(priceDown5.netProfit)} 万元，净利率 ${pct(priceDown5.netMargin)}` },
    { name: '成本上行情景', level: costUp5.netProfit < 0 ? '高' : costUp5.netMargin < 0.03 ? '中' : '低', text: `成本上升5%后税后净利 ${fmt(costUp5.netProfit)} 万元，净利率 ${pct(costUp5.netMargin)}` },
    { name: '双重压力情景', level: doublePressure.netProfit < 0 ? '高' : doublePressure.netMargin < 0.03 ? '中' : '低', text: `售价下降5%且成本上升5%后税后净利 ${fmt(doublePressure.netProfit)} 万元` },
    { name: '矩阵压力风险', level: lossCells > 4 ? '高' : lossCells > 0 ? '中' : '低', text: `售价×成本矩阵亏损格子 ${lossCells}/${matrixCells.length}，最差组合净利 ${fmt(worstCell.result.netProfit)} 万元` },
    { name: '基础数据完整性', level: (!buildingArea || !saleableArea || effective.importedLeafRows > 0) ? '中' : '低', text: `总建面 ${fmt(buildingArea)}㎡，可售面积 ${fmt(saleableArea)}㎡，临时导入科目 ${effective.importedLeafRows} 行` }
  ];

  const metrics = [
    ['总货值/含税收入', revenue.taxInclusive, '万元'],
    ['总投资/含税成本', cost.taxInclusive, '万元'],
    ['销售毛利', grossProfit, '万元'],
    ['销售毛利率', grossMargin, 'percent'],
    ['税后净利', tax.netProfit, '万元'],
    ['销售净利率', netMargin, 'percent'],
    ['建面单方成本', buildingUnitCost, '元/㎡'],
    ['可售单方成本', saleableUnitCost, '元/㎡'],
    ['投资收入比', investmentRatio, 'percent'],
    ['售价安全垫', breakEvenPrice === null ? null : 1 - breakEvenPrice, 'percent'],
    ['成本安全垫', maxCostFactor === null ? null : maxCostFactor - 1, 'percent']
  ] as const;

  const confirmations = [
    '确认销售价格、去化速度和车位/商业收入是否可实现。',
    '确认建安成本、前期费用、销售管理财务费用是否已锁定。',
    '确认税费测算总表、土增税清算对象和所得税口径是否已经复核。',
    '确认售价下降5%、成本上升5%、双重压力下是否仍可接受。',
    '若评级为谨慎推进或暂缓推进，先形成成本压降和售价复核动作清单。'
  ];

  return <main className="page"><ProjectTopNav projectId={project.id} projectName={project.name} current="投决评审" /><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">投资决策评审表</p><h1 className="title">{project.name}</h1><p className="subtitle">投决结论页：判断是否推进，集中展示财务指标、风险、安全垫和上会确认事项。金额单位为万元，单方为元/㎡。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/tax-details`} className="btn">税费测算总表</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">敏感性分析</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印经营报告</Link></div></div>

    <section className="card" style={{ borderColor: decision.color, marginBottom: 16 }}><div className="meta">一、投决建议</div><div style={{ fontSize: 34, fontWeight: 900, color: decision.color, marginTop: 8 }}>{decision.level}</div><p style={{ fontWeight: 800, lineHeight: 1.8 }}>{decision.reason}</p><p className="meta">建议动作：{decision.action}</p><div className="actions"><Link href={`/projects/${project.id}/tax-details`} className="btn">复核税费测算总表</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">复核业态利润分析</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">复核敏感性分析</Link></div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>二、核心投决指标</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 10 }}>{metrics.map(([label, value, unit]) => <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}><div className="meta">{label}</div><div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: String(label).includes('净利') || String(label).includes('毛利') ? color(Number(value || 0)) : undefined }}>{value === null ? '无法测算' : unit === 'percent' ? pct(Number(value)) : fmt(value)}</div><div className="meta">{unit === 'percent' ? '比例' : unit}</div></div>)}</div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>三、主要风险判断</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse' }}><thead><tr>{['风险项', '等级', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{risks.map((risk) => <tr key={risk.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{risk.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: riskColor(risk.level), fontWeight: 900 }}>{risk.level}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{risk.text}</td></tr>)}</tbody></table></div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>四、敏感性结论</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}><div><div className="meta">售价下降5%</div><b style={{ fontSize: 22, color: color(priceDown5.netProfit) }}>{fmt(priceDown5.netProfit)} 万元</b></div><div><div className="meta">成本上升5%</div><b style={{ fontSize: 22, color: color(costUp5.netProfit) }}>{fmt(costUp5.netProfit)} 万元</b></div><div><div className="meta">双重压力</div><b style={{ fontSize: 22, color: color(doublePressure.netProfit) }}>{fmt(doublePressure.netProfit)} 万元</b></div><div><div className="meta">亏损矩阵格子</div><b style={{ fontSize: 22, color: lossCells ? '#f08c00' : '#2f9e44' }}>{lossCells}/{matrixCells.length}</b></div></div></section>

    <section className="card"><h2>五、投决会待确认事项</h2><ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>{confirmations.map((item) => <li key={item}>{item}</li>)}</ol></section>
  </div></main>;
}
