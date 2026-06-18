import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function levelColor(level: string) { return level === '建议推进' ? '#2f9e44' : level === '谨慎推进' ? '#f08c00' : '#e03131'; }

export default async function BossReportPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { costSubject: true, productType: true } }, taxes: true }
  });

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
  const saleableUnitCost = saleableArea ? cost.taxInclusive / saleableArea : 0;
  const buildingUnitCost = buildingArea ? cost.taxInclusive / buildingArea : 0;

  const decision = tax.netProfit < 0
    ? { level: '暂缓推进', reason: '当前测算税后亏损，应优先复核售价、土地成本、建安成本和税费口径。' }
    : netMargin >= 0.08
      ? { level: '建议推进', reason: '当前测算盈利能力较好，可进入方案深化、成本锁定和销售去化验证。' }
      : { level: '谨慎推进', reason: '当前测算盈利但利润偏薄，需要继续压降成本、复核售价和优化车位/商业收入。' };

  const cards = [
    ['投决建议', decision.level, 'text'],
    ['含税总收入', revenue.taxInclusive, 'money'],
    ['含税目标成本', cost.taxInclusive, 'money'],
    ['税后净利', tax.netProfit, 'money'],
    ['销售净利率', netMargin, 'percent'],
    ['可售单方成本', saleableUnitCost, 'unit'],
    ['建面单方成本', buildingUnitCost, 'unit'],
    ['综合税费', tax.totalTax, 'money']
  ] as const;

  const incomeRows = [
    ['销售收入', revenue.ordinary.taxInclusive],
    ['商业专项收入', revenue.commercial.taxInclusive],
    ['车位收入', revenue.parking.taxInclusive],
    ['其他收入', revenue.other.taxInclusive]
  ] as const;

  const costRows = [
    ['土地成本', cost.landCost],
    ['开发成本', cost.devCost],
    ['销售/管理/财务费用', cost.saleManageFinance],
    ['进项税额', cost.inputVat]
  ] as const;

  const riskRows = [
    ['利润安全垫', netMargin >= 0.08 ? '低' : netMargin >= 0 ? '中' : '高', `税后净利 ${fmt(tax.netProfit)}，净利率 ${pct(netMargin)}。`],
    ['成本口径', effective.ignoredNonLeaf ? '中' : '低', effective.ignoredNonLeaf ? `已排除 ${effective.ignoredNonLeaf} 条父级/非末级成本行，避免重复计入。` : '成本已按有效末级行汇总。'],
    ['收入口径', revenue.commercial.taxInclusive ? '低' : '中', revenue.commercial.taxInclusive ? '商业专项收入已单独纳入，父业态不重复计入。' : '暂无商业专项收入，需确认商业是否需要拆分。'],
    ['税费口径', tax.totalTax > 0 ? '低' : '中', `增值税、附加、土增税、所得税合计 ${fmt(tax.totalTax)}。`]
  ] as const;

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header no-print"><div><p className="eyebrow">老板汇报版</p><h1 className="title">{project.name}</h1><p className="subtitle">一页看结论：收入、成本、利润、税费、风险和下一步动作。口径已统一为商业专项收入 + 有效末级成本。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}/report`} className="btn">经营报告</Link><Link href={`/projects/${project.id}/report-export`} className="btn">PDF/Word导出</Link><Link href={`/projects/${project.id}`} className="btn btn-primary">返回工作台</Link></div></div>

    <section className="card" style={{ marginBottom: 16, borderColor: levelColor(decision.level) }}><div className="meta">核心结论</div><div style={{ fontSize: 34, fontWeight: 900, color: levelColor(decision.level), marginTop: 8 }}>{decision.level}</div><p style={{ fontWeight: 800, lineHeight: 1.8 }}>{decision.reason}</p><p className="meta">当前版本：{version?.name || '当前版本'}｜阶段：{version?.stage || '投拓阶段'}｜城市/区域：{project.city || '-'} / {project.district || '-'}</p></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>一、老板关注指标</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>{cards.map(([label, value, type]) => <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}><div className="meta">{label}</div><div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: label.includes('净利') ? statusColor(Number(value)) : type === 'text' ? levelColor(String(value)) : undefined }}>{type === 'percent' ? pct(Number(value)) : type === 'text' ? value : fmt(value)}</div><div className="meta">{type === 'unit' ? '元/㎡' : type === 'percent' ? '比例' : type === 'money' ? '元' : '自动判断'}</div></div>)}</div></section>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
      <section className="card"><h2>二、收入构成</h2><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>{incomeRows.map(([name, amount]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{revenue.taxInclusive ? pct(Number(amount) / revenue.taxInclusive) : '0%'}</td></tr>)}</tbody></table></section>
      <section className="card"><h2>三、成本结构</h2><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>{costRows.map(([name, amount]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{cost.taxInclusive ? pct(Number(amount) / cost.taxInclusive) : '0%'}</td></tr>)}</tbody></table></section>
    </div>

    <section className="card" style={{ marginTop: 16 }}><h2>四、主要风险与动作</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse' }}><thead><tr>{['事项', '等级', '说明', '建议动作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{riskRows.map(([name, level, text]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900, color: level === '高' ? '#e03131' : level === '中' ? '#f08c00' : '#2f9e44' }}>{level}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{level === '高' ? '先复核后上会' : level === '中' ? '专项复核' : '持续跟踪'}</td></tr>)}</tbody></table></div></section>

    <section className="card" style={{ marginTop: 16 }}><h2>五、下一步</h2><ol style={{ lineHeight: 1.9, margin: 0, paddingLeft: 20 }}><li>复核土地费、建安工程费和商业/车位收入口径。</li><li>若净利率偏薄，优先做售价、车位价格、建安单方和营销费用敏感性测算。</li><li>定稿前导出经营报告和税务报告，作为投决会附件。</li></ol></section>
  </div></main>;
}
