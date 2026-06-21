import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function status(level: 'ok' | 'warn' | 'error') {
  if (level === 'ok') return { text: '正常', color: '#2f9e44' };
  if (level === 'warn') return { text: '提醒', color: '#f08c00' };
  return { text: '需处理', color: '#e03131' };
}

export default async function SummaryCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { productType: true, costSubject: true } }, taxes: true }
  });

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const activeProducts = (version?.products || []).filter((p) => p.isActive);
  const saleableProductArea = activeProducts.reduce((sum, p) => sum + n(p.saleableArea), 0);
  const overviewSaleableArea = n(project.saleableArea);
  const areaDiff = Math.abs(saleableProductArea - overviewSaleableArea);
  const areaDiffRate = overviewSaleableArea ? areaDiff / overviewSaleableArea : 0;

  const checks = [
    { name: '当前启用版本', level: version ? 'ok' : 'error', note: version?.name || '未找到启用版本' },
    { name: '项目概况面积', level: n(project.totalBuildingArea) > 0 && overviewSaleableArea > 0 ? 'ok' : 'warn', note: `总建面：${fmt(project.totalBuildingArea)}；可售面积：${fmt(project.saleableArea)}` },
    { name: '业态面积联动', level: areaDiffRate <= 0.01 ? 'ok' : 'warn', note: `概况可售：${fmt(overviewSaleableArea)}；业态可售合计：${fmt(saleableProductArea)}；差异：${fmt(areaDiff)}` },
    { name: '收入测算', level: revenue.taxInclusive > 0 ? 'ok' : 'warn', note: `含税收入：${fmt(revenue.taxInclusive)}；收入行：${version?.revenues.length || 0}` },
    { name: '成本测算', level: cost.taxInclusive > 0 ? 'ok' : 'warn', note: `含税成本：${fmt(cost.taxInclusive)}；有效成本行：${effective.effective.length}；排除父级/非末级：${effective.ignoredNonLeaf}` },
    { name: '税费参数', level: version?.taxes ? 'ok' : 'warn', note: version?.taxes ? `增值税率：${fmt(n(version.taxes.vatRate) * 100)}%` : '未配置税费参数，使用默认税率口径' },
    { name: '可售单方', level: overviewSaleableArea > 0 ? 'ok' : 'warn', note: overviewSaleableArea > 0 ? `含税成本可售单方：${fmt(cost.taxInclusive / overviewSaleableArea)} 元/㎡` : '缺少可售面积，无法计算可售单方' }
  ] as const;

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">汇总联动校验</p><h1 className="title">{project.name}</h1><p className="subtitle">检查概况、业态、收入、成本、税费与汇总口径是否具备联动计算基础。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary" href={`/projects/${project.id}/summary`}>目标成本汇总</Link><Link className="btn" href={`/projects/${project.id}/revenue`}>收入明细</Link><Link className="btn" href={`/projects/${project.id}/tax-details`}>税费测算总表</Link><Link className="btn" href={`/projects/${project.id}`}>返回项目测算中心</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税收入</div><div className="stat-value">{fmt(revenue.taxInclusive)}</div></div><div className="stat"><div className="stat-label">含税成本</div><div className="stat-value">{fmt(cost.taxInclusive)}</div></div><div className="stat"><div className="stat-label">业态可售合计</div><div className="stat-value">{fmt(saleableProductArea)}</div></div><div className="stat"><div className="stat-label">面积差异</div><div className="stat-value">{fmt(areaDiff)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>联动检查项</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((item) => { const s = status(item.level); return <tr key={item.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{item.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: s.color, fontWeight: 900 }}>{s.text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{item.note}</td></tr>; })}</tbody></table></div></section>
  </div></main>;
}
