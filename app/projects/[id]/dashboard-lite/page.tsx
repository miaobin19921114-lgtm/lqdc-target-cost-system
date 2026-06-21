import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function color(value: number) {
  return value >= 0 ? '#2f9e44' : '#e03131';
}

function unitCost(amountWan: number, area: number) {
  return area ? (amountWan * 10000) / area : 0;
}

function barWidth(amount: number, total: number) {
  return `${Math.min(100, total ? Math.max((amount / total) * 100, 2) : 0)}%`;
}

function resultLevel(netMargin: number, netProfit: number) {
  if (netProfit < 0) return { name: '暂缓推进', color: '#e03131', text: '基准方案为亏损状态，优先复核售价、成本和税费。' };
  if (netMargin >= 0.08) return { name: '建议推进', color: '#2f9e44', text: '净利率达到较好水平，可进入投决深化。' };
  if (netMargin >= 0.03) return { name: '谨慎推进', color: '#f08c00', text: '项目有利润但安全边际一般，应继续优化成本和售价。' };
  return { name: '重点优化', color: '#f08c00', text: '项目利润偏薄，建议先优化方案再提交投决。' };
}

export default async function DashboardLite({ params }: { params: { id: string } }) {
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
      taxes: true,
      importBatches: { orderBy: { createdAt: 'desc' }, take: 5 }
    }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const grossProfit = revenue.taxInclusive - cost.taxInclusive;
  const grossMargin = revenue.taxInclusive ? grossProfit / revenue.taxInclusive : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;
  const investmentRatio = revenue.taxInclusive ? cost.taxInclusive / revenue.taxInclusive : 0;
  const result = resultLevel(netMargin, tax.netProfit);
  const latestBatches = version?.importBatches || [];

  const metrics = [
    ['总货值/含税收入', fmt(revenue.taxInclusive), '万元'],
    ['总投资/含税成本', fmt(cost.taxInclusive), '万元'],
    ['销售毛利', fmt(grossProfit), '万元'],
    ['销售毛利率', pct(grossMargin), ''],
    ['税前利润', fmt(tax.profitBeforeIncomeTax), '万元'],
    ['税后净利', fmt(tax.netProfit), '万元'],
    ['销售净利率', pct(netMargin), ''],
    ['投资收入比', pct(investmentRatio), ''],
    ['建面单方成本', fmt(unitCost(cost.taxInclusive, buildingArea)), '元/㎡'],
    ['可售单方成本', fmt(unitCost(cost.taxInclusive, saleableArea)), '元/㎡']
  ];

  const taxRows = [
    ['销项税额', revenue.outputVat],
    ['进项税额', cost.inputVat],
    ['应缴增值税', tax.payableVat],
    ['附加税费', tax.surcharge],
    ['土地增值税', tax.landVat.landVat],
    ['企业所得税', tax.incomeTax],
    ['税费合计', tax.totalTax]
  ];

  const checks = [
    { name: '项目面积', ok: buildingArea > 0 && saleableArea > 0, text: buildingArea && saleableArea ? '已维护总建面和可售面积' : '总建面或可售面积缺失', href: 'overview' },
    { name: '业态清算对象', ok: true, text: '可在业态维护中检查 7 类土地增值税清算对象', href: 'product-maintenance' },
    { name: '成本末级数据', ok: effective.effective.length > 0, text: `有效末级成本 ${effective.effective.length} 行`, href: 'costs-batch' },
    { name: '临时导入科目', ok: effective.importedLeafRows === 0, text: effective.importedLeafRows ? `${effective.importedLeafRows} 条临时科目建议映射` : '无临时科目或已处理', href: 'cost-mapping' },
    { name: '税费链路', ok: true, text: '税费测算总表、土地增值税清算测算表、业态利润分析已接入', href: 'tax-details' },
    { name: '经营利润', ok: tax.netProfit >= 0, text: `税后净利 ${fmt(tax.netProfit)} 万元`, href: 'profit-analysis' }
  ];
  const warningCount = checks.filter((item) => !item.ok).length;

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">经营看板</p><h1 className="title">经营总控</h1><p className="subtitle">项目财务驾驶舱：看投决结论、货值投资、利润税负、数据风险和下一步动作。金额单位为万元，单方为元/㎡。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/decision`} className="btn btn-primary">投决评审</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税费测算总表</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土地增值税清算测算表</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">业态利润分析</Link><Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link></div></div>

    <section className="card" style={{ marginBottom: 18, borderColor: result.color }}><div className="meta">一、项目经营结论</div><div style={{ fontSize: 32, fontWeight: 900, color: result.color, marginTop: 6 }}>{result.name}</div><p className="meta" style={{ marginTop: 8 }}>{result.text}</p><p style={{ fontWeight: 900 }}>下一步：{warningCount ? `先处理 ${warningCount} 个数据关注项，再进入投决。` : '关键数据基本完整，可进入投决评审和经营报告。'}</p></section>

    <section className="card" style={{ marginBottom: 18 }}><h2>二、核心财务评价指标</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 12 }}>{metrics.map(([name, value, unit]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}><div className="meta">{name}</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: String(name).includes('利润') || String(name).includes('净利') ? color(Number(String(value).replace(/,/g, ''))) : undefined }}>{value}</div><div className="meta" style={{ marginTop: 4 }}>{unit}</div></div>)}</div></section>

    <section className="card" style={{ marginBottom: 18 }}><h2>三、税费与利润影响</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><tbody>{taxRows.map(([name, value]) => <tr key={name as string}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900 }}>{fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>万元</td></tr>)}</tbody></table></div><div className="actions"><Link href={`/projects/${project.id}/tax-details`} className="btn btn-primary">查看税费测算总表</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">查看土地增值税清算测算表</Link></div></section>

    <section className="card" style={{ marginBottom: 18 }}><h2>四、收入结构</h2><div style={{ display: 'grid', gap: 12 }}>{[['销售收入', revenue.ordinary.taxInclusive, 'revenue'], ['商业专项收入', revenue.commercial.taxInclusive, 'commercial-revenue'], ['车位收入', revenue.parking.taxInclusive, 'parking-revenue'], ['其他收入', revenue.other.taxInclusive, 'other-revenue']].map(([name, amount, href]) => <div key={name as string}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><b>{name}</b><span>{fmt(amount)} 万元</span></div><div style={{ height: 10, background: '#eef2f6', borderRadius: 999, marginTop: 6 }}><div style={{ width: barWidth(Number(amount), revenue.taxInclusive || 1), height: 10, borderRadius: 999, background: '#0b7285' }} /></div><div style={{ marginTop: 6 }}><Link className="btn" href={`/projects/${project.id}/${href}`}>进入维护</Link></div></div>)}</div></section>

    <section className="card" style={{ marginBottom: 18 }}><h2>五、成本结构</h2><div style={{ display: 'grid', gap: 12 }}>{[['土地费', cost.landCost], ['开发成本', cost.devCost], ['销管财费用', cost.saleManageFinance], ['进项税额', cost.inputVat]].map(([name, amount]) => <div key={name as string}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><b>{name}</b><span>{fmt(amount)} 万元</span></div><div style={{ height: 10, background: '#eef2f6', borderRadius: 999, marginTop: 6 }}><div style={{ width: barWidth(Number(amount), cost.taxInclusive || 1), height: 10, borderRadius: 999, background: '#0b7285' }} /></div></div>)}</div></section>

    <section className="card" style={{ marginBottom: 18 }}><h2>六、数据完整性检查</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '入口'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: row.ok ? '#2f9e44' : '#f08c00', fontWeight: 900 }}>{row.ok ? '正常' : '需关注'}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>

    <section className="card"><h2>七、最近导入批次</h2>{latestBatches.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['文件', '模式', '行数', '含税合计(万元)', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{latestBatches.map((batch) => <tr key={batch.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><Link href={`/projects/${project.id}/import-batches/${batch.id}`}>{batch.fileName}</Link></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.importMode}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.rowCount}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(batch.taxInclusiveTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.status}</td></tr>)}</tbody></table></div> : <p className="meta">暂无导入批次。</p>}</section>
  </div></main>;
}
