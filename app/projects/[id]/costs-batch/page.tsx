import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';
import { suggestQuantityFromOverview } from '@/lib/overview-quantity';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const input = { width: '100%', minWidth: 90, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
function fmt(v: unknown) { return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function single(v: unknown, area: number) { return area ? Number(v || 0) / area : 0; }

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

export default async function TargetCostBatchPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string, batch?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  await ensureDictionary(project.id);

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { costs: { include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } } }
  });
  const rawCosts = version?.costs || [];
  const costs = rawCosts.filter((item) => !item.productTypeId || item.productType?.isActive);
  const ignoredDisabledCostRows = rawCosts.length - costs.length;
  const byCode = new Map<string, any>();
  costs.forEach((item) => byCode.set(item.costSubject.code, item));

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    orderBy: { rowIndex: 'asc' }
  });
  const leafRows = dictionaryRows.filter((row) => row.detailSubject);
  const leafCodes = new Set(leafRows.map((row) => row.costCode).filter(Boolean));
  const activeCosts = costs.filter((item) => leafCodes.has(item.costSubject.code));

  const root = node('root');
  leafRows.forEach((row) => {
    const saved = row.costCode ? byCode.get(row.costCode) : null;
    const amount = Number(saved?.taxInclusiveAmount || 0);
    const filled = amount > 0;
    const level1 = child(root, row.firstSubject || '未分类');
    const level2 = child(level1, row.secondSubject || '未分类');
    const level3 = child(level2, row.thirdSubject || row.secondSubject || '未分类');
    addStat(level1, amount, filled);
    addStat(level2, amount, filled);
    addStat(level3, amount, filled);
    level3.leaves.push(row);
  });
  const levelOneRows = Array.from(root.children.values());

  const total = activeCosts.reduce((sum, item) => sum + Number(item.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1700 }}>
    <div className="page-header"><div><p className="eyebrow">目标成本编制</p><h1 className="title">{project.name}</h1><p className="subtitle">树状科目：工程量优先从项目概况表自动带入；一级 / 二级 / 三级为汇总节点，四级末级科目才允许录入单价、税率、备注。当前只编辑当前启用版本，停用业态关联成本不再参与汇总。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">汇总表</Link><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>整表已保存。{searchParams?.batch ? `本次处理 ${searchParams.batch} 行。` : ''}</div> : null}
    {ignoredDisabledCostRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除 {ignoredDisabledCostRows} 条停用业态关联成本行，不参与目标成本汇总。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(total)}</div></div><div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div><div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(single(total, saleableArea))}</div></div><div className="stat"><div className="stat-label">末级预设行</div><div className="stat-value">{leafRows.length}</div></div></div>
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}><div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><b>目标成本测算表｜科目树填报</b><div className="meta">上级科目自动汇总，不保存为成本行；未保存的末级科目会按概况表默认带出工程量。</div></div><button form="target-cost-batch" className="btn btn-primary">整表批量保存</button></div><form id="target-cost-batch" action={`/api/projects/${project.id}/costs/batch`} method="post" />
      <div style={{ maxHeight: '72vh', overflow: 'auto', padding: 12 }}>
        {levelOneRows.length === 0 ? <p className="meta">暂无科目树。</p> : levelOneRows.map((level1) => (
          <details key={level1.name} open style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
            <summary style={{ cursor: 'pointer', padding: 12, background: '#e9f7f8', display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px 120px', gap: 10, alignItems: 'center', fontWeight: 900 }}>
              <span>一级｜{level1.name}</span><span>已填 {level1.filled}/{level1.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level1.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level1.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level1.amount, saleableArea))}</span>
            </summary>
            <div style={{ padding: 10 }}>
              {Array.from(level1.children.values()).map((level2) => (
                <details key={level2.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                  <summary style={{ cursor: 'pointer', padding: 10, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 120px 130px 130px 120px', gap: 10, alignItems: 'center', fontWeight: 800 }}>
                    <span>二级｜{level2.name}</span><span>已填 {level2.filled}/{level2.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level2.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level2.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level2.amount, saleableArea))}</span>
                  </summary>
                  <div style={{ padding: 8 }}>
                    {Array.from(level2.children.values()).map((level3) => (
                      <details key={level3.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                        <summary style={{ cursor: 'pointer', padding: 10, background: '#fcfdff', display: 'grid', gridTemplateColumns: '1fr 120px 130px 130px 120px', gap: 10, alignItems: 'center' }}>
                          <b>三级｜{level3.name}</b><span>已填 {level3.filled}/{level3.rows}</span><span style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(level3.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level3.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level3.amount, saleableArea))}</span>
                        </summary>
                        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1650, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#fff' }}>{['编码', '末级科目', '业态', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '建面单方', '可售单方', '分摊方式', '备注', '状态'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead><tbody>{level3.leaves.map((row, index) => {
                          const saved = row.costCode ? byCode.get(row.costCode) : null;
                          const amount = Number(saved?.taxInclusiveAmount || 0);
                          const suggestion = suggestQuantityFromOverview(project, row);
                          const quantity = saved ? Number(saved.quantity || 0) : suggestion.quantity;
                          const unit = saved?.unit || suggestion.unit || row.unit || '';
                          return <tr key={row.id} style={{ background: amount > 0 ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}><td style={{ ...cell, fontWeight: 900, color: '#0f4c5c' }}>{row.costCode}</td><td style={{ ...cell, fontWeight: 800 }}>{row.detailSubject}</td><td style={cell}>{saved?.regionOrProductType || row.applicableProductType || '项目整体共用'}</td><td style={cell}>{saved?.measureBasis || row.measureBasis || '-'}{!saved && suggestion.source ? <div className="meta">默认取数：{suggestion.source}</div> : null}</td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" type="hidden" name="dictionaryRowId" value={row.id} />{saved ? <input form="target-cost-batch" type="hidden" name={`costLineId-${row.id}`} value={saved.id} /> : null}<input form="target-cost-batch" name={`quantity-${row.id}`} type="number" step="0.01" defaultValue={quantity || ''} placeholder="工程量" style={input} /></td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`unit-${row.id}`} defaultValue={unit} style={{ ...input, minWidth: 70 }} /></td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`taxInclusiveUnitPrice-${row.id}`} type="number" step="0.01" defaultValue={saved ? Number(saved.taxInclusiveUnitPrice || 0) || '' : ''} placeholder="单价" style={input} /></td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`taxRate-${row.id}`} defaultValue={row.defaultTaxRate || '9%'} style={{ ...input, minWidth: 68 }} /></td><td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, buildingArea))}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, saleableArea))}</td><td style={cell}>{saved?.allocationMethod || row.targetAllocationMethod || '按可售面积占比'}</td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`remark-${row.id}`} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...input, minWidth: 130 }} /></td><td style={{ ...cell, color: amount > 0 ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{amount > 0 ? '已填' : (suggestion.quantity ? '已带入' : '未填')}</td></tr>;
                        })}</tbody></table></div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div></section>
  </div></main>;
}
