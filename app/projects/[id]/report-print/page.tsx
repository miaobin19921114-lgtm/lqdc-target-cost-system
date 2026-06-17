import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function riskColor(level: string) { return level === '高' ? '#e03131' : level === '中' ? '#f08c00' : '#2f9e44'; }
function factorText(value: number | null, type: 'down' | 'up') { return value === null ? '无法测算' : type === 'down' ? `可下降 ${pct(1 - value)}` : `可上升 ${pct(value - 1)}`; }

export default async function PrintableOperatingReport({ params }: { params: { id: string } }) {
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
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProducts(version?.products || [], vatRate);
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const saleableUnitCost = saleableArea ? cost.taxInclusive / saleableArea : 0;
  const taxBurden = revenue.taxInclusive ? tax.totalTax / revenue.taxInclusive : 0;

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
    ? { level: '暂缓推进', color: '#e03131', reason: '基准方案已经亏损，应先复核售价、成本和税费口径。', action: '成本压降、售价修正和方案优化完成前，不建议上会定案。' }
    : lossCells === 0 && netMargin >= 0.08 && (breakEvenPrice ?? 1) <= 0.95 && (maxCostFactor ?? 1) >= 1.05
      ? { level: '建议推进', color: '#2f9e44', reason: '基准净利率较好，主要压力区间内暂无亏损格子，价格和成本具备安全垫。', action: '进入方案深化、成本锁定、融资计划和销售去化验证。' }
      : lossCells <= 4 && netMargin > 0
        ? { level: '谨慎推进', color: '#f08c00', reason: '基准方案盈利，但部分压力组合会明显压缩利润。', action: '优先锁定建安成本、复核售价去化、优化车位及商业收入。' }
        : { level: '暂缓推进', color: '#e03131', reason: '矩阵中亏损格子较多，项目抗压能力偏弱。', action: '先做强排优化、成本压降、售价复核和税费口径复核。' };

  const risks = [
    { name: '利润安全垫', level: tax.netProfit < 0 ? '高' : netMargin < 0.05 ? '中' : '低', text: `税后净利 ${fmt(tax.netProfit)}，净利率 ${pct(netMargin)}` },
    { name: '售价下行', level: priceDown5.netProfit < 0 ? '高' : priceDown5.netMargin < 0.03 ? '中' : '低', text: `售价下降5%后税后净利 ${fmt(priceDown5.netProfit)}，净利率 ${pct(priceDown5.netMargin)}` },
    { name: '成本上行', level: costUp5.netProfit < 0 ? '高' : costUp5.netMargin < 0.03 ? '中' : '低', text: `成本上升5%后税后净利 ${fmt(costUp5.netProfit)}，净利率 ${pct(costUp5.netMargin)}` },
    { name: '双重压力', level: doublePressure.netProfit < 0 ? '高' : doublePressure.netMargin < 0.03 ? '中' : '低', text: `售价下降5%且成本上升5%后税后净利 ${fmt(doublePressure.netProfit)}` },
    { name: '数据口径', level: (!buildingArea || !saleableArea || effective.importedLeafRows > 0) ? '中' : '低', text: `临时导入科目 ${effective.importedLeafRows} 行；非末级排除 ${effective.ignoredNonLeaf} 行` }
  ];

  const indicators = [
    ['含税销售收入', fmt(revenue.taxInclusive)],
    ['含税目标成本', fmt(cost.taxInclusive)],
    ['税前利润', fmt(tax.profitBeforeIncomeTax)],
    ['税后净利', fmt(tax.netProfit)],
    ['销售净利率', pct(netMargin)],
    ['税费占收入', pct(taxBurden)],
    ['可售单方成本', `${fmt(saleableUnitCost)} 元/㎡`],
    ['售价安全垫', factorText(breakEvenPrice, 'down')],
    ['成本安全垫', factorText(maxCostFactor, 'up')],
    ['亏损矩阵格子', `${lossCells}/${matrixCells.length}`]
  ];

  return <main className="print-report">
    <div className="no-print toolbar"><Link href={`/projects/${project.id}/report`} className="btn">返回经营报告</Link><Link href={`/projects/${project.id}/decision`} className="btn">投决评审</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><span className="btn btn-primary">打印：Ctrl/Cmd + P</span></div>
    <section className="cover block"><div className="eyebrow">源信达地产目标成本测算系统</div><h1>{project.name}</h1><h2>项目经营测算报告（打印版）</h2><p>当前版本：{version?.name || '当前版本'}　阶段：{version?.stage || '投拓阶段'}　城市/区域：{project.city || '-'} / {project.district || '-'}</p><div className="decision" style={{ color: decision.color }}>{decision.level}</div><p className="decision-reason">{decision.reason}</p></section>
    <section className="block"><h2>一、报告目录</h2><div className="toc"><span>1 经营结论</span><span>2 核心指标</span><span>3 敏感性与安全垫</span><span>4 成本与税费</span><span>5 风险清单</span><span>6 评审签批</span></div></section>
    <section className="block"><h2>二、经营结论</h2><ol><li>投决评级：<b style={{ color: decision.color }}>{decision.level}</b>。{decision.reason}</li><li>下一步动作：{decision.action}</li><li>最差压力组合：售价{pct(worstCell.price - 1)} / 成本{pct(worstCell.costFactor - 1)}，税后净利 {fmt(worstCell.result.netProfit)}。</li></ol></section>
    <section className="block"><h2>三、核心经营指标</h2><table><tbody>{indicators.map(([name, value]) => <tr key={name}><td>{name}</td><td>{value}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>四、成本与税费摘要</h2><table><tbody><tr><td>土地成本</td><td>{fmt(cost.landCost)}</td></tr><tr><td>开发成本</td><td>{fmt(cost.devCost)}</td></tr><tr><td>销售/管理/财务费用</td><td>{fmt(cost.saleManageFinance)}</td></tr><tr><td>应缴增值税</td><td>{fmt(tax.payableVat)}</td></tr><tr><td>附加税</td><td>{fmt(tax.surcharge)}</td></tr><tr><td>土地增值税</td><td>{fmt(tax.landVat.landVat)}</td></tr><tr><td>企业所得税</td><td>{fmt(tax.incomeTax)}</td></tr></tbody></table></section>
    <section className="block"><h2>五、主要风险清单</h2><table><thead><tr><th>风险项</th><th>等级</th><th>说明</th></tr></thead><tbody>{risks.map((risk) => <tr key={risk.name}><td>{risk.name}</td><td style={{ color: riskColor(risk.level), fontWeight: 900 }}>{risk.level}</td><td>{risk.text}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>六、评审签批区</h2><table><tbody><tr><td>评审结论</td><td>□ 建议推进　□ 谨慎推进　□ 暂缓推进</td></tr><tr><td>复核事项</td><td>□ 售价　□ 成本　□ 税费　□ 方案指标　□ 融资</td></tr><tr><td>评审负责人</td><td></td></tr><tr><td>评审日期</td><td></td></tr><tr><td>备注</td><td style={{ height: 80 }}></td></tr></tbody></table></section>
    <style>{`.print-report{max-width:960px;margin:0 auto;padding:24px;background:#fff;color:#111;font-family:Arial,'Microsoft YaHei',sans-serif}.toolbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:16px}.block{border:1px solid #d9e2ec;border-radius:12px;padding:18px;margin-bottom:16px;break-inside:avoid}.cover{text-align:center;padding:42px 24px}.cover h1{font-size:34px;margin:12px 0}.cover h2{font-size:22px;margin:8px 0;color:#334155}.eyebrow{font-size:12px;letter-spacing:.12em;color:#64748b;font-weight:800}.decision{font-size:34px;font-weight:900;margin-top:24px}.decision-reason{font-size:16px;font-weight:800}.toc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.toc span{border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f8fafc}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left}td:first-child{font-weight:800;color:#334155;width:28%}@media print{.no-print,nav,header{display:none!important}.print-report{max-width:100%;padding:0}.block{box-shadow:none;border-color:#ddd}.cover{min-height:420px;display:flex;flex-direction:column;justify-content:center}}`}</style>
  </main>;
}
