import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function factorText(value: number | null, label: string) { return value === null ? '无法测算' : `${label}${pct(value - 1)}`; }

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
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
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
    return { revenueInclusive, costInclusive, profitBeforeIncomeTax: tax.profitBeforeIncomeTax, incomeTax: tax.incomeTax, netProfit: tax.netProfit, netMargin: revenueInclusive ? tax.netProfit / revenueInclusive : 0, totalTax: tax.totalTax };
  }

  function solveBreakEvenPrice() {
    if (simulate(2, 1, 1).netProfit < 0) return null;
    let low = 0;
    let high = 2;
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (simulate(mid, 1, 1).netProfit >= 0) high = mid;
      else low = mid;
    }
    return high;
  }

  function solveMaxCostFactor() {
    if (simulate(1, 0, 1).netProfit < 0) return null;
    if (simulate(1, 2, 1).netProfit >= 0) return 2;
    let low = 0;
    let high = 2;
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (simulate(1, mid, 1).netProfit >= 0) low = mid;
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
  const breakEvenPrice = solveBreakEvenPrice();
  const maxCostFactor = solveMaxCostFactor();
  const maxLandFactor = solveMaxLandFactor();
  const priceFactors = [0.9, 0.95, 1, 1.05];
  const costFactors = [0.95, 1, 1.05, 1.1];
  const matrix = priceFactors.map((price) => ({ price, cells: costFactors.map((costFactor) => ({ costFactor, result: simulate(price, costFactor, 1) })) }));
  const matrixCells = matrix.flatMap((row) => row.cells.map((cell) => ({ price: row.price, costFactor: cell.costFactor, result: cell.result })));
  const worstCell = matrixCells.reduce((worst, cell) => cell.result.netProfit < worst.result.netProfit ? cell : worst, matrixCells[0]);
  const bestCell = matrixCells.reduce((best, cell) => cell.result.netProfit > best.result.netProfit ? cell : best, matrixCells[0]);
  const lossCells = matrixCells.filter((cell) => cell.result.netProfit < 0).length;
  const breakEvenRows = [
    { name: '售价盈亏平衡点', current: '当前售价 100%', threshold: factorText(breakEvenPrice, '最低售价 '), buffer: breakEvenPrice === null ? '无法测算' : `可下降 ${pct(1 - breakEvenPrice)}`, note: '低于该售价后项目转亏' },
    { name: '成本盈亏平衡点', current: '当前成本 100%', threshold: factorText(maxCostFactor, '最高成本 '), buffer: maxCostFactor === null ? '无法测算' : `可上升 ${pct(maxCostFactor - 1)}`, note: '高于该成本后项目转亏' },
    { name: '土地成本盈亏平衡点', current: '当前土地 100%', threshold: factorText(maxLandFactor, '最高土地 '), buffer: maxLandFactor === null ? '无法测算' : `可上升 ${pct(maxLandFactor - 1)}`, note: '高于该土地成本后项目转亏' }
  ];
  const decision = base.netProfit < 0
    ? { level: '暂缓推进', color: '#e03131', reason: '基准方案已经亏损，应先复核售价、成本和税费口径。', action: '先做成本压降和售价修正，再进入下一轮投决。' }
    : lossCells === 0 && base.netMargin >= 0.08 && (breakEvenPrice ?? 1) <= 0.95 && (maxCostFactor ?? 1) >= 1.05
      ? { level: '建议推进', color: '#2f9e44', reason: '基准净利率较好，矩阵压力区间内暂无亏损格子，且价格和成本都有安全垫。', action: '可进入深化方案、融资测算和成本锁定。' }
      : lossCells <= 4 && base.netMargin > 0
        ? { level: '谨慎推进', color: '#f08c00', reason: '基准方案盈利，但部分压力组合会明显压缩利润，需要控制售价下滑和成本上涨。', action: '建议先锁定关键成本、复核售价去化，再推进。' }
        : { level: '暂缓推进', color: '#e03131', reason: '矩阵中亏损格子较多，抗压能力偏弱。', action: '建议先做强排方案优化、成本压降和销售价格复核。' };

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">敏感性测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">按售价、成本、土地成本变化快速压力测试项目利润，辅助投拓和定案决策。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/sensitivity-report`} className="btn btn-primary">打印版敏感性报告</Link><Link href={`/projects/${project.id}/report`} className="btn">经营报告</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">基准含税收入</div><div className="stat-value">{fmt(base.revenueInclusive)}</div></div><div className="stat"><div className="stat-label">基准含税成本</div><div className="stat-value">{fmt(base.costInclusive)}</div></div><div className="stat"><div className="stat-label">基准税后净利</div><div className="stat-value" style={{ color: statusColor(base.netProfit) }}>{fmt(base.netProfit)}</div></div><div className="stat"><div className="stat-label">基准净利率</div><div className="stat-value">{pct(base.netMargin)}</div></div></div>
    <section className="card" style={{ marginBottom: 16 }}><h2>投资决策评级</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div style={{ border: `1px solid ${decision.color}`, borderRadius: 10, padding: 12 }}><div className="meta">建议等级</div><div style={{ fontWeight: 900, fontSize: 24, color: decision.color }}>{decision.level}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">判断依据</div><div style={{ fontWeight: 800 }}>{decision.reason}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">下一步动作</div><div style={{ fontWeight: 800 }}>{decision.action}</div></div></div><div className="actions"><Link href={`/projects/${project.id}/sensitivity-report`} className="btn btn-primary">生成打印版敏感性报告</Link></div></section>
    <section className="card" style={{ marginBottom: 16 }}><h2>盈亏平衡安全垫</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['项目', '当前口径', '盈亏平衡点', '安全垫', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{breakEvenRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.current}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{row.threshold}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: row.buffer.includes('-') ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{row.buffer}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.note}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginBottom: 16 }}><h2>矩阵自动结论</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">最差组合</div><div style={{ fontWeight: 900, color: statusColor(worstCell.result.netProfit) }}>售价{pct(worstCell.price - 1)} / 成本{pct(worstCell.costFactor - 1)}</div><div className="meta">税后净利 {fmt(worstCell.result.netProfit)}，净利率 {pct(worstCell.result.netMargin)}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">最好组合</div><div style={{ fontWeight: 900, color: statusColor(bestCell.result.netProfit) }}>售价{pct(bestCell.price - 1)} / 成本{pct(bestCell.costFactor - 1)}</div><div className="meta">税后净利 {fmt(bestCell.result.netProfit)}，净利率 {pct(bestCell.result.netMargin)}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">亏损格子</div><div style={{ fontWeight: 900, color: lossCells ? '#e03131' : '#2f9e44' }}>{lossCells} / {matrixCells.length}</div><div className="meta">亏损格子越多，抗压能力越弱</div></div></div></section>
    <section className="card" style={{ marginBottom: 16 }}><h2>售价 × 成本二维敏感性矩阵</h2><p className="meta">单元格显示税后净利 / 净利率；横向为成本变化，纵向为售价变化。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>售价 \ 成本</th>{costFactors.map((factor) => <th key={factor} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>成本{pct(factor - 1)}</th>)}</tr></thead><tbody>{matrix.map((row) => <tr key={row.price}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>售价{pct(row.price - 1)}</td>{row.cells.map((cell) => <td key={`${row.price}-${cell.costFactor}`} style={{ padding: 10, borderBottom: '1px solid var(--border)', color: statusColor(cell.result.netProfit), fontWeight: 800 }}>{fmt(cell.result.netProfit)}<div className="meta">{pct(cell.result.netMargin)}</div></td>)}</tr>)}</tbody></table></div></section>
    <section className="card"><h2>敏感性方案</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['方案', '售价系数', '成本系数', '土地系数', '含税收入', '含税成本', '税费合计', '税前利润', '所得税', '税后净利', '净利率', '净利变化', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{scenarios.map((row) => <tr key={row.name}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.price - 1)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.cost - 1)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.land - 1)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.revenueInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.costInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.totalTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.profitBeforeIncomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.result.incomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 900, color: statusColor(row.result.netProfit) }}>{fmt(row.result.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.result.netMargin)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', color: statusColor(row.result.netProfit - base.netProfit), fontWeight: 800 }}>{fmt(row.result.netProfit - base.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.note}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>判断提示</h2><p className="meta">若“售价盈亏平衡点”低于当前售价越多，价格安全垫越厚；若矩阵中售价下降、成本上升区域大面积转亏，说明项目抗压能力偏弱。</p></section>
  </div></main>;
}
