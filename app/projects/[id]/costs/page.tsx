import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function unitCost(amount: unknown, area: number) {
  return area ? Number(amount || 0) / area : 0;
}

async function ensurePresetRows(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  if (count >= 100) return;
  const presetRows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  if (!presetRows.length) return;
  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: presetRows })
  ]);
}

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const inputStyle = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };

export default async function TargetCostPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string, error?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  await ensurePresetRows(project.id);

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      costs: { include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } }
    }
  });

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: {
      projectId: params.id,
      enabled: { not: '否' },
      costCode: { not: null },
      OR: [
        { detailSubject: { not: null } },
        { subjectLevel: { in: ['3', '4'] } }
      ]
    },
    orderBy: { rowIndex: 'asc' }
  });

  const products = version?.products || [];
  const costs = version?.costs || [];
  const costByCode = new Map<string, any>();
  costs.forEach((row) => costByCode.set(row.costSubject.code, row));

  const totalInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = costs.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const buildingUnitCost = unitCost(totalInclusive, buildingArea);
  const saleableUnitCost = unitCost(totalInclusive, saleableArea);
  const filledRows = dictionaryRows.filter((row) => row.costCode && costByCode.has(row.costCode)).length;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1600 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">九坤地产成本管理平台</p>
            <h1 className="title">目标成本测算</h1>
            <p className="subtitle">按 V57 成本科目预设行展开，科目、业态、测算依据、单位、税率、分摊方式已预置；只需要填工程量、含税单价和备注。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">汇总表</Link>
            <Link href={`/projects/${project.id}/cost-dictionary`} className="btn">成本词典</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>目标成本行已保存/更新。</div> : null}
        {searchParams?.error ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffc9c9' }}>保存失败：未找到成本科目。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(totalInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">不含税成本</div><div className="stat-value">{fmt(totalExclusive)}元</div></div>
          <div className="stat"><div className="stat-label">进项税额</div><div className="stat-value">{fmt(totalTax)}元</div></div>
          <div className="stat"><div className="stat-label">已填 / 预设行</div><div className="stat-value">{filledRows} / {dictionaryRows.length}</div></div>
          <div className="stat"><div className="stat-label">建面 / 可售单方</div><div className="stat-value">{fmt(buildingUnitCost)} / {fmt(saleableUnitCost)}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div><b>目标成本测算表｜预设科目行</b><div className="meta">类似明源云的目标成本编制体验：先铺好科目行，再逐行填量价。</div></div>
            <span className="badge">预设行模式</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', minWidth: 1900, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                  {['编码', '一级', '二级', '三级', '末级/明细科目', '区域/业态', '专业/费用组', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '建面单方', '可售单方', '分摊方式', '备注', '操作'].map((head) => (
                    <th key={head} style={{ ...cell, color: '#475467', textAlign: 'left' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dictionaryRows.length === 0 ? (
                  <tr><td colSpan={18} style={{ padding: 18, color: '#667085', textAlign: 'center' }}>暂无预设科目，请先进入成本科目词典重置 V57 词典。</td></tr>
                ) : dictionaryRows.map((dict, index) => {
                  const saved = dict.costCode ? costByCode.get(dict.costCode) : null;
                  const quantity = saved ? Number(saved.quantity || 0) : 0;
                  const unitPrice = saved ? Number(saved.taxInclusiveUnitPrice || 0) : 0;
                  const amount = saved ? Number(saved.taxInclusiveAmount || 0) : 0;
                  const isFilled = amount > 0;
                  return (
                    <tr key={dict.id} style={{ background: isFilled ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
                      <td style={{ ...cell, fontWeight: 900, color: '#0f4c5c' }}>{dict.costCode}</td>
                      <td style={cell}>{dict.firstSubject || '-'}</td>
                      <td style={cell}>{dict.secondSubject || '-'}</td>
                      <td style={cell}>{dict.thirdSubject || '-'}</td>
                      <td style={{ ...cell, fontWeight: 800 }}>{dict.detailSubject || dict.thirdSubject || dict.secondSubject || '-'}</td>
                      <td style={cell}>{saved?.regionOrProductType || dict.applicableProductType || '项目整体共用'}</td>
                      <td style={cell}>{saved?.professionalGroup || dict.sourceTable?.replace('表', '') || dict.secondSubject || '-'}</td>
                      <td style={cell}>{saved?.measureBasis || dict.measureBasis || '-'}</td>
                      <td style={{ ...cell, padding: 0 }}>
                        <form id={`cost-row-${dict.id}`} action={`/api/projects/${project.id}/costs`} method="post" />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="dictionaryRowId" value={dict.id} />
                        {saved ? <input form={`cost-row-${dict.id}`} type="hidden" name="costLineId" value={saved.id} /> : null}
                        <input form={`cost-row-${dict.id}`} name="quantity" type="number" step="0.01" defaultValue={quantity || ''} placeholder="填工程量" style={inputStyle} />
                      </td>
                      <td style={{ ...cell, padding: 0 }}>
                        <input form={`cost-row-${dict.id}`} name="unit" defaultValue={saved?.unit || dict.unit || ''} style={{ ...inputStyle, minWidth: 70 }} />
                      </td>
                      <td style={{ ...cell, padding: 0 }}>
                        <input form={`cost-row-${dict.id}`} name="taxInclusiveUnitPrice" type="number" step="0.01" defaultValue={unitPrice || ''} placeholder="填单价" style={inputStyle} />
                      </td>
                      <td style={{ ...cell, padding: 0 }}>
                        <input form={`cost-row-${dict.id}`} name="taxRate" defaultValue={dict.defaultTaxRate || (saved ? `${Number(saved.taxRate || 0) * 100}%` : '9%')} style={{ ...inputStyle, minWidth: 68 }} />
                      </td>
                      <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{fmt(unitCost(amount, buildingArea))}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{fmt(unitCost(amount, saleableArea))}</td>
                      <td style={cell}>{saved?.allocationMethod || dict.targetAllocationMethod || '按可售面积占比'}</td>
                      <td style={{ ...cell, padding: 0 }}>
                        <input form={`cost-row-${dict.id}`} name="remark" defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...inputStyle, minWidth: 130 }} />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="detailName" value={dict.detailSubject || dict.thirdSubject || dict.secondSubject || '未命名成本明细'} />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="regionOrProductType" value={saved?.regionOrProductType || dict.applicableProductType || '项目整体共用'} />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="professionalGroup" value={saved?.professionalGroup || dict.sourceTable?.replace('表', '') || dict.secondSubject || '目标成本'} />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="measureBasis" value={saved?.measureBasis || dict.measureBasis || ''} />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="allocationMethod" value={saved?.allocationMethod || dict.targetAllocationMethod || '按可售面积占比'} />
                        <input form={`cost-row-${dict.id}`} type="hidden" name="description" value={[dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / ')} />
                      </td>
                      <td style={{ ...cell, padding: 4 }}>
                        <button form={`cost-row-${dict.id}`} className="btn btn-primary" style={{ minHeight: 30, padding: '4px 10px' }}>{saved ? '更新' : '保存'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {costs.length > 0 ? (
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                    <td colSpan={12} style={{ ...cell, borderTop: '2px solid #d9e2ec' }}>合计</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(totalInclusive)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(buildingUnitCost)}</td>
                    <td style={{ ...cell, borderTop: '2px solid #d9e2ec', textAlign: 'right' }}>{fmt(saleableUnitCost)}</td>
                    <td colSpan={3} style={{ ...cell, borderTop: '2px solid #d9e2ec' }} />
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
