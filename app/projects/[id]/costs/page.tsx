import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getSubjectLabel(subject: any) {
  return `${subject.code} ${subject.fullPath || subject.name}`;
}

function unitCost(amount: unknown, area: number) {
  return area ? Number(amount || 0) / area : 0;
}

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };

export default async function TargetCostPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      costs: { include: { costSubject: true, productType: true }, orderBy: { createdAt: 'asc' } }
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
  const buildingUnitCost = unitCost(totalInclusive, buildingArea);
  const saleableUnitCost = unitCost(totalInclusive, saleableArea);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1480 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">九坤地产成本管理平台</p>
            <h1 className="title">目标成本测算</h1>
            <p className="subtitle">表格化录入，保留 Excel 量价逻辑：工程量 × 含税单价，系统自动拆不含税金额和税额。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">汇总表</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>成本明细已保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(totalInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">不含税成本</div><div className="stat-value">{fmt(totalExclusive)}元</div></div>
          <div className="stat"><div className="stat-label">进项税额</div><div className="stat-value">{fmt(totalTax)}元</div></div>
          <div className="stat"><div className="stat-label">建面 / 可售单方</div><div className="stat-value">{fmt(buildingUnitCost)} / {fmt(saleableUnitCost)}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
            <b>目标成本测算表</b>
            <span className="badge">草稿版</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1500, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['序号', '科目', '业态', '明细项目', '区域/业态', '专业/费用组', '测算依据', '工程量', '单位', '含税单价', '税率', '不含税金额', '税额', '含税金额', '建面单方', '可售单方', '分摊方式'].map((head) => (
                    <th key={head} style={{ ...cell, color: '#475467', textAlign: 'left' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#fffdf5' }}>
                  <td style={{ ...cell, color: '#ad6800', fontWeight: 900 }}>新增</td>
                  <td colSpan={16} style={{ padding: 0, borderBottom: '1px solid #eef2f6' }}>
                    <form action={`/api/projects/${project.id}/costs`} method="post" style={{ display: 'grid', gridTemplateColumns: '200px 140px 170px 130px 140px 140px 95px 70px 110px 80px 140px 110px', gap: 6, padding: 6, alignItems: 'center' }}>
                      <select name="costSubjectId" required><option value="">选择科目</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{getSubjectLabel(subject)}</option>)}</select>
                      <select name="productTypeId"><option value="">公共分摊</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
                      <input name="detailName" required placeholder="明细项目" />
                      <input name="regionOrProductType" placeholder="区域/业态" />
                      <input name="professionalGroup" placeholder="专业/费用组" />
                      <input name="measureBasis" placeholder="测算依据" />
                      <input name="quantity" type="number" step="0.01" placeholder="工程量" />
                      <input name="unit" placeholder="单位" />
                      <input name="taxInclusiveUnitPrice" type="number" step="0.01" placeholder="含税单价" />
                      <input name="taxRate" type="number" step="0.01" defaultValue="0.09" />
                      <input name="allocationMethod" placeholder="分摊方式" />
                      <button className="btn btn-primary" style={{ minHeight: 38 }}>保存</button>
                      <input name="description" placeholder="测算说明/取价依据" style={{ gridColumn: '1 / span 11' }} />
                      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><input name="isDirectAssigned" type="checkbox" style={{ width: 'auto' }} />直接归集</label>
                    </form>
                  </td>
                </tr>

                {costs.length === 0 ? (
                  <tr><td colSpan={17} style={{ padding: 18, color: '#667085', textAlign: 'center' }}>暂无成本明细。可先录入土地款、前期费、主体建安等关键项。</td></tr>
                ) : costs.map((row, index) => (
                  <tr key={row.id}>
                    <td style={cell}>{index + 1}</td>
                    <td style={{ ...cell, fontWeight: 800 }}>{row.costSubject.code} {row.costSubject.name}</td>
                    <td style={cell}>{row.productType?.name || '公共'}</td>
                    <td style={{ ...cell, fontWeight: 700 }}>{row.detailName}</td>
                    <td style={cell}>{row.regionOrProductType || '-'}</td>
                    <td style={cell}>{row.professionalGroup || '-'}</td>
                    <td style={cell}>{row.measureBasis || '-'}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.quantity)}</td>
                    <td style={cell}>{row.unit || '-'}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.taxInclusiveUnitPrice)}</td>
                    <td style={cell}>{fmt(Number(row.taxRate) * 100)}%</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.taxExclusiveAmount)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.taxAmount)}</td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(row.taxInclusiveAmount)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(unitCost(row.taxInclusiveAmount, buildingArea))}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(unitCost(row.taxInclusiveAmount, saleableArea))}</td>
                    <td style={cell}>{row.allocationMethod || (row.isDirectAssigned ? '直接归集' : '待分摊')}</td>
                  </tr>
                ))}
              </tbody>
              {costs.length > 0 ? (
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                    <td colSpan={11} style={{ ...cell, borderTop: '2px solid #d9e2ec' }}>合计</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalExclusive)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalTax)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalInclusive)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(buildingUnitCost)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(saleableUnitCost)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec' }} />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>

      <style>{`@media (max-width: 980px) { .summary-strip { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}
