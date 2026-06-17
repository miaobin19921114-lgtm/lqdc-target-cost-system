import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function fmt(value: number) { return value.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

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
  const rows = (version?.products || []).filter((item) => item.isActive && item.isSaleable).map((item) => {
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
  const totalArea = rows.reduce((sum, row) => sum + row.area, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const net = rows.reduce((sum, row) => sum + row.net, 0);
  const fee = rows.reduce((sum, row) => sum + row.fee, 0);
  const maintainedTotal = rows.reduce((sum, row) => sum + row.maintainedTotal, 0);
  const diffTotal = total - maintainedTotal;

  return <main className="page"><div className="container">
    <div className="page-header"><div><p className="eyebrow">收入明细表</p><h1 className="title">{project.name}</h1><p className="subtitle">只显示当前版本中启用且可销售的业态；保存销售单价后会自动同步收入明细，也可手动一键同步。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}/summary-check`} className="btn">汇总校验</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>收入单价已保存，并已同步收入明细。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.synced === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>收入明细已同步。{searchParams?.rows ? `本次同步 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>当前版本已锁定，不能同步收入明细。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">可售面积合计</div><div className="stat-value">{fmt(totalArea)}㎡</div></div><div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">不含税销售收入</div><div className="stat-value">{fmt(net)}元</div></div><div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(fee)}元</div></div></div>
    <section className="card" style={{ marginBottom: 16 }}><h2>收入明细同步状态</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">业态自动测算含税收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(total)}</div></div><div><span className="meta">已同步收入明细</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(maintainedTotal)}</div></div><div><span className="meta">差异</span><div style={{ fontWeight: 900, fontSize: 20, color: Math.abs(diffTotal) > 1 ? '#e03131' : '#2f9e44' }}>{fmt(diffTotal)}</div></div><div><form action={`/api/projects/${project.id}/revenue/sync`} method="post"><button className="btn btn-primary">一键同步收入明细</button></form></div></div></section>
    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>销售收入明细</h2><p className="meta">面积在概况表维护；本表维护销售单价，并同步收入明细。</p></div><button form="revenue-batch" className="btn btn-primary">保存销售单价并同步</button></div>
      {rows.length === 0 ? <p className="meta">暂无启用且可销售的业态。请先到项目概况表选择并录入可销售产品，或到业态维护页恢复已停用业态。</p> : <div style={{ overflowX: 'auto' }}><form id="revenue-batch" action={`/api/projects/${project.id}/revenue/batch`} method="post" /><input form="revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}><thead><tr>{['业态', '可售面积㎡', '含税销售单价', '税率', '含税收入', '不含税收入', '销项税额', '已同步收入', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}><input form="revenue-batch" type="hidden" name={`productId-${index}`} value={row.id} />{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.area)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.price || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 140 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{(taxRate * 100).toFixed(2)}%</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.total)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.maintainedTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: Math.abs(row.diff) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(row.diff)}</td></tr>)}</tbody></table></div>}
    </section>
  </div></main>;
}
