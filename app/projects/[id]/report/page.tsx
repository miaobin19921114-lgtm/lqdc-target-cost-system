import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusText(value: number) { return value >= 0 ? '盈利' : '亏损'; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function factorText(value: number | null, label: string) { return value === null ? '无法测算' : `${label}${pct(value - 1)}`; }

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

  const baseSensitivity = simulate(1, 1, 1);
  const breakEvenPrice = solveBreakEvenPrice();
  const maxCostFactor = solveMaxCostFactor();
  const maxLandFactor = solveMaxLandFactor();
  const breakEvenRows = [
    { name: '售价安全垫', threshold: factorText(breakEvenPrice, '最低售价 '), buffer: breakEvenPrice === null ? '无法测算' : `可下降 ${pct(1 - breakEvenPrice)}` },
    { name: '成本安全垫', threshold: factorText(maxCostFactor, '最高成本 '), buffer: maxCostFactor === null ? '无法测算' : `可上升 ${pct(maxCostFactor - 1)}` },
    { name: '土地安全垫', threshold: factorText(maxLandFactor, '最高土地 '), buffer: maxLandFactor === null ? '无法测算' : `可上升 ${pct(maxLandFactor - 1)}` }
  ];
  const sensitivityRows = [
    ['售价下降5%', '售价 -5%', simulate(0.95, 1, 1)],
    ['成本上升5%', '成本 +5%', simulate(1, 1.05, 1)],
    ['土地成本上升5%', '土地 +5%', simulate(1, 1, 1.05)],
    ['双重压力', '售价 -5%，成本 +5%', simulate(0.95, 1.05, 1)],
    ['改善方案', '售价 +3%，成本 -3%', simulate(1.03, 0.97, 1)]
  ] as const;
  const priceFactors = [0.9, 0.95, 1, 1.05];
  const costFactors = [0.95, 1, 1.05, 1.1];
  const sensitivityMatrix = priceFactors.map((price) => ({ price, cells: costFactors.map((costFactor) => ({ costFactor, result: simulate(price, costFactor, 1) })) }));
  const matrixCells = sensitivityMatrix.flatMap((row) => row.cells.map((cell) => ({ price: row.price, costFactor: cell.costFactor, result: cell.result })));
  const worstCell = matrixCells.reduce((worst, cell) => cell.result.netProfit < worst.result.netProfit ? cell : worst, matrixCells[0]);
  const bestCell = matrixCells.reduce((best, cell) => cell.result.netProfit > best.result.netProfit ? cell : best, matrixCells[0]);
  const lossCells = matrixCells.filter((cell) => cell.result.netProfit < 0).length;
  const decision = tax.netProfit < 0
    ? { level: '暂缓推进', color: '#e03131', reason: '基准方案已经亏损，应先复核售价、成本和税费口径。', action: '先做成本压降和售价修正，再进入下一轮投决。' }
    : lossCells === 0 && netMargin >= 0.08 && (breakEvenPrice ?? 1) <= 0.95 && (maxCostFactor ?? 1) >= 1.05
      ? { level: '建议推进', color: '#2f9e44', reason: '基准净利率较好，矩阵压力区间内暂无亏损格子，且价格和成本都有安全垫。', action: '可进入深化方案、融资测算和成本锁定。' }
      : lossCells <= 4 && netMargin > 0
        ? { level: '谨慎推进', color: '#f08c00', reason: '基准方案盈利，但部分压力组合会明显压缩利润，需要控制售价下滑和成本上涨。', action: '建议先锁定关键成本、复核售价去化，再推进。' }
        : { level: '暂缓推进', color: '#e03131', reason: '矩阵中亏损格子较多，抗压能力偏弱。', action: '建议先做强排方案优化、成本压降和销售价格复核。' };

  const summaryRows = [
    ['含税销售收入', revenue.taxInclusive, '元'], ['不含税销售收入', revenue.taxExclusive, '元'], ['含税目标成本', cost.taxInclusive, '元'], ['不含税目标成本', cost.taxExclusive, '元'],
    ['毛利', grossProfit, '元'], ['毛利率', grossMargin, 'percent'], ['税前利润', tax.profitBeforeIncomeTax, '元'], ['税后净利', tax.netProfit, '元'],
    ['销售净利率', netMargin, 'percent'], ['建面单方成本', buildingArea ? cost.taxInclusive / buildingArea : 0, '元/㎡'], ['可售单方成本', saleableUnitCost, '元/㎡']
  ] as const;
  const taxRows = [['销项税额', revenue.outputVat], ['进项税额', cost.inputVat], ['应缴增值税', tax.payableVat], ['附加税费', tax.surcharge], ['土地增值税', tax.landVat.landVat], ['企业所得税', tax.incomeTax], ['税费合计', tax.totalTax]] as const;
  const costRows = [['土地成本', cost.landCost], ['开发成本', cost.devCost], ['销售/管理/财务费用', cost.saleManageFinance], ['其他成本', Math.max(cost.taxExclusive - cost.landCost - cost.devCost - cost.saleManageFinance, 0)]] as const;
  const conclusionItems = [
    `投资决策评级：${decision.level}。${decision.reason}`,
    tax.netProfit >= 0 ? `项目整体测算为盈利，税后净利 ${fmt(tax.netProfit)} 元，销售净利率 ${pct(netMargin)}。` : `项目整体测算为亏损，税后净利 ${fmt(tax.netProfit)} 元，需重点复核售价、土地成本和建安成本。`,
    netMargin >= 0.08 ? '净利率具备一定安全垫，可继续深化方案和成本精细化测算。' : netMargin >= 0 ? '净利率偏薄，建议优先复核售价、车位收入、建安单方和营销费用。' : '当前利润为负，建议暂缓定案，先做敏感性测算和成本压降方案。',
    `盈亏平衡测算：${breakEvenRows.map((row) => `${row.name}：${row.buffer}`).join('；')}。`,
    `矩阵压力测试：最差组合为售价${pct(worstCell.price - 1)}、成本${pct(worstCell.costFactor - 1)}，税后净利 ${fmt(worstCell.result.netProfit)}；亏损格子 ${lossCells}/${matrixCells.length}。`,
    `含税可售单方成本为 ${fmt(saleableUnitCost)} 元/㎡，税费占含税收入比例为 ${pct(taxBurden)}。`,
    dataWarnings.length ? '存在数据口径风险，报告结论需结合下方风险提示复核。' : '核心数据暂未发现明显缺口，可作为阶段性经营判断依据。'
  ];

  return <main className="page report-page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header no-print"><div><p className="eyebrow">项目经营测算报告</p><h1 className="title">{project.name}</h1><p className="subtitle">可直接浏览器打印或另存为 PDF。</p></div><div className="actions" style={{ marginTop: 0 }}><span className="btn btn-primary">打印：Ctrl/Cmd + P</span><Link href={`/projects/${project.id}/decision`} className="btn">投决评审</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">敏感性测算</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card report-cover"><div className="eyebrow">源信达地产目标成本测算系统</div><h1 style={{ margin: '8px 0 4px', fontSize: 30 }}>{project.name}</h1><p className="meta">经营测算报告｜当前版本：{version?.name || '当前版本'}｜阶段：{version?.stage || '投拓阶段'}</p><div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}><div><span className="meta">城市/区域</span><div style={{ fontWeight: 900 }}>{project.city || '-'} / {project.district || '-'}</div></div><div><span className="meta">总建面</span><div style={{ fontWeight: 900 }}>{fmt(buildingArea)}㎡</div></div><div><span className="meta">可售面积</span><div style={{ fontWeight: 900 }}>{fmt(saleableArea)}㎡</div></div><div><span className="meta">经营结论</span><div style={{ fontWeight: 900, color: statusColor(tax.netProfit) }}>{statusText(tax.netProfit)}</div></div><div><span className="meta">投决评级</span><div style={{ fontWeight: 900, color: decision.color }}>{decision.level}</div></div></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>一、经营结论与建议</h2><ol style={{ margin: 0, paddingLeft: 20 }}>{conclusionItems.map((item) => <li key={item} style={{ marginBottom: 8, lineHeight: 1.7 }}>{item}</li>)}</ol></section>
    <section className="card" style={{ marginTop: 16 }}><h2>二、投资决策评级</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div style={{ border: `1px solid ${decision.color}`, borderRadius: 10, padding: 12 }}><div className="meta">建议等级</div><div style={{ fontWeight: 900, fontSize: 24, color: decision.color }}>{decision.level}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">判断依据</div><div style={{ fontWeight: 800 }}>{decision.reason}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">下一步动作</div><div style={{ fontWeight: 800 }}>{decision.action}</div></div></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>三、盈亏平衡安全垫</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>{breakEvenRows.map((row) => <div key={row.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">{row.name}</div><div style={{ fontWeight: 900, fontSize: 18 }}>{row.buffer}</div><div className="meta">{row.threshold}</div></div>)}</div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>四、敏感性压力测试摘要</h2><p className="meta">摘要取关键情景，完整测算请进入“敏感性测算表”。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr>{['情景', '变化', '税后净利', '净利率', '较基准变化'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{sensitivityRows.map(([name, change, result]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{change}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900, color: statusColor(result.netProfit) }}>{fmt(result.netProfit)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(result.netMargin)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: statusColor(result.netProfit - baseSensitivity.netProfit), fontWeight: 800 }}>{fmt(result.netProfit - baseSensitivity.netProfit)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>五、矩阵自动结论</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">最差组合</div><div style={{ fontWeight: 900, color: statusColor(worstCell.result.netProfit) }}>售价{pct(worstCell.price - 1)} / 成本{pct(worstCell.costFactor - 1)}</div><div className="meta">税后净利 {fmt(worstCell.result.netProfit)}，净利率 {pct(worstCell.result.netMargin)}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">最好组合</div><div style={{ fontWeight: 900, color: statusColor(bestCell.result.netProfit) }}>售价{pct(bestCell.price - 1)} / 成本{pct(bestCell.costFactor - 1)}</div><div className="meta">税后净利 {fmt(bestCell.result.netProfit)}，净利率 {pct(bestCell.result.netMargin)}</div></div><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">亏损格子</div><div style={{ fontWeight: 900, color: lossCells ? '#e03131' : '#2f9e44' }}>{lossCells} / {matrixCells.length}</div><div className="meta">亏损格子越多，抗压能力越弱</div></div></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>六、售价 × 成本二维矩阵</h2><p className="meta">单元格显示税后净利 / 净利率；横向为成本变化，纵向为售价变化。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>售价 \ 成本</th>{costFactors.map((factor) => <th key={factor} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>成本{pct(factor - 1)}</th>)}</tr></thead><tbody>{sensitivityMatrix.map((row) => <tr key={row.price}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>售价{pct(row.price - 1)}</td>{row.cells.map((cell) => <td key={`${row.price}-${cell.costFactor}`} style={{ padding: 10, borderBottom: '1px solid var(--border)', color: statusColor(cell.result.netProfit), fontWeight: 800 }}>{fmt(cell.result.netProfit)}<div className="meta">{pct(cell.result.netMargin)}</div></td>)}</tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>七、核心经营指标</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}><tbody>{summaryRows.map(([name, value, unit]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900, color: String(name).includes('利润') || String(name).includes('净利') ? statusColor(Number(value)) : undefined }}>{unit === 'percent' ? pct(Number(value)) : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{unit === 'percent' ? '' : unit}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>八、成本结构摘要</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>{costRows.map(([name, value]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">{name}</div><div style={{ fontWeight: 900, fontSize: 18 }}>{fmt(value)}</div><div className="meta">占不含税成本 {pct(cost.taxExclusive ? Number(value) / cost.taxExclusive : 0)}</div></div>)}</div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>九、税费测算</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>{taxRows.map(([name, value]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="meta">{name}</div><div style={{ fontWeight: 900, fontSize: 18 }}>{fmt(value)}</div></div>)}</div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>十、业态利润摘要</h2><p className="meta">摘要按收入占比快速分摊项目成本和税费；更精细口径以“业态经营利润测算表”为准。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['业态', '含税收入', '分摊成本', '分摊税费', '税后净利', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{productRows.length ? productRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.allocatedCost)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.allocatedTax)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900, color: statusColor(row.netProfit) }}>{fmt(row.netProfit)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={6} style={{ padding: 12, color: 'var(--muted)' }}>暂无业态利润数据。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>十一、可售业态收入</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse' }}><thead><tr>{['业态', '建筑面积', '可售面积', '销售单价', '含税收入', '不含税收入'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{productRows.length ? productRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.buildingArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.saleableArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.salePrice)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueExclusive)}</td></tr>) : <tr><td colSpan={6} style={{ padding: 12, color: 'var(--muted)' }}>暂无可售业态收入。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>十二、数据口径与风险提示</h2><div style={{ display: 'grid', gap: 8 }}>{dataWarnings.length ? dataWarnings.map((item) => <div key={item} style={{ border: '1px solid #ffd8a8', background: '#fff9db', borderRadius: 10, padding: 10 }}>{item}</div>) : <div style={{ border: '1px solid #b2f2bb', background: '#f0fff4', borderRadius: 10, padding: 10 }}>当前核心数据未发现明显缺口。</div>}</div><p className="meta" style={{ marginTop: 12 }}>本报告按当前启用版本、启用业态、末级成本及 Excel 导入四级科目统计；土增税与所得税为测算口径，后续可结合清算规则继续深化。</p></section>
    <style>{`@media print{.no-print, nav, header{display:none!important}.report-page{background:#fff!important}.card{break-inside:avoid;box-shadow:none!important}.container{max-width:100%!important}.page{padding:0!important}}`}</style>
  </div></main>;
}
