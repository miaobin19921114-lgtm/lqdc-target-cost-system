import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }

export default async function DashboardLite({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, costs: { include: { costSubject: true, productType: true } }, taxes: true, importBatches: { orderBy: { createdAt: 'desc' }, take: 5 } }
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
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const activeProducts = (version?.products || []).filter((item) => item.isActive);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const noRevenueProducts = saleableProducts.filter((item) => !n(item.salePrice) || !n(item.saleableArea));
  const activeBatches = version?.importBatches || [];

  function simulate(priceFactor: number, costFactor: number) {
    const t = fullTaxSummary({
      revenueExclusive: revenue.taxExclusive * priceFactor,
      outputVat: revenue.outputVat * priceFactor,
      inputVat: cost.inputVat * costFactor,
      costExclusive: cost.taxExclusive * costFactor,
      landCost: cost.landCost,
      devCost: cost.devCost * costFactor,
      saleManageFinance: cost.saleManageFinance * costFactor,
      surchargeRate,
      incomeTaxRate
    });
    const revenueInclusive = revenue.taxInclusive * priceFactor;
    return { netProfit: t.netProfit, netMargin: revenueInclusive ? t.netProfit / revenueInclusive : 0 };
  }

  const priceFactors = [0.9, 0.95, 1, 1.05];
  const costFactors = [0.95, 1, 1.05, 1.1];
  const matrixCells = priceFactors.flatMap((price) => costFactors.map((costFactor) => ({ price, costFactor, result: simulate(price, costFactor) })));
  const lossCells = matrixCells.filter((cell) => cell.result.netProfit < 0).length;
  const priceDown5 = simulate(0.95, 1);
  const costUp5 = simulate(1, 1.05);
  const decision = tax.netProfit < 0
    ? { level: '暂缓推进', color: '#e03131', reason: '基准方案已经亏损，应先复核售价、成本和税费口径。' }
    : lossCells === 0 && netMargin >= 0.08 && priceDown5.netProfit >= 0 && costUp5.netProfit >= 0
      ? { level: '建议推进', color: '#2f9e44', reason: '基准净利率较好，主要压力情景下仍保持盈利。' }
      : lossCells <= 4 && netMargin > 0
        ? { level: '谨慎推进', color: '#f08c00', reason: '基准方案盈利，但部分压力组合会明显压缩利润。' }
        : { level: '暂缓推进', color: '#e03131', reason: '矩阵中亏损格子较多，项目抗压能力偏弱。' };

  const cards = [
    ['投决评级', decision.level, 'rating'],
    ['含税销售收入', revenue.taxInclusive, '元'],
    ['含税目标成本', cost.taxInclusive, '元'],
    ['税前利润', tax.profitBeforeIncomeTax, '元'],
    ['税后净利', tax.netProfit, '元'],
    ['毛利率', grossMargin * 100, '%'],
    ['净利率', netMargin * 100, '%'],
    ['建面单方成本', buildingArea ? cost.taxInclusive / buildingArea : 0, '元/㎡'],
    ['可售单方成本', saleableArea ? cost.taxInclusive / saleableArea : 0, '元/㎡']
  ] as const;

  const checks = [
    { name: '投决评级', ok: decision.level !== '暂缓推进', text: `${decision.level}：${decision.reason}`, href: 'decision' },
    { name: '业态销售单价', ok: noRevenueProducts.length === 0, text: noRevenueProducts.length ? `${noRevenueProducts.length} 个可售业态缺面积或单价` : '可售业态面积/单价完整', href: 'revenue' },
    { name: '成本明细', ok: effective.effective.length > 0, text: `有效末级成本 ${effective.effective.length} 行`, href: 'costs-batch' },
    { name: '敏感性测算', ok: lossCells === 0, text: `售价×成本矩阵亏损格子 ${lossCells}/${matrixCells.length}`, href: 'sensitivity' },
    { name: 'Excel临时科目', ok: effective.importedLeafRows === 0, text: effective.importedLeafRows ? `${effective.importedLeafRows} 条临时四级科目，建议映射` : '无临时四级科目或已映射', href: 'cost-mapping' },
    { name: '非末级历史成本', ok: effective.ignoredNonLeaf === 0, text: effective.ignoredNonLeaf ? `已排除 ${effective.ignoredNonLeaf} 条非末级历史成本` : '无非末级重复风险', href: 'summary-check' },
    { name: '经营利润', ok: tax.netProfit >= 0, text: `税后净利 ${fmt(tax.netProfit)}，净利率 ${pct(netMargin)}`, href: 'profit-analysis' }
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">经营总控看板</p><h1 className="title">{project.name}</h1><p className="subtitle">统一读取当前启用版本，按目标成本汇总、税金明细、成本分摊同一口径展示项目是否赚钱。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">投决评审</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印版报告</Link><Link href={`/projects/${project.id}/report`} className="btn">经营报告</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">敏感性</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">业态利润</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}/summary-check`} className="btn">汇总校验</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card" style={{ marginBottom: 18, borderColor: decision.color }}><div className="meta">投资决策评级</div><div style={{ fontSize: 30, fontWeight: 900, color: decision.color, marginTop: 6 }}>{decision.level}</div><p className="meta" style={{ marginTop: 8 }}>{decision.reason}</p><div className="actions"><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">查看投决评审</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印版报告</Link><Link href={`/projects/${project.id}/report`} className="btn">查看经营报告</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">查看敏感性</Link></div></section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 18 }}>{cards.map(([label, value, unit]) => <div key={label} className="card"><div className="meta">{label}</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: unit === 'rating' ? decision.color : label.includes('利润') || label.includes('净利') ? statusColor(Number(value)) : undefined }}>{unit === 'rating' ? value : fmt(value)}{unit === '%' ? '%' : ''}</div><div className="meta" style={{ marginTop: 4 }}>{unit === '%' ? '比例' : unit === 'rating' ? '自动判断' : unit}</div></div>)}</div>
    <section className="card" style={{ marginBottom: 18 }}><h2>核心税费</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">应缴增值税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.payableVat)}</div></div><div><span className="meta">附加税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.surcharge)}</div></div><div><span className="meta">土增税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.landVat.landVat)}</div></div><div><span className="meta">所得税</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(tax.incomeTax)}</div></div></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>数据体检</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '入口'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: row.ok ? '#2f9e44' : '#f08c00', fontWeight: 900 }}>{row.ok ? '正常' : '需关注'}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
    <section className="card"><h2>最近导入批次</h2>{activeBatches.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['文件', '模式', '行数', '含税合计', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{activeBatches.map((batch) => <tr key={batch.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><Link href={`/projects/${project.id}/import-batches/${batch.id}`}>{batch.fileName}</Link></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.importMode}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.rowCount}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(batch.taxInclusiveTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.status}</td></tr>)}</tbody></table></div> : <p className="meta">暂无导入批次。</p>}<div className="actions"><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">投决评审</Link><Link href={`/projects/${project.id}/report-print`} className="btn">打印版报告</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn">敏感性测算</Link><Link href={`/projects/${project.id}/report`} className="btn">经营报告</Link><Link href={`/projects/${project.id}/export`} className="btn">Excel导入导出</Link><Link href={`/projects/${project.id}/import-batches`} className="btn">导入批次</Link><Link href={`/projects/${project.id}/cost-mapping`} className="btn">科目映射</Link></div></section>
  </div></main>;
}
