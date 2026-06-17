import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { calculateRevenueLine } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function ParkingRevenuePage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; rows?: string; locked?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } } }
  });

  const taxRate = Number(version?.taxes?.vatRate || 0.09);
  const products = version?.products || [];
  const revenueMap = new Map((version?.revenues || []).map((item) => [item.productTypeId, item]));
  const definitions = [
    { name: '地下产权车位', count: Number(project.undergroundPropertyParkingCount || 0), desc: '产权车位，通常可单独销售' },
    { name: '地下使用权车位', count: Number(project.undergroundUseRightParkingCount || 0), desc: '使用权车位，按项目实际销售口径处理' },
    { name: '人防车位', count: Number(project.civilDefenseParkingCount || 0), desc: '人防车位，销售/出租口径需结合当地政策和合同约定' },
    { name: '地上车位', count: Number(project.aboveGroundParkingCount || 0), desc: '地上车位，按个数单价测算' }
  ];

  const rows = definitions.map((item) => {
    const product = products.find((p) => p.name === item.name);
    const count = item.count || Number(product?.saleableArea || 0);
    const price = Number(product?.salePrice || 0);
    const result = calculateRevenueLine(count, price, taxRate);
    const maintained = product ? revenueMap.get(product.id) : null;
    return {
      ...item,
      count,
      price,
      total: result.taxInclusiveRevenue,
      net: result.taxExclusiveRevenue,
      fee: result.taxAmount,
      maintainedTotal: maintained ? Number(maintained.taxInclusiveRevenue || 0) : 0,
      diff: result.taxInclusiveRevenue - (maintained ? Number(maintained.taxInclusiveRevenue || 0) : 0)
    };
  });

  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const net = rows.reduce((sum, row) => sum + row.net, 0);
  const fee = rows.reduce((sum, row) => sum + row.fee, 0);
  const maintainedTotal = rows.reduce((sum, row) => sum + row.maintainedTotal, 0);
  const diffTotal = total - maintainedTotal;

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">车位收入测算</h1><p className="subtitle">车位销售通常按“个数 × 单个车位含税销售单价”测算，不按面积单价。保存后会同步到收入明细。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/parking`} className="btn">车位配置</Link><Link href={`/projects/${project.id}/revenue`} className="btn">收入明细</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>车位收入已保存并同步。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>当前版本已锁定，不能保存车位收入。</div> : null}
    <section className="card" style={{ marginBottom: 16 }}><div className="summary-strip"><div className="stat"><div className="stat-label">可售/可测车位</div><div className="stat-value">{fmt(totalCount)}个</div></div><div className="stat"><div className="stat-label">含税车位收入</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">不含税收入</div><div className="stat-value">{fmt(net)}元</div></div><div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(fee)}元</div></div></div></section>
    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>口径说明</b><p className="meta" style={{ margin: '6px 0 0' }}>系统为了不新增复杂字段，车位业态的“可售面积”字段暂存车位个数；收入公式仍为 数量 × 含税单价。住宅、商业等业态继续按面积 × 单价测算。</p></section>
    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>车位销售收入明细</h2><p className="meta">车位数量来自车位配置页；本表维护单个车位含税销售单价。</p></div><button form="parking-revenue-batch" className="btn btn-primary">保存并同步收入</button></div>
      <div style={{ overflowX: 'auto' }}><form id="parking-revenue-batch" action={`/api/projects/${project.id}/parking-revenue/batch`} method="post" /><input form="parking-revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040 }}><thead><tr>{['车位类型', '数量/个', '单个含税销售单价', '税率', '含税收入', '不含税收入', '销项税额', '已同步收入', '差异', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><input form="parking-revenue-batch" type="hidden" name={`name-${index}`} value={row.name} />{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><input form="parking-revenue-batch" type="hidden" name={`count-${index}`} value={row.count} />{fmt(row.count)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="parking-revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.price || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 150 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{(taxRate * 100).toFixed(2)}%</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.total)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.maintainedTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: Math.abs(row.diff) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(row.diff)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.desc}</td></tr>)}</tbody></table></div>
    </section>
  </div></main>;
}
