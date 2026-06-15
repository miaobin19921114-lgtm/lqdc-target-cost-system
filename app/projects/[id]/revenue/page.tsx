import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const RATE = 0.09;
function fmt(value: number) { return value.toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function calc(area: number, price: number) {
  const total = area * price;
  const net = total / (1 + RATE);
  return { total, net, fee: total - net };
}

export default async function RevenuePage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; rows?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' }, include: { products: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const rows = (version?.products || []).filter((item) => item.isSaleable).map((item) => {
    const area = Number(item.saleableArea || 0);
    const price = Number(item.salePrice || 0);
    return { id: item.id, name: item.name, area, price, ...calc(area, price) };
  });
  const totalArea = rows.reduce((sum, row) => sum + row.area, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const net = rows.reduce((sum, row) => sum + row.net, 0);
  const fee = rows.reduce((sum, row) => sum + row.fee, 0);

  return <main className="page"><div className="container">
    <div className="page-header"><div><p className="eyebrow">收入明细表</p><h1 className="title">{project.name}</h1><p className="subtitle">可售面积来自项目概况表的业态/产品构成；销售单价在本表维护，并自动计算收入拆分。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>收入单价已保存。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">可售面积合计</div><div className="stat-value">{fmt(totalArea)}㎡</div></div><div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">不含税销售收入</div><div className="stat-value">{fmt(net)}元</div></div><div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(fee)}元</div></div></div>
    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>销售收入明细</h2><p className="meta">面积在概况表维护；本表只维护销售单价和收入口径。</p></div><button form="revenue-batch" className="btn btn-primary">保存销售单价</button></div>
      {rows.length === 0 ? <p className="meta">暂无可销售业态。请先到项目概况表选择并录入可销售产品。</p> : <div style={{ overflowX: 'auto' }}><form id="revenue-batch" action={`/api/projects/${project.id}/revenue/batch`} method="post" /><input form="revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}><thead><tr>{['业态', '可售面积㎡', '含税销售单价', '税率', '含税收入', '不含税收入', '销项税额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}><input form="revenue-batch" type="hidden" name={`productId-${index}`} value={row.id} />{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.area)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.price || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 140 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>9%</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.total)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td></tr>)}</tbody></table></div>}
    </section>
  </div></main>;
}
