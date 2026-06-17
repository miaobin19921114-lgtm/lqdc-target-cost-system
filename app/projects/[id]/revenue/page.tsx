import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function isParkingProduct(name?: string | null) {
  const value = name || '';
  return value.includes('车位') || value.includes('人防');
}

function isChargingProduct(name?: string | null) {
  return (name || '').includes('充电');
}

function isOtherRevenueProduct(name?: string | null) {
  return (name || '').startsWith('其他收入-');
}

function statusColor(ok: boolean) {
  return ok ? '#2f9e44' : '#e03131';
}

export default async function RevenuePage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; synced?: string; rows?: string; locked?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } } }
  });

  const taxRate = Number(version?.taxes?.vatRate || 0.09);
  const revenueMap = new Map((version?.revenues || []).map((item) => [item.productTypeId, item]));
  const allProducts = version?.products || [];
  const parkingProducts = allProducts.filter((item) => item.isActive && item.isSaleable && isParkingProduct(item.name));
  const chargingProducts = allProducts.filter((item) => item.isActive && isChargingProduct(item.name));
  const ordinaryProducts = allProducts.filter((item) => item.isActive && item.isSaleable && !isParkingProduct(item.name) && !isChargingProduct(item.name) && !isOtherRevenueProduct(item.name));

  const rows = ordinaryProducts.map((item) => {
    const area = Number(item.saleableArea || 0);
    const price = Number(item.salePrice || 0);
    const result = calculateRevenueLine(area, price, taxRate);
    const maintained = revenueMap.get(item.id);
    const diff = maintained ? result.taxInclusiveRevenue - Number(maintained.taxInclusiveRevenue || 0) : result.taxInclusiveRevenue;
    return {
      id: item.id,
      name: item.name,
      area,
      price,
      total: result.taxInclusiveRevenue,
      net: result.taxExclusiveRevenue,
      fee: result.taxAmount,
      maintainedTotal: maintained ? Number(maintained.taxInclusiveRevenue || 0) : 0,
      diff
    };
  });

  const parkingRevenueLines = (version?.revenues || []).filter((row) => isParkingProduct(row.productType?.name));
  const otherRevenueLines = (version?.revenues || []).filter((row) => isOtherRevenueProduct(row.productType?.name));
  const chargingRevenueLines = (version?.revenues || []).filter((row) => isChargingProduct(row.productType?.name));
  const parkingTotal = parkingRevenueLines.reduce((sum, row) => sum + Number(row.taxInclusiveRevenue || 0), 0);
  const parkingNet = parkingRevenueLines.reduce((sum, row) => sum + Number(row.taxExclusiveRevenue || 0), 0);
  const parkingFee = parkingRevenueLines.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const otherTotal = otherRevenueLines.reduce((sum, row) => sum + Number(row.taxInclusiveRevenue || 0), 0);
  const otherNet = otherRevenueLines.reduce((sum, row) => sum + Number(row.taxExclusiveRevenue || 0), 0);
  const otherFee = otherRevenueLines.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);

  const totalArea = rows.reduce((sum, row) => sum + row.area, 0);
  const ordinaryTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const ordinaryNet = rows.reduce((sum, row) => sum + row.net, 0);
  const ordinaryFee = rows.reduce((sum, row) => sum + row.fee, 0);
  const maintainedTotal = rows.reduce((sum, row) => sum + row.maintainedTotal, 0);
  const diffTotal = ordinaryTotal - maintainedTotal;
  const total = ordinaryTotal + parkingTotal + otherTotal;
  const net = ordinaryNet + parkingNet + otherNet;
  const fee = ordinaryFee + parkingFee + otherFee;

  const zeroPriceRows = rows.filter((row) => row.area > 0 && row.price <= 0).length;
  const zeroAreaRows = rows.filter((row) => row.area <= 0).length;
  const taxMismatch = (version?.revenues || []).filter((row) => Number(row.taxInclusiveRevenue || 0) > 0 && Math.abs(Number(row.taxInclusiveRevenue || 0) - Number(row.taxExclusiveRevenue || 0) - Number(row.taxAmount || 0)) > 0.5).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">收入明细表</h1><p className="subtitle">普通业态按“可售面积×含税销售单价”测算；车位和其他政策性收益在专项页面维护。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}/parking-revenue`} className="btn">车位收入</Link><Link href={`/projects/${project.id}/other-revenue`} className="btn">其他收入</Link><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验中心</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>普通业态收入单价已保存，并已同步收入明细。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.synced === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>普通业态收入明细已同步。{searchParams?.rows ? `本次同步 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>当前版本已锁定，不能同步收入明细。</div> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">普通可售面积</div><div className="stat-value">{fmt(totalArea)}㎡</div></div><div className="stat"><div className="stat-label">普通业态收入</div><div className="stat-value">{fmt(ordinaryTotal)}元</div></div><div className="stat"><div className="stat-label">车位收入</div><div className="stat-value">{fmt(parkingTotal)}元</div></div><div className="stat"><div className="stat-label">其他收入</div><div className="stat-value">{fmt(otherTotal)}元</div></div><div className="stat"><div className="stat-label">总含税收入</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(fee)}元</div></div></div>

    <section className="card" style={{ marginBottom: 16 }}><h2>收入汇总</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">总含税收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(total)}</div></div><div><span className="meta">总不含税收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(net)}</div></div><div><span className="meta">总销项税额</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(fee)}</div></div><div><span className="meta">普通业态可售单方</span><div style={{ fontWeight: 900, fontSize: 20 }}>{totalArea > 0 ? fmt(ordinaryTotal / totalArea) : '0'}元/㎡</div></div></div></section>

    <section className="card" style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>普通业态收入</h2><p className="meta">住宅、商业、配套等普通业态按可售面积 × 含税销售单价。车位、充电桩、其他政策性收益不在这里混算。</p></div><button form="revenue-batch" className="btn btn-primary">保存普通业态单价并同步</button></div>
      {rows.length === 0 ? <p className="meta">暂无普通可售业态。请先到项目概况维护业态，车位收入和其他收入请到专项页面。</p> : <div style={{ overflowX: 'auto' }}><form id="revenue-batch" action={`/api/projects/${project.id}/revenue/batch`} method="post" /><input form="revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}><thead><tr>{['业态', '可售面积㎡', '含税销售单价', '税率', '含税收入', '不含税收入', '销项税额', '已同步收入', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}><input form="revenue-batch" type="hidden" name={`productId-${index}`} value={row.id} />{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.area)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.price || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 140 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{(taxRate * 100).toFixed(2)}%</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.total)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.maintainedTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: Math.abs(row.diff) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(row.diff)}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}><div><h2 style={{ margin: 0 }}>车位收入提示</h2><p className="meta" style={{ margin: '6px 0 0' }}>车位产品 {parkingProducts.length} 个，已同步车位收入行 {parkingRevenueLines.length} 条，车位含税收入 {fmt(parkingTotal)} 元。</p><Link href={`/projects/${project.id}/parking-revenue`} className="btn btn-primary" style={{ marginTop: 10 }}>进入车位收入测算</Link></div><div><h2 style={{ margin: 0 }}>其他收入提示</h2><p className="meta" style={{ margin: '6px 0 0' }}>其他收入行 {otherRevenueLines.length} 条，预计含税金额 {fmt(otherTotal)} 元，单独用于税收返还、产业奖励、财政补贴等。</p><Link href={`/projects/${project.id}/other-revenue`} className="btn btn-primary" style={{ marginTop: 10 }}>进入其他收入测算</Link></div></div></section>

    <section className="card"><h2>收入校验</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>普通业态单价</b><p className="meta">可售面积大于0但单价为0：{zeroPriceRows} 行</p><strong style={{ color: statusColor(zeroPriceRows === 0) }}>{zeroPriceRows === 0 ? '正常' : '待补充'}</strong></div><div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>普通业态面积</b><p className="meta">可售面积为0：{zeroAreaRows} 行</p><strong style={{ color: statusColor(zeroAreaRows === 0) }}>{zeroAreaRows === 0 ? '正常' : '待补充'}</strong></div><div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>同步差异</b><p className="meta">普通业态自动测算与已同步收入差异：{fmt(diffTotal)} 元</p><form action={`/api/projects/${project.id}/revenue/sync`} method="post"><button className="btn btn-primary">同步普通业态收入</button></form></div><div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>税额平衡</b><p className="meta">含税收入 - 不含税收入 - 销项税额异常：{taxMismatch} 行</p><strong style={{ color: statusColor(taxMismatch === 0) }}>{taxMismatch === 0 ? '正常' : '需复核'}</strong></div><div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>充电桩收入</b><p className="meta">疑似充电桩收入行：{chargingRevenueLines.length} 条</p><strong style={{ color: statusColor(chargingRevenueLines.length === 0) }}>{chargingRevenueLines.length === 0 ? '正常' : '需复核'}</strong></div></div></section>
  </div></main>;
}
