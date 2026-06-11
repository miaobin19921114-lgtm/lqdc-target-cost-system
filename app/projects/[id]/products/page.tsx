import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getVersion(projectId: string) {
  return prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: { products: true }
  });
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString();
}

export default async function ProductTypesPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await getVersion(params.id);
  if (!project) return <main className="page">项目不存在</main>;

  const products = version?.products || [];
  const totalBuildingArea = products.reduce((sum, item) => sum + Number(item.buildingArea || 0), 0);
  const totalSaleableArea = products.reduce((sum, item) => sum + Number(item.saleableArea || 0), 0);
  const totalCapacityArea = products.reduce((sum, item) => sum + Number(item.capacityArea || 0), 0);
  const totalRevenue = products.reduce((sum, item) => sum + Number(item.saleableArea || 0) * Number(item.salePrice || 0), 0);

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">业态面积 / 产品构成</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">维护高层、洋房、商业、车位等业态面积和销售单价，后续收入测算与成本分摊会引用这里。</p>
          </div>
          <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>业态已保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">业态数量</div><div className="stat-value">{products.length}</div></div>
          <div className="stat"><div className="stat-label">建筑面积合计</div><div className="stat-value">{money(totalBuildingArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">可售面积合计</div><div className="stat-value">{money(totalSaleableArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">含税货值估算</div><div className="stat-value">{money(totalRevenue)}元</div></div>
        </div>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>新增业态</h2>
          <form action={`/api/projects/${project.id}/products`} method="post">
            <div className="form-grid">
              <label>业态名称<input name="name" placeholder="如：高层住宅、洋房、商业、车位" required /></label>
              <label>建筑面积㎡<input name="buildingArea" type="number" step="0.01" /></label>
              <label>可售面积㎡<input name="saleableArea" type="number" step="0.01" /></label>
              <label>计容面积㎡<input name="capacityArea" type="number" step="0.01" /></label>
              <label>不可售面积㎡<input name="nonSaleableArea" type="number" step="0.01" /></label>
              <label>含税销售单价 元/㎡<input name="salePrice" type="number" step="0.01" /></label>
              <label>分摊权重<input name="allocationWeight" type="number" step="0.01" defaultValue="1" /></label>
              <label>备注<input name="remark" placeholder="面积口径、售价依据等" /></label>
            </div>
            <div className="actions">
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="isSaleable" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与销售</label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="participateAllocation" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与成本分摊</label>
            </div>
            <div className="actions">
              <button className="btn btn-primary">保存业态</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>业态清单</h2>
          {products.length === 0 ? (
            <p className="meta">暂无业态。先录入高层住宅、商业、车位等基础产品。</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    {['业态', '建筑面积', '可售面积', '计容面积', '不可售面积', '销售单价', '货值估算', '分摊'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => {
                    const revenue = Number(item.saleableArea || 0) * Number(item.salePrice || 0);
                    return (
                      <tr key={item.id}>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{item.name}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.buildingArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.saleableArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.capacityArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.nonSaleableArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.salePrice)}元/㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(revenue)}元</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{item.participateAllocation ? '参与' : '不参与'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
