import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { isChargingProductName, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '-';
}

function barWidth(amount: number, total: number) {
  return `${Math.min(100, total ? Math.max(amount / total * 100, 2) : 0)}%`;
}

export default async function RevenueSummaryPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } } }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], vatRate });
  const totalArea = n(project.saleableArea);
  const chargingRevenueRows = (version?.revenues || []).filter((row) => isChargingProductName(row.productType?.name)).length;
  const structure = [
    ['销售收入', revenue.ordinary.taxInclusive, revenue.ordinary.taxExclusive, revenue.ordinary.outputVat, '住宅、商业、配套等普通可售物业，按面积×单价。', 'revenue'],
    ['车位收入', revenue.parking.taxInclusive, revenue.parking.taxExclusive, revenue.parking.outputVat, '地下产权、使用权、人防、地上车位，按个数×单价。', 'parking-revenue'],
    ['其他收入', revenue.other.taxInclusive, revenue.other.taxExclusive, revenue.other.outputVat, '税收返还、产业奖励、财政补贴、土地款返还等。', 'other-revenue']
  ] as const;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">收入汇总</h1><p className="subtitle">统一查看普通销售收入、车位收入、其他政策性收入，不在本页直接录入数据。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue`} className="btn">销售收入测算</Link><Link href={`/projects/${project.id}/parking-revenue`} className="btn">车位收入</Link><Link href={`/projects/${project.id}/other-revenue`} className="btn">其他收入</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn btn-primary">经营总控</Link></div></div>

    <section className="card" style={{ marginBottom: 16 }}><div className="summary-strip"><div className="stat"><div className="stat-label">总含税收入</div><div className="stat-value">{fmt(revenue.taxInclusive)}元</div></div><div className="stat"><div className="stat-label">总不含税收入</div><div className="stat-value">{fmt(revenue.taxExclusive)}元</div></div><div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(revenue.outputVat)}元</div></div><div className="stat"><div className="stat-label">普通可售单方</div><div className="stat-value">{totalArea ? fmt(revenue.ordinary.taxInclusive / totalArea) : '0'}元/㎡</div></div></div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>收入构成</h2><div style={{ display: 'grid', gap: 12 }}>{structure.map(([name, inclusive, exclusive, tax, note, href]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><div><b>{name}</b><p className="meta" style={{ margin: '4px 0 0' }}>{note}</p></div><Link className="btn" href={`/projects/${project.id}/${href}`}>进入维护</Link></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 10 }}><div><span className="meta">含税金额</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(inclusive)}</div></div><div><span className="meta">不含税金额</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(exclusive)}</div></div><div><span className="meta">销项税额</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(tax)}</div></div><div><span className="meta">占总收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{pct(revenue.taxInclusive ? Number(inclusive) / revenue.taxInclusive : 0)}</div></div></div><div style={{ height: 10, background: '#eef2f6', borderRadius: 999, marginTop: 10 }}><div style={{ width: barWidth(Number(inclusive), revenue.taxInclusive || 1), height: 10, borderRadius: 999, background: '#0b7285' }} /></div></div>)}</div></section>

    <section className="card" style={{ borderColor: chargingRevenueRows ? '#ffc9c9' : '#b2f2bb', background: chargingRevenueRows ? '#fff5f5' : '#f0fff4' }}><h2>收入口径校验</h2><p className="meta">收入汇总只负责看总数；销售收入、车位收入、其他收入分别在专项页面维护。</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div><b>充电桩收入行</b><p className="meta">疑似充电桩收入行：{chargingRevenueRows} 条。充电桩不作为收入业态，应作为配置指标或设备/安装成本。</p></div><div><b>总收入构成</b><p className="meta">普通收入 + 车位收入 + 其他收入已统一进入经营总控和税金明细。</p></div></div></section>
  </div></main>;
}
