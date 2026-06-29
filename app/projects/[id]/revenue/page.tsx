import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { isChargingProductName, isCommercialBaseProductName, isCommercialRevenueProductName, isOtherRevenueProductName, isParkingProductName } from '@/lib/tax-summary';
import { LOCKED_VERSION_EDIT_MESSAGE } from '@/lib/v1-maintenance-copy';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
    include: { products: true, taxes: true, revenues: { include: { productType: true } }, commercialRevenueLines: true }
  });

  const taxRate = Number(version?.taxes?.vatRate || 0.09);
  const revenueMap = new Map((version?.revenues || []).map((item) => [item.productTypeId, item]));
  const products = version?.products || [];
  const commercialParentIds = new Set<string>((version?.commercialRevenueLines || [])
    .filter((line) => Number(line.taxInclusiveRevenue || 0) > 0)
    .map((line) => line.parentProductTypeId)
    .filter((id): id is string => Boolean(id)));
  const excludedCommercialParents = products.filter((item) => item.isActive && item.isSaleable && commercialParentIds.has(item.id) && isCommercialBaseProductName(item.name));
  const ordinaryProducts = products.filter((item) => item.isActive
    && item.isSaleable
    && !commercialParentIds.has(item.id)
    && !isParkingProductName(item.name)
    && !isChargingProductName(item.name)
    && !isOtherRevenueProductName(item.name)
    && !isCommercialRevenueProductName(item.name));

  const rows = ordinaryProducts.map((item) => {
    const area = Number(item.saleableArea || 0);
    const price = Number(item.salePrice || 0);
    const result = calculateRevenueLine(area, price, taxRate);
    const maintained = revenueMap.get(item.id);
    const maintainedTotal = maintained ? Number(maintained.taxInclusiveRevenue || 0) : 0;
    return { id: item.id, name: item.name, area, price, total: result.taxInclusiveRevenue, net: result.taxExclusiveRevenue, fee: result.taxAmount, maintainedTotal, diff: result.taxInclusiveRevenue - maintainedTotal };
  });

  const totalArea = rows.reduce((sum, row) => sum + row.area, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const net = rows.reduce((sum, row) => sum + row.net, 0);
  const fee = rows.reduce((sum, row) => sum + row.fee, 0);
  const maintainedTotal = rows.reduce((sum, row) => sum + row.maintainedTotal, 0);
  const diffTotal = total - maintainedTotal;
  const zeroPriceRows = rows.filter((row) => row.area > 0 && row.price <= 0).length;
  const zeroAreaRows = rows.filter((row) => row.area <= 0).length;

  return <main className="page" style={{ background: '#eef3f8' }}>
    <div className="container" style={{ maxWidth: 1280 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">收入测算</p>
          <h1 className="title">销售收入测算</h1>
          <p className="subtitle">住宅、配套等普通可售物业按“可售面积 × 含税销售单价”测算；已拆分的一层/二层商业、车位和其他政策性收益在专项页面维护。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href={`/projects/${project.id}/revenue-summary`} className="btn btn-primary">收入汇总</Link>
          <Link href={`/projects/${project.id}/commercial-revenue`} className="btn">商业收入</Link>
          <Link href={`/projects/${project.id}/parking-revenue`} className="btn">车位收入</Link>
          <Link href={`/projects/${project.id}/other-revenue`} className="btn">其他收入</Link>
          <Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link>
        </div>
      </div>

      {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>销售收入单价已保存，并已同步收入明细。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
      {searchParams?.synced === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>销售收入已同步。{searchParams?.rows ? `本次同步 ${searchParams.rows} 行。` : ''}</div> : null}
      {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>{LOCKED_VERSION_EDIT_MESSAGE}</div> : null}
      {excludedCommercialParents.length ? <div className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>已排除商业父业态</b><p className="meta" style={{ margin: '6px 0 0' }}>{excludedCommercialParents.map((item) => item.name).join('、')} 已在“商业收入”页面拆分为一层、二层、自持出租等明细，本页不再按父业态整体计入销售收入。</p></div> : null}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="summary-strip">
          <div className="stat"><div className="stat-label">普通可售面积</div><div className="stat-value">{fmt(totalArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(total)}元</div></div>
          <div className="stat"><div className="stat-label">不含税销售收入</div><div className="stat-value">{fmt(net)}元</div></div>
          <div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(fee)}元</div></div>
          <div className="stat"><div className="stat-label">可售单方收入</div><div className="stat-value">{totalArea ? fmt(total / totalArea) : '0'}元/㎡</div></div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}>
        <b>本页口径</b>
        <p className="meta" style={{ margin: '6px 0 0' }}>本页只维护普通销售类收入。商业街/底商如已经拆分到一层、二层、自持出租等专项收入，父业态只作为面积容器和校验口径，不再重复计收入。</p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>销售收入明细</h2>
            <p className="meta">面积在项目概况维护；本表维护含税销售单价，并同步收入明细。</p>
          </div>
          <button form="revenue-batch" className="btn btn-primary">保存销售单价并同步</button>
        </div>
        {rows.length === 0 ? <p className="meta">暂无普通可售业态。请先到项目概况维护可售业态；商业收入请到“商业收入”页面维护。</p> : <div style={{ overflowX: 'auto' }}>
          <form id="revenue-batch" action={`/api/projects/${project.id}/revenue/batch`} method="post" />
          <input form="revenue-batch" type="hidden" name="rowCount" value={rows.length} />
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
            <thead><tr>{['业态', '可售面积㎡', '含税销售单价', '税率', '含税收入', '不含税收入', '销项税额', '已同步收入', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id}>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}><input form="revenue-batch" type="hidden" name={`productId-${index}`} value={row.id} />{row.name}</td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.area)}</td>
              <td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.price || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 140 }} /></td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{(taxRate * 100).toFixed(2)}%</td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.total)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.maintainedTotal)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: Math.abs(row.diff) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(row.diff)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>

      <section className="card">
        <h2>销售收入校验</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>销售单价</b><p className="meta">可售面积大于0但单价为0：{zeroPriceRows} 行</p><strong style={{ color: statusColor(zeroPriceRows === 0) }}>{zeroPriceRows === 0 ? '正常' : '待补充'}</strong></div>
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>可售面积</b><p className="meta">可售面积为0：{zeroAreaRows} 行</p><strong style={{ color: statusColor(zeroAreaRows === 0) }}>{zeroAreaRows === 0 ? '正常' : '待补充'}</strong></div>
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>同步差异</b><p className="meta">自动测算与已同步收入差异：{fmt(diffTotal)} 元</p><form action={`/api/projects/${project.id}/revenue/sync`} method="post"><button className="btn btn-primary">同步销售收入</button></form></div>
        </div>
      </section>
    </div>
  </main>;
}
