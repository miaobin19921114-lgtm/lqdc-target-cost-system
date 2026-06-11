import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VAT_RATE = 0.09;

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function calcRevenue(saleableArea: number, salePrice: number) {
  const taxInclusiveRevenue = saleableArea * salePrice;
  const taxExclusiveRevenue = taxInclusiveRevenue / (1 + VAT_RATE);
  const taxAmount = taxInclusiveRevenue - taxExclusiveRevenue;
  return { taxInclusiveRevenue, taxExclusiveRevenue, taxAmount };
}

export default async function RevenuePage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true }
  });

  if (!project) return <main className="page">项目不存在</main>;

  const products = version?.products || [];
  const rows = products
    .filter((item) => item.isSaleable)
    .map((item) => {
      const saleableArea = Number(item.saleableArea || 0);
      const salePrice = Number(item.salePrice || 0);
      return {
        id: item.id,
        name: item.name,
        saleableArea,
        salePrice,
        ...calcRevenue(saleableArea, salePrice)
      };
    });

  const totalInclusive = rows.reduce((sum, row) => sum + row.taxInclusiveRevenue, 0);
  const totalExclusive = rows.reduce((sum, row) => sum + row.taxExclusiveRevenue, 0);
  const totalTax = rows.reduce((sum, row) => sum + row.taxAmount, 0);
  const totalArea = rows.reduce((sum, row) => sum + row.saleableArea, 0);

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">收入明细表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">自动引用“业态面积 / 产品构成”的可售面积与含税销售单价，按 9% 增值税拆分不含税收入和销项税额。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/products`} className="btn">维护业态</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">可售面积合计</div><div className="stat-value">{fmt(totalArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(totalInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">不含税销售收入</div><div className="stat-value">{fmt(totalExclusive)}元</div></div>
          <div className="stat"><div className="stat-label">销项税额</div><div className="stat-value">{fmt(totalTax)}元</div></div>
        </div>

        <section className="card">
          <h2>销售收入明细</h2>
          {rows.length === 0 ? (
            <p className="meta">暂无可销售业态。请先到“业态面积 / 产品构成”录入可销售产品。</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                <thead>
                  <tr>
                    {['业态', '可售面积㎡', '含税销售单价', '税率', '含税收入', '不含税收入', '销项税额'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.saleableArea)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.salePrice)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>9%</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxInclusiveRevenue)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxExclusiveRevenue)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
