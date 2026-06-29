import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getProjectVersionRevenueLines } from '@/lib/project-version-revenue-lines';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';

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

function factorText(value: number | null, type: 'down' | 'up') {
  if (value === null) return '无法测算';
  return type === 'down' ? `可下降 ${pct(1 - value)}` : `可上升 ${pct(value - 1)}`;
}

function riskText(lossCells: number) {
  if (lossCells > 4) return '亏损格子较多，项目抗压能力偏弱。';
  if (lossCells > 0) return '部分压力组合转亏，建议谨慎推进并锁定成本。';
  return '压力矩阵内未出现亏损格子，具备一定抗压能力。';
}

export default async function PrintableSensitivityReport({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: {
      products: true,
      revenues: { include: { productType: true } },
      costs: { include: { costSubject: true, productType: true } },
      taxes: true
    }
  });
  if (version) await normalizeProjectVersionCostLineAmounts(version.id);
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(version?.id);

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines, otherRevenueLines, vatRate });
  const cost = costTotals(effective.effective);

  function simulate(priceFactor: number, costFactor: number, landFactor = 1) {
    const tax = fullTaxSummary({
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
    const costInclusive = cost.taxInclusive * costFactor + cost.landCost * (landFactor - costFactor);
    return {
      revenueInclusive,
      costInclusive,
      totalTax: tax.totalTax,
      profitBeforeIncomeTax: tax.profitBeforeIncomeTax,
      incomeTax: tax.incomeTax,
      netProfit: tax.netProfit,
      netMargin: revenueInclusive ? tax.netProfit / revenueInclusive : 0
    };
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

  function solveMaxLandFactor() {
    if (simulate(1, 1, 0).netProfit < 0) return null;
    if (simulate(1, 1, 2).netProfit >= 0) return 2;
    let low = 0;
    let high = 2;
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (simulate(1, 1, mid).netProfit >= 0) low = mid;
      else high = mid;
    }
    return low;
  }

  const scenarios = [
    { name: '基准方案', change: '当前口径', price: 1, cost: 1, land: 1 },
    { name: '售价下降5%', change: '售价 -5%', price: 0.95, cost: 1, land: 1 },
    { name: '售价下降10%', change: '售价 -10%', price: 0.9, cost: 1, land: 1 },
    { name: '成本上升5%', change: '成本 +5%', price: 1, cost: 1.05, land: 1 },
    { name: '成本上升10%', change: '成本 +10%', price: 1, cost: 1.1, land: 1 },
    { name: '土地成本上升5%', change: '土地 +5%', price: 1, cost: 1, land: 1.05 },
    { name: '双重压力', change: '售价 -5%，成本 +5%', price: 0.95, cost: 1.05, land: 1 },
    { name: '改善方案', change: '售价 +3%，成本 -3%', price: 1.03, cost: 0.97, land: 1 }
  ].map((row) => ({ ...row, result: simulate(row.price, row.cost, row.land) }));

  const base = scenarios[0].result;
  const priceFactors = [0.9, 0.95, 1, 1.05];
  const costFactors = [0.95, 1, 1.05, 1.1];
  const matrix = priceFactors.map((price) => ({ price, cells: costFactors.map((costFactor) => ({ costFactor, result: simulate(price, costFactor) })) }));
  const matrixCells = matrix.flatMap((row) => row.cells.map((cell) => ({ price: row.price, costFactor: cell.costFactor, result: cell.result })));
  const worstCell = matrixCells.reduce((worst, cell) => cell.result.netProfit < worst.result.netProfit ? cell : worst, matrixCells[0]);
  const lossCells = matrixCells.filter((cell) => cell.result.netProfit < 0).length;
  const breakEvenPrice = solveBreakEvenPrice();
  const maxCostFactor = solveMaxCostFactor();
  const maxLandFactor = solveMaxLandFactor();
  const decision = base.netProfit < 0 ? '暂缓推进' : lossCells === 0 && base.netMargin >= 0.08 ? '建议推进' : lossCells <= 4 ? '谨慎推进' : '暂缓推进';
  const decisionColor = decision === '建议推进' ? '#2f9e44' : decision === '谨慎推进' ? '#f08c00' : '#e03131';

  const indicators = [
    ['基准含税收入', `${fmt(base.revenueInclusive)} 万元`],
    ['基准含税成本', `${fmt(base.costInclusive)} 万元`],
    ['基准税后净利', `${fmt(base.netProfit)} 万元`],
    ['基准净利率', pct(base.netMargin)],
    ['售价安全垫', factorText(breakEvenPrice, 'down')],
    ['成本安全垫', factorText(maxCostFactor, 'up')],
    ['土地安全垫', factorText(maxLandFactor, 'up')],
    ['亏损矩阵格子', `${lossCells}/${matrixCells.length}`],
    ['最差组合净利', `${fmt(worstCell.result.netProfit)} 万元`],
    ['最差组合净利率', pct(worstCell.result.netMargin)]
  ];

  return <main className="print-report">
    <div className="no-print toolbar"><Link href={`/projects/${project.id}/sensitivity`} className="btn">返回敏感性分析</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">税费利润分析</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印经营报告</Link><span className="btn btn-primary">打印：Ctrl/Cmd + P</span></div>
    <section className="cover block"><div className="eyebrow">源信达地产目标成本测算系统</div><h1>{project.name}</h1><h2>敏感性分析报告</h2><p>当前版本：{version?.name || '当前版本'}　阶段：{version?.stage || '投拓阶段'}</p><div className="decision" style={{ color: decisionColor }}>{decision}</div><p>基准税后净利 {fmt(base.netProfit)} 万元，净利率 {pct(base.netMargin)}；矩阵亏损格子 {lossCells}/{matrixCells.length}</p></section>
    <section className="block"><h2>一、敏感性结论</h2><ol><li>最差组合：售价{pct(worstCell.price - 1)} / 成本{pct(worstCell.costFactor - 1)}，税后净利 {fmt(worstCell.result.netProfit)} 万元。</li><li>售价安全垫：{factorText(breakEvenPrice, 'down')}；成本安全垫：{factorText(maxCostFactor, 'up')}；土地安全垫：{factorText(maxLandFactor, 'up')}。</li><li>{riskText(lossCells)}</li><li>本报告金额单位为万元，净利率和安全垫为比例。</li></ol></section>
    <section className="block"><h2>二、核心安全垫</h2><table><tbody>{indicators.map(([name, value]) => <tr key={name}><td>{name}</td><td>{value}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>三、压力情景分析</h2><table><thead><tr><th>情景</th><th>变化</th><th>含税收入</th><th>含税成本</th><th>税后净利</th><th>净利率</th><th>较基准变化</th></tr></thead><tbody>{scenarios.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.change}</td><td>{fmt(row.result.revenueInclusive)} 万元</td><td>{fmt(row.result.costInclusive)} 万元</td><td style={{ color: statusColor(row.result.netProfit), fontWeight: 900 }}>{fmt(row.result.netProfit)} 万元</td><td>{pct(row.result.netMargin)}</td><td style={{ color: statusColor(row.result.netProfit - base.netProfit), fontWeight: 900 }}>{fmt(row.result.netProfit - base.netProfit)} 万元</td></tr>)}</tbody></table></section>
    <section className="block"><h2>四、售价 × 成本二维矩阵</h2><table><thead><tr><th>售价 \ 成本</th>{costFactors.map((factor) => <th key={factor}>成本{pct(factor - 1)}</th>)}</tr></thead><tbody>{matrix.map((row) => <tr key={row.price}><td>售价{pct(row.price - 1)}</td>{row.cells.map((cell) => <td key={`${row.price}-${cell.costFactor}`} style={{ color: statusColor(cell.result.netProfit), fontWeight: 900 }}>{fmt(cell.result.netProfit)} 万元<br />{pct(cell.result.netMargin)}</td>)}</tr>)}</tbody></table></section>
    <section className="block"><h2>五、复核建议</h2><ol><li>若售价下降 5% 或成本上升 5% 后净利明显压缩，应优先锁定售价、去化、建安成本和土地成本。</li><li>若亏损矩阵格子超过 4 个，建议先做方案强排优化和成本压降后再复核。</li><li>输出结果前应同步复核税费测算总表、土地增值税清算测算表、业态利润分析。</li></ol></section>
    <section className="block"><h2>六、评审签批区</h2><table><tbody><tr><td>评审结论</td><td>□ 通过　□ 谨慎通过　□ 暂缓</td></tr><tr><td>需复核事项</td><td>□ 售价　□ 建安成本　□ 土地成本　□ 税费　□ 去化周期</td></tr><tr><td>负责人</td><td></td></tr><tr><td>日期</td><td></td></tr><tr><td>备注</td><td style={{ height: 80 }}></td></tr></tbody></table></section>
    <style>{`.print-report{max-width:980px;margin:0 auto;padding:24px;background:#fff;color:#111;font-family:Arial,'Microsoft YaHei',sans-serif}.toolbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:16px}.block{border:1px solid #d9e2ec;border-radius:12px;padding:18px;margin-bottom:16px;break-inside:avoid}.cover{text-align:center;padding:42px 24px}.cover h1{font-size:34px;margin:12px 0}.cover h2{font-size:22px;margin:8px 0;color:#334155}.eyebrow{font-size:12px;letter-spacing:.12em;color:#64748b;font-weight:800}.decision{font-size:34px;font-weight:900;margin-top:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left}td:first-child{font-weight:800;color:#334155}@media print{.no-print,nav,header{display:none!important}.print-report{max-width:100%;padding:0}.block{box-shadow:none;border-color:#ddd}.cover{min-height:420px;display:flex;flex-direction:column;justify-content:center}}`}</style>
  </main>;
}
