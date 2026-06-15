import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';
import { suggestQuantityFromOverview } from '@/lib/overview-quantity';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function ensurePresetRows(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  const presetRows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  if (!presetRows.length || count >= 100) return;
  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: presetRows })
  ]);
}

type DetailPageProps = {
  projectId: string;
  saved?: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  professionalGroup: string;
  returnPath: string;
  dictionaryKeywords: string[];
  emptyText: string;
  selectPlaceholder: string;
  detailPlaceholder: string;
  measurePlaceholder: string;
  note: string;
};

type TreeNode = { name: string; amount: number; rows: number; filled: number; children: Map<string, TreeNode>; leaves: any[] };

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const inputStyle = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };

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

export async function ProfessionalDetailPage(props: DetailPageProps) {
  const project = await prisma.project.findUnique({ where: { id: props.projectId } });
  if (!project) return <main className="page">项目不存在</main>;

  await ensurePresetRows(project.id);
  const version = await prisma.projectVersion.findFirst({ where: { projectId: props.projectId }, orderBy: { createdAt: 'asc' } });

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: props.projectId, enabled: { not: '否' }, sourceTable: props.eyebrow },
    orderBy: { rowIndex: 'asc' }
  });

  const leafRows = dictionaryRows.filter((row) => row.detailSubject);
  const leafCodes = new Set(leafRows.map((row) => row.costCode).filter(Boolean));
  const costs = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id, professionalGroup: props.professionalGroup },
    include: { costSubject: true },
    orderBy: { sortOrder: 'asc' }
  }) : [];
  const activeCosts = costs.filter((row) => leafCodes.has(row.costSubject.code));

  const costByCode = new Map<string, any>();
  costs.forEach((row) => costByCode.set(row.costSubject.code, row));
  const totalInclusive = activeCosts.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = activeCosts.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = activeCosts.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const filledRows = leafRows.filter((row) => row.costCode && costByCode.has(row.costCode)).length;

  const root = node('root');
  leafRows.forEach((row) => {
    const saved = row.costCode ? costByCode.get(row.costCode) : null;
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

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1600 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">{props.eyebrow}</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">{props.subtitle}</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/cost-dictionary`} className="btn btn-primary">成本科目词典</Link>
            <Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {props.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>{props.title}已批量保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税合计</div><div className="stat-value">{fmt(totalInclusive)}</div></div>
          <div className="stat"><div className="stat-label">不含税金额</div><div className="stat-value">{fmt(totalExclusive)}</div></div>
          <div className="stat"><div className="stat-label">税额</div><div className="stat-value">{fmt(totalTax)}</div></div>
          <div className="stat"><div className="stat-label">已填 / 末级行</div><div className="stat-value">{filledRows} / {leafRows.length}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div><b>{props.title}｜科目树填报</b><div className="meta">工程量优先从项目概况表自动带入；已保存行继续用保存值。上级科目只汇总，末级才录入单价和备注。</div></div>
            <button form={`${props.returnPath}-batch`} className="btn btn-primary" style={{ minHeight: 34 }}>整表批量保存</button>
          </div>
          <form id={`${props.returnPath}-batch`} action={`/api/projects/${project.id}/professional-costs/batch`} method="post" />
          <input form={`${props.returnPath}-batch`} type="hidden" name="professionalGroup" value={props.professionalGroup} />
          <input form={`${props.returnPath}-batch`} type="hidden" name="returnPath" value={props.returnPath} />
          <div style={{ maxHeight: '72vh', overflow: 'auto', padding: 12 }}>
            {levelOneRows.length === 0 ? <p className="meta">{props.emptyText}</p> : levelOneRows.map((level1) => (
              <details key={level1.name} open style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
                <summary style={{ cursor: 'pointer', padding: 12, background: '#e9f7f8', display: 'grid', gridTemplateColumns: '1fr 130px 140px', gap: 10, alignItems: 'center', fontWeight: 900 }}>
                  <span>一级｜{level1.name}</span><span>已填 {level1.filled}/{level1.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level1.amount)}</span>
                </summary>
                <div style={{ padding: 10 }}>
                  {Array.from(level1.children.values()).map((level2) => (
                    <details key={level2.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                      <summary style={{ cursor: 'pointer', padding: 10, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 120px 140px', gap: 10, alignItems: 'center', fontWeight: 800 }}>
                        <span>二级｜{level2.name}</span><span>已填 {level2.filled}/{level2.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level2.amount)}</span>
                      </summary>
                      <div style={{ padding: 8 }}>
                        {Array.from(level2.children.values()).map((level3) => (
                          <details key={level3.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                            <summary style={{ cursor: 'pointer', padding: 10, background: '#fcfdff', display: 'grid', gridTemplateColumns: '1fr 120px 140px', gap: 10, alignItems: 'center' }}>
                              <b>三级｜{level3.name}</b><span>已填 {level3.filled}/{level3.rows}</span><span style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(level3.amount)}</span>
                            </summary>
                            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1500, borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead><tr style={{ background: '#fff' }}>{['编码', '末级科目', '区域/业态', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '不含税金额', '税额', '分摊方式', '备注', '状态'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead>
                              <tbody>{level3.leaves.map((dict, index) => {
                                const saved = dict.costCode ? costByCode.get(dict.costCode) : null;
                                const amount = Number(saved?.taxInclusiveAmount || 0);
                                const suggestion = suggestQuantityFromOverview(project, dict);
                                const quantity = saved ? Number(saved.quantity || 0) : suggestion.quantity;
                                const unit = saved?.unit || suggestion.unit || dict.unit || '';
                                const unitPrice = Number(saved?.taxInclusiveUnitPrice || 0);
                                const isFilled = amount > 0;
                                return <tr key={dict.id} style={{ background: isFilled ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
                                  <td style={{ ...cell, fontWeight: 900, color: '#0f4c5c' }}>{dict.costCode || '-'}</td>
                                  <td style={{ ...cell, fontWeight: 800 }}>{dict.detailSubject || '-'}</td>
                                  <td style={cell}>{saved?.regionOrProductType || dict.applicableProductType || '项目整体共用'}</td>
                                  <td style={cell}>{saved?.measureBasis || dict.measureBasis || '-'}{!saved && suggestion.source ? <div className="meta">默认取数：{suggestion.source}</div> : null}</td>
                                  <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} type="hidden" name="dictionaryRowId" value={dict.id} />{saved ? <input form={`${props.returnPath}-batch`} type="hidden" name={`costLineId-${dict.id}`} value={saved.id} /> : null}<input form={`${props.returnPath}-batch`} name={`quantity-${dict.id}`} type="number" step="0.01" defaultValue={quantity || ''} placeholder="工程量" style={inputStyle} /></td>
                                  <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`unit-${dict.id}`} defaultValue={unit} style={{ ...inputStyle, minWidth: 70 }} /></td>
                                  <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`taxInclusiveUnitPrice-${dict.id}`} type="number" step="0.01" defaultValue={unitPrice || ''} placeholder="单价" style={inputStyle} /></td>
                                  <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`taxRate-${dict.id}`} defaultValue={dict.defaultTaxRate || (saved ? `${Number(saved.taxRate || 0) * 100}%` : '9%')} style={{ ...inputStyle, minWidth: 68 }} /></td>
                                  <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
                                  <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxExclusiveAmount || 0)}</td>
                                  <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxAmount || 0)}</td>
                                  <td style={cell}>{saved?.allocationMethod || dict.targetAllocationMethod || '建筑面积分摊'}</td>
                                  <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`remark-${dict.id}`} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...inputStyle, minWidth: 130 }} /></td>
                                  <td style={{ ...cell, color: isFilled ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{isFilled ? '已填' : (suggestion.quantity ? '已带入' : '未填')}</td>
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
