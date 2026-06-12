import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function unitCost(amount: unknown, area: number) {
  return area ? Number(amount || 0) / area : 0;
}

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };

export default async function LandCostPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      costs: { include: { costSubject: true }, orderBy: { createdAt: 'asc' } }
    }
  });

  if (!project) return <main className="page">项目不存在</main>;

  const landCosts = (version?.costs || []).filter((row) => row.costSubject.code === '01' || row.costSubject.name.includes('土地'));
  const totalInclusive = landCosts.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = landCosts.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = landCosts.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const totalMu = landCosts.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1480 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">九坤地产成本管理平台</p>
            <h1 className="title">土地费用明细表</h1>
            <p className="subtitle">土地费单独作为明细表维护，按亩数和万元/亩录入，自动换算到目标成本测算。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs`} className="btn btn-primary">目标成本测算</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>土地费用已保存，并同步进入目标成本测算。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">土地费含税合计</div><div className="stat-value">{fmt(totalInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">土地费不含税</div><div className="stat-value">{fmt(totalExclusive)}元</div></div>
          <div className="stat"><div className="stat-label">可抵扣税额</div><div className="stat-value">{fmt(totalTax)}元</div></div>
          <div className="stat"><div className="stat-label">亩数合计</div><div className="stat-value">{fmt(totalMu)}亩</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
            <b>土地费用明细</b>
            <span className="badge">单独明细表</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1220, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['序号', '费用项目', '区域/地块', '土地面积', '单位', '单价（万元/亩）', '税率', '不含税金额', '税额', '含税金额', '建面单方', '可售单方', '分摊方式'].map((head) => (
                    <th key={head} style={{ ...cell, color: '#475467', textAlign: 'left' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#fffdf5' }}>
                  <td style={{ ...cell, color: '#ad6800', fontWeight: 900 }}>新增</td>
                  <td colSpan={12} style={{ padding: 0, borderBottom: '1px solid #eef2f6' }}>
                    <form action={`/api/projects/${project.id}/land`} method="post" style={{ display: 'grid', gridTemplateColumns: '170px 140px 110px 130px 90px 150px 130px 1fr 110px', gap: 6, padding: 6, alignItems: 'center' }}>
                      <input name="detailName" defaultValue="土地款" placeholder="费用项目" />
                      <input name="regionOrProductType" defaultValue="项目整体" placeholder="区域/地块" />
                      <input name="landMu" type="number" step="0.01" placeholder="面积亩" />
                      <input name="priceWanPerMu" type="number" step="0.01" placeholder="万元/亩" />
                      <input name="taxRate" type="number" step="0.01" defaultValue="0" />
                      <input name="allocationMethod" defaultValue="可售面积分摊" placeholder="分摊方式" />
                      <input name="description" placeholder="测算说明" />
                      <input name="remark" placeholder="备注" />
                      <button className="btn btn-primary" style={{ minHeight: 38 }}>保存</button>
                    </form>
                  </td>
                </tr>

                {landCosts.length === 0 ? (
                  <tr><td colSpan={13} style={{ padding: 18, color: '#667085', textAlign: 'center' }}>暂无土地费用。可先录入土地款：面积亩数 × 万元/亩。</td></tr>
                ) : landCosts.map((row, index) => (
                  <tr key={row.id}>
                    <td style={cell}>{index + 1}</td>
                    <td style={{ ...cell, fontWeight: 800 }}>{row.detailName}</td>
                    <td style={cell}>{row.regionOrProductType || '项目整体'}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.quantity)}</td>
                    <td style={cell}>{row.unit || '亩'}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(Number(row.taxInclusiveUnitPrice || 0) / 10000)}</td>
                    <td style={cell}>{fmt(Number(row.taxRate) * 100)}%</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.taxExclusiveAmount)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.taxAmount)}</td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(row.taxInclusiveAmount)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(unitCost(row.taxInclusiveAmount, buildingArea))}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(unitCost(row.taxInclusiveAmount, saleableArea))}</td>
                    <td style={cell}>{row.allocationMethod || '可售面积分摊'}</td>
                  </tr>
                ))}
              </tbody>
              {landCosts.length > 0 ? (
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                    <td colSpan={7} style={{ ...cell, borderTop: '2px solid #d9e2ec' }}>合计</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalExclusive)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalTax)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalInclusive)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(unitCost(totalInclusive, buildingArea))}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(unitCost(totalInclusive, saleableArea))}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec' }} />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
