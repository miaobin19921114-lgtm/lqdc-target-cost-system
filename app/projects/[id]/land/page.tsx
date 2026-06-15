import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

export const dynamic = 'force-dynamic';

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const input = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
function fmt(value: unknown) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function single(value: unknown, area: number) { return area ? Number(value || 0) / area : 0; }

type TreeNode = { name: string; amount: number; rows: number; filled: number; children: Map<string, TreeNode>; leaves: any[] };

function node(name: string): TreeNode {
  return { name, amount: 0, rows: 0, filled: 0, children: new Map(), leaves: [] };
}

function child(parent: TreeNode, name: string) {
  const found = parent.children.get(name);
  if (found) return found;
  const created = node(name);
  parent.children.set(name, created);
  return created;
}

function addStat(target: TreeNode, amount: number, filled: boolean) {
  target.amount += amount;
  target.rows += 1;
  target.filled += filled ? 1 : 0;
}

async function ensureDictionary(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  if (count >= 100) return;
  const rows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: rows })
  ]);
}

export default async function LandCostPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string, batch?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  await ensureDictionary(project.id);

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { costs: { include: { costSubject: true }, orderBy: { sortOrder: 'asc' } } }
  });

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, sourceTable: '土地费用明细表' },
    orderBy: { rowIndex: 'asc' }
  });
  const leafRows = dictionaryRows.filter((row) => row.detailSubject);
  const leafCodes = new Set(leafRows.map((row) => row.costCode).filter(Boolean));
  const costs = version?.costs || [];
  const activeCosts = costs.filter((row) => row.professionalGroup === '土地费用' && leafCodes.has(row.costSubject.code));
  const costByCode = new Map<string, any>();
  costs.forEach((row) => costByCode.set(row.costSubject.code, row));

  const root = node('root');
  leafRows.forEach((row) => {
    const saved = row.costCode ? costByCode.get(row.costCode) : null;
    const amount = Number(saved?.taxInclusiveAmount || 0);
    const filled = amount > 0;
    const level1 = child(root, row.firstSubject || '土地成本');
    const level2 = child(level1, row.secondSubject || '土地取得价款及相关税费');
    const level3 = child(level2, row.thirdSubject || row.secondSubject || '土地费明细');
    addStat(level1, amount, filled);
    addStat(level2, amount, filled);
    addStat(level3, amount, filled);
    level3.leaves.push(row);
  });
  const levelOneRows = Array.from(root.children.values());

  const total = activeCosts.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1600 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">土地费用明细表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">土地费已改为科目树结构，上级科目只汇总，末级科目录入亩数、万元/亩、税率、备注。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总表</Link>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本编制</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>土地费用已保存。{searchParams?.batch ? `本次处理 ${searchParams.batch} 行。` : ''}</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">土地费合计</div><div className="stat-value">{fmt(total)}元</div></div>
          <div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div>
          <div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(single(total, saleableArea))}</div></div>
          <div className="stat"><div className="stat-label">已填 / 末级行</div><div className="stat-value">{activeCosts.length} / {leafRows.length}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div><b>土地费用明细｜科目树填报</b><div className="meta">土地面积按亩填，土地单价按万元/亩填；保存后自动汇入目标成本测算表和汇总表。</div></div>
            <button form="land-cost-batch" className="btn btn-primary">整表批量保存</button>
          </div>
          <form id="land-cost-batch" action={`/api/projects/${project.id}/land/batch`} method="post" />
          <div style={{ maxHeight: '72vh', overflow: 'auto', padding: 12 }}>
            {levelOneRows.length === 0 ? <p className="meta">暂无土地费用科目。</p> : levelOneRows.map((level1) => (
              <details key={level1.name} open style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
                <summary style={{ cursor: 'pointer', padding: 12, background: '#e9f7f8', display: 'grid', gridTemplateColumns: '1fr 130px 140px 130px 130px', gap: 10, alignItems: 'center', fontWeight: 900 }}>
                  <span>一级｜{level1.name}</span><span>已填 {level1.filled}/{level1.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level1.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level1.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level1.amount, saleableArea))}</span>
                </summary>
                <div style={{ padding: 10 }}>
                  {Array.from(level1.children.values()).map((level2) => (
                    <details key={level2.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                      <summary style={{ cursor: 'pointer', padding: 10, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 120px 140px 130px 130px', gap: 10, alignItems: 'center', fontWeight: 800 }}>
                        <span>二级｜{level2.name}</span><span>已填 {level2.filled}/{level2.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level2.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level2.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level2.amount, saleableArea))}</span>
                      </summary>
                      <div style={{ padding: 8 }}>
                        {Array.from(level2.children.values()).map((level3) => (
                          <details key={level3.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                            <summary style={{ cursor: 'pointer', padding: 10, background: '#fcfdff', display: 'grid', gridTemplateColumns: '1fr 120px 140px 130px 130px', gap: 10, alignItems: 'center' }}>
                              <b>三级｜{level3.name}</b><span>已填 {level3.filled}/{level3.rows}</span><span style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(level3.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level3.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level3.amount, saleableArea))}</span>
                            </summary>
                            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1350, borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead><tr style={{ background: '#fff' }}>{['编码', '末级科目', '区域/地块', '测算依据', '土地面积/工程量', '单位', '单价（万元/单位）', '税率', '含税金额', '建面单方', '可售单方', '分摊方式', '备注', '状态'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead>
                              <tbody>{level3.leaves.map((row, index) => {
                                const saved = row.costCode ? costByCode.get(row.costCode) : null;
                                const amount = Number(saved?.taxInclusiveAmount || 0);
                                const quantity = Number(saved?.quantity || 0);
                                const priceWan = Number(saved?.taxInclusiveUnitPrice || 0) / 10000;
                                return <tr key={row.id} style={{ background: amount > 0 ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
                                  <td style={{ ...cell, fontWeight: 900, color: '#0f4c5c' }}>{row.costCode}</td>
                                  <td style={{ ...cell, fontWeight: 800 }}>{row.detailSubject}</td>
                                  <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`regionOrProductType-${row.id}`} defaultValue={saved?.regionOrProductType || '项目整体'} style={{ ...input, minWidth: 110 }} /></td>
                                  <td style={cell}>{saved?.measureBasis || row.measureBasis || '土地面积/固定金额'}</td>
                                  <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" type="hidden" name="dictionaryRowId" value={row.id} />{saved ? <input form="land-cost-batch" type="hidden" name={`costLineId-${row.id}`} value={saved.id} /> : null}<input form="land-cost-batch" name={`quantity-${row.id}`} type="number" step="0.01" defaultValue={quantity || ''} placeholder="亩数/工程量" style={input} /></td>
                                  <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`unit-${row.id}`} defaultValue={saved?.unit || row.unit || '亩'} style={{ ...input, minWidth: 70 }} /></td>
                                  <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`priceWanPerUnit-${row.id}`} type="number" step="0.01" defaultValue={priceWan || ''} placeholder="万元/单位" style={input} /></td>
                                  <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`taxRate-${row.id}`} defaultValue={row.defaultTaxRate || '0%'} style={{ ...input, minWidth: 68 }} /></td>
                                  <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
                                  <td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, buildingArea))}</td>
                                  <td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, saleableArea))}</td>
                                  <td style={cell}>{saved?.allocationMethod || row.targetAllocationMethod || '按可售面积占比'}</td>
                                  <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`remark-${row.id}`} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...input, minWidth: 130 }} /></td>
                                  <td style={{ ...cell, color: amount > 0 ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{amount > 0 ? '已填' : '未填'}</td>
                                </tr>;
                              })}</tbody>
                            </table></div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
