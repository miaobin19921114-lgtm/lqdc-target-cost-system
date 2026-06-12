import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function LandCostPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { costs: { include: { costSubject: true }, orderBy: { sortOrder: 'asc' } } }
  });

  if (!project) return <main className="page">Project not found</main>;

  const rows = (version?.costs || []).filter((row) => row.costSubject.code === '01');
  const total = rows.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">九坤地产成本管理平台</p>
            <h1 className="title">土地费用明细表</h1>
            <p className="subtitle">按亩数和万元/亩录入土地费用，保存后进入目标成本测算。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs`} className="btn btn-primary">目标成本测算</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">土地费合计</div><div className="stat-value">{fmt(total)}元</div></div>
          <div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(buildingArea ? total / buildingArea : 0)}</div></div>
          <div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(saleableArea ? total / saleableArea : 0)}</div></div>
          <div className="stat"><div className="stat-label">明细条数</div><div className="stat-value">{rows.length}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>新增土地费用</h2>
          <form action={`/api/projects/${project.id}/land`} method="post">
            <div className="form-grid">
              <label>费用项目<input name="detailName" defaultValue="土地款" /></label>
              <label>区域/地块<input name="regionOrProductType" defaultValue="项目整体" /></label>
              <label>土地面积（亩）<input name="landMu" type="number" step="0.01" /></label>
              <label>土地单价（万元/亩）<input name="priceWanPerMu" type="number" step="0.01" /></label>
              <label>税率<input name="taxRate" type="number" step="0.01" defaultValue="0" /></label>
              <label>分摊方式<input name="allocationMethod" defaultValue="可售面积分摊" /></label>
            </div>
            <div className="actions"><button className="btn btn-primary">保存土地费用</button></div>
          </form>
        </section>

        <section className="card">
          <h2>土地费用明细</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr>{['费用项目', '区域/地块', '面积亩', '万元/亩', '含税金额', '分摊方式'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={6} style={{ padding: 16, color: 'var(--muted)' }}>暂无土地费用明细。</td></tr> : rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.detailName}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.regionOrProductType || '项目整体'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.quantity)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(Number(row.taxInclusiveUnitPrice || 0) / 10000)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{fmt(row.taxInclusiveAmount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.allocationMethod || '可售面积分摊'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
