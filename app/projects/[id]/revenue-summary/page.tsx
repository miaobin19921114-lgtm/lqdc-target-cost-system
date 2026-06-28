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

function unitPrice(amountWan: number, area: number) {
  return area ? (amountWan * 10000) / area : 0;
}

function barWidth(amount: number, total: number) {
  return `${Math.min(100, total ? Math.max(amount / total * 100, 2) : 0)}%`;
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note ? <div className="meta">{note}</div> : null}</div>;
}

export default async function RevenueSummaryPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const totalArea = n(project.saleableArea);
  const chargingRevenueRows = (version?.revenues || []).filter((row) => isChargingProductName(row.productType?.name)).length;
  const avgSaleablePrice = unitPrice(revenue.taxInclusive, totalArea);
  const ordinarySaleablePrice = unitPrice(revenue.ordinary.taxInclusive, totalArea);
  const structure = [
    ['销售收入', revenue.ordinary.taxInclusive, revenue.ordinary.taxExclusive, revenue.ordinary.outputVat, '住宅、普通商铺、配套等普通可售物业，按面积×单价。', 'revenue'],
    ['商业专项收入', revenue.commercial.taxInclusive, revenue.commercial.taxExclusive, revenue.commercial.outputVat, '分层商业、自持出租、租售混合商业专项测算。', 'commercial-revenue'],
    ['车位收入', revenue.parking.taxInclusive, revenue.parking.taxExclusive, revenue.parking.outputVat, '地下产权、使用权、人防、地上车位，按个数×单价。', 'parking-revenue'],
    ['其他收入', revenue.other.taxInclusive, revenue.other.taxExclusive, revenue.other.outputVat, '税收返还、产业奖励、财政补贴、土地款返还等。', 'other-revenue']
  ] as const;

  const warnings = [
    { name: '可售面积', ok: totalArea > 0, text: totalArea > 0 ? `可售面积 ${fmt(totalArea)}㎡` : '可售面积未维护，收入单方无法判断', href: 'overview' },
    { name: '充电桩收入', ok: chargingRevenueRows === 0, text: chargingRevenueRows ? `发现 ${chargingRevenueRows} 条疑似充电桩收入行` : '未发现充电桩作为收入业态', href: 'product-maintenance' },
    { name: '商业专项', ok: revenue.commercial.taxInclusive >= 0, text: '商业专项收入已进入收入汇总和税金明细', href: 'commercial-revenue' },
    { name: '车位收入', ok: revenue.parking.taxInclusive >= 0, text: '车位收入已单独归集', href: 'parking-revenue' }
  ];

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">收入汇总</h1><p className="subtitle">收入汇总是经营测算的收入入口：统一查看销售收入、商业专项收入、车位收入和其他收入，金额单位为万元，单方为元/㎡。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue`} className="btn">销售收入测算</Link><Link href={`/projects/${project.id}/commercial-revenue`} className="btn">商业收入</Link><Link href={`/projects/${project.id}/parking-revenue`} className="btn">车位收入</Link><Link href={`/projects/${project.id}/other-revenue`} className="btn">其他收入</Link></div></div>

    <section className="card" style={{ marginBottom: 16 }}><h2>收入核心看板</h2><div className="summary-strip" style={{ marginTop: 12 }}><StatCard label="总含税收入（万元）" value={fmt(revenue.taxInclusive)} /><StatCard label="总不含税收入（万元）" value={fmt(revenue.taxExclusive)} /><StatCard label="销项税额（万元）" value={fmt(revenue.outputVat)} /><StatCard label="综合可售单方（元/㎡）" value={fmt(avgSaleablePrice)} note="含商业、车位和其他收入" /><StatCard label="普通可售单方（元/㎡）" value={fmt(ordinarySaleablePrice)} note="仅普通销售收入/总可售面积" /></div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>收入构成</h2><div style={{ display: 'grid', gap: 12 }}>{structure.map(([name, inclusive, exclusive, tax, note, href]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><div><b>{name}</b><p className="meta" style={{ margin: '4px 0 0' }}>{note}</p></div><Link className="btn" href={`/projects/${project.id}/${href}`}>进入维护</Link></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 10 }}><div><span className="meta">含税金额（万元）</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(inclusive)}</div></div><div><span className="meta">不含税金额（万元）</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(exclusive)}</div></div><div><span className="meta">销项税额（万元）</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(tax)}</div></div><div><span className="meta">占总收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{pct(revenue.taxInclusive ? Number(inclusive) / revenue.taxInclusive : 0)}</div></div></div><div style={{ height: 10, background: '#eef2f6', borderRadius: 999, marginTop: 10 }}><div style={{ width: barWidth(Number(inclusive), revenue.taxInclusive || 1), height: 10, borderRadius: 999, background: '#0b7285' }} /></div></div>)}</div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>收入口径校验</h2><p className="meta">收入汇总只负责看总数；销售收入、商业收入、车位收入、其他收入分别在专项页面维护。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '入口'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{warnings.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: row.ok ? '#2f9e44' : '#f08c00', fontWeight: 900 }}>{row.ok ? '正常' : '需关注'}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
  </div></main>;
}
