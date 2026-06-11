import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getSubjectLabel(subject: any) {
  return `${subject.code} ${subject.fullPath || subject.name}`;
}

export default async function TargetCostPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      costs: { include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } }
    }
  });
  const subjects = await prisma.costSubject.findMany({ where: { enabled: true }, orderBy: [{ code: 'asc' }] });

  if (!project) return <main className="page">项目不存在</main>;

  const products = version?.products || [];
  const costs = version?.costs || [];
  const totalInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = costs.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const buildingUnitCost = buildingArea ? totalInclusive / buildingArea : 0;
  const saleableUnitCost = saleableArea ? totalInclusive / saleableArea : 0;

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">目标成本测算</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">先建立量价成本明细，系统自动拆分不含税金额、税额、含税金额，并汇总建面单方/可售单方。</p>
          </div>
          <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>成本明细已保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(totalInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">不含税成本</div><div className="stat-value">{fmt(totalExclusive)}元</div></div>
          <div className="stat"><div className="stat-label">进项税额</div><div className="stat-value">{fmt(totalTax)}元</div></div>
          <div className="stat"><div className="stat-label">建面单方 / 可售单方</div><div className="stat-value">{fmt(buildingUnitCost)} / {fmt(saleableUnitCost)}</div></div>
        </div>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>新增成本明细</h2>
          <form action={`/api/projects/${project.id}/costs`} method="post">
            <div className="form-grid">
              <label>目标成本科目
                <select name="costSubjectId" required>
                  <option value="">请选择科目</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{getSubjectLabel(subject)}</option>)}
                </select>
              </label>
              <label>业态/产品
                <select name="productTypeId">
                  <option value="">不指定/公共分摊</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </label>
              <label>明细项目<input name="detailName" placeholder="如：主体建安工程、土地款、设计费" required /></label>
              <label>区域/业态<input name="regionOrProductType" placeholder="如：高层住宅、地下室、示范区" /></label>
              <label>专业/费用分组<input name="professionalGroup" placeholder="如：土建工程、安装工程、土地费" /></label>
              <label>测算依据<input name="measureBasis" placeholder="如：建筑面积、可售面积、合同金额" /></label>
              <label>工程量<input name="quantity" type="number" step="0.01" /></label>
              <label>单位<input name="unit" placeholder="㎡、m、项、元" /></label>
              <label>含税单价<input name="taxInclusiveUnitPrice" type="number" step="0.01" /></label>
              <label>税率<input name="taxRate" type="number" step="0.01" defaultValue="0.09" /></label>
              <label>分摊方式<input name="allocationMethod" placeholder="直接归集、可售面积分摊、建筑面积分摊" /></label>
              <label>测算说明<input name="description" placeholder="取价说明、计算口径" /></label>
            </div>
            <div className="actions">
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="isDirectAssigned" type="checkbox" style={{ width: 'auto' }} />直接归集到业态</label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>备注<textarea name="remark" placeholder="补充说明" /></label>
            </div>
            <div className="actions"><button className="btn btn-primary">保存成本明细</button></div>
          </form>
        </section>

        <section className="card">
          <h2>成本明细清单</h2>
          {costs.length === 0 ? (
            <p className="meta">暂无成本明细。可先录入土地款、前期费、主体建安等关键项。</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr>
                    {['科目', '明细项目', '业态', '工程量', '单位', '含税单价', '税率', '不含税金额', '税额', '含税金额'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costs.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.costSubject.code} {row.costSubject.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.detailName}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.productType?.name || row.regionOrProductType || '公共'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.quantity)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.unit || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxInclusiveUnitPrice)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(Number(row.taxRate) * 100)}%</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxExclusiveAmount)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxAmount)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxInclusiveAmount)}</td>
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
