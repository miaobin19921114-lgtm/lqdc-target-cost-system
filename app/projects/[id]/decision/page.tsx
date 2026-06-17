import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function riskColor(level: string) { return level === '高' ? '#e03131' : level === '中' ? '#f08c00' : '#2f9e44'; }
function factorText(value: number | null, label: string) { return value === null ? '无法测算' : `${label}${pct(value - 1)}`; }

export default async function DecisionPage({ params }: { params: { id: string } }) {
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
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });
  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const saleableUnitCost = saleableArea ? cost.taxInclusive / saleableArea : 0;

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
    { name: '利润安全垫', level: tax.netProfit < 0 ? '高' : netMargin < 0.05 ? '中' : '低', text: `税后净利 ${fmt(tax.netProfit)}，净利率 ${pct(netMargin)}` },
    { name: '售价下行情景', level: priceDown5.netProfit < 0 ? '高' : priceDown5.netMargin < 0.03 ? '中' : '低', text: `售价下降5%后税后净利 ${fmt(priceDown5.netProfit)}，净利率 ${pct(priceDown5.netMargin)}` },
    { name: '成本上行情景', level: costUp5.netProfit < 0 ? '高' : costUp5.netMargin < 0.03 ? '中' : '低', text: `成本上升5%后税后净利 ${fmt(costUp5.netProfit)}，净利率 ${pct(costUp5.netMargin)}` },
    { name: '双重压力情景', level: doublePressure.netProfit < 0 ? '高' : doublePressure.netMargin < 0.03 ? '中' : '低', text: `售价下降5%且成本上升5%后税后净利 ${fmt(doublePressure.netProfit)}` },
    { name: '矩阵压力风险', level: lossCells > 4 ? '高' : lossCells > 0 ? '中' : '低', text: `售价×成本矩阵亏损格子 ${lossCells}/${matrixCells.length}，最差组合净利 ${fmt(worstCell.result.netProfit)}` },
    { name: '基础数据完整性', level: (!buildingArea || !saleableArea || effective.importedLeafRows > 0) ? '中' : '低', text: `总建面 ${fmt(buildingArea)}㎡，可售面积 ${fmt(saleableArea)}㎡，临时导入科目 ${effective.importedLeafRows} 行` }
  ];

  const metrics = [
    ['含税销售收入', revenue.taxInclusive, '元'],
    ['含税目标成本', cost.taxInclusive, '元'],
    ['税后净利', tax.netProfit, '元'],
    ['销售净利率', netMargin, 'percent'],
    ['可售单方成本', saleableUnitCost, '元/㎡'],
    ['售价安全垫', breakEvenPrice === null ? null : 1 - breakEvenPrice, 'percent'],
    ['成本安全垫', maxCostFactor === null ? null : maxCostFactor - 1, 'percent']
  ] as const;

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">投资决策评审表</p><h1 className="title">{project.name}</h1><p className="subtitle">集中展示投决评级、核心指标、主要风险和下一步动作。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/report`} className="btn btn-primary">经营报告</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">敏感性</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card" style={{ borderColor: decision.color, marginBottom: 16 }}><div className="meta">投决建议</div><div style={{ fontSize: 34, fontWeight: 900, color: decision.color, marginTop: 8 }}>{decision.level}</div><p style={{ fontWeight: 800, lineHeight: 1.8 }}>{decision.reason}</p><p className="meta">下一步动作：{decision.action}</p></section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 16 }}>{metrics.map(([label, value, unit]) => <div key={label} className="card"><div className="meta">{label}</div><div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: String(label).includes('净利') ? statusColor(Number(value)) : undefined }}>{value === null ? '无法测算' : unit === 'percent' ? pct(Number(value)) : fmt(value)}</div><div className="meta">{unit === 'percent' ? '比例' : unit}</div></div>)}</div>
    <section className="card" style={{ marginBottom: 16 }}><h2>主要风险判断</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse' }}><thead><tr>{['风险项', '等级', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{risks.map((risk) => <tr key={risk.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{risk.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: riskColor(risk.level), fontWeight: 900 }}>{risk.level}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{risk.text}</td></tr>)}</tbody></table></div></section>
    <section className="card"><h2>投决检查清单</h2><ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}><li>复核销售面积、销售单价、车位收入和商业收入假设。</li><li>复核土地成本、交易费用、前期费用、建安单方和销售管理财务费用。</li><li>对“售价下降5%”“成本上升5%”“双重压力”进行会议确认。</li><li>若评级为“谨慎推进”或“暂缓推进”，先完成成本压降和售价去化复核后再上会。</li></ol></section>
  </div></main>;
}
