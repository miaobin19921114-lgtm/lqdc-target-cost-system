import { Fragment } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

export const dynamic = 'force-dynamic';

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const input = { width: '100%', minWidth: 90, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
const frozen = (left: number, bg = '#fff') => ({ position: 'sticky' as const, left, background: bg, zIndex: 3, boxShadow: '1px 0 0 #d9e2ec' });
function fmt(v: unknown) { return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function single(v: unknown, area: number) { return area ? Number(v || 0) / area : 0; }

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
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { costs: { include: { costSubject: true }, orderBy: { sortOrder: 'asc' } } }
  });
  const costs = version?.costs || [];
  const byCode = new Map<string, any>();
  costs.forEach((item) => byCode.set(item.costSubject.code, item));

  const rows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    orderBy: { rowIndex: 'asc' }
  });
  const leafRows = rows.filter((row) => row.detailSubject);
  const leafCodes = new Set(leafRows.map((row) => row.costCode).filter(Boolean));
  const activeCosts = costs.filter((item) => leafCodes.has(item.costSubject.code));

  const groups = new Map<string, { amount: number; rows: number; filled: number }>();
  leafRows.forEach((row) => {
    const name = row.firstSubject || '未分类';
    const saved = row.costCode ? byCode.get(row.costCode) : null;
    const group = groups.get(name) || { amount: 0, rows: 0, filled: 0 };
    group.rows += 1;
    group.filled += saved ? 1 : 0;
    group.amount += Number(saved?.taxInclusiveAmount || 0);
    groups.set(name, group);
  });

  const total = activeCosts.reduce((sum, item) => sum + Number(item.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1700 }}>
    <div className="page-header"><div><p className="eyebrow">目标成本编制</p><h1 className="title">{project.name}</h1><p className="subtitle">上级科目自动汇总，只有末级科目允许录入工程量、含税单价、备注。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">汇总表</Link><Link href={`/projects/${project.id}/costs`} className="btn">旧目标成本页</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>整表已保存。{searchParams?.batch ? `本次处理 ${searchParams.batch} 行。` : ''}</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(total)}</div></div><div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div><div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(single(total, saleableArea))}</div></div><div className="stat"><div className="stat-label">末级预设行</div><div className="stat-value">{leafRows.length}</div></div></div>
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}><div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><b>目标成本测算表｜汇总+末级填报</b><div className="meta">一级、二级、三级为汇总小计；末级科目才是可输入行。</div></div><button form="target-cost-batch" className="btn btn-primary">整表批量保存</button></div><form id="target-cost-batch" action={`/api/projects/${project.id}/costs/batch`} method="post" />
      <div style={{ overflowX: 'auto', maxHeight: '72vh' }}><table style={{ width: '100%', minWidth: 2050, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 6 }}><th style={{ ...cell, ...frozen(0, '#f8fafc'), minWidth: 90 }}>编码</th><th style={{ ...cell, ...frozen(90, '#f8fafc'), minWidth: 130 }}>一级</th><th style={{ ...cell, ...frozen(220, '#f8fafc'), minWidth: 150 }}>二级</th><th style={{ ...cell, ...frozen(370, '#f8fafc'), minWidth: 170 }}>三级</th><th style={{ ...cell, ...frozen(540, '#f8fafc'), minWidth: 240 }}>末级科目</th>{['业态', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '建面单方', '可售单方', '分摊方式', '备注', '状态'].map((head) => <th key={head} style={cell}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => {
        const isLeaf = Boolean(row.detailSubject);
        const saved = row.costCode ? byCode.get(row.costCode) : null;
        const amount = Number(saved?.taxInclusiveAmount || 0);
        const groupName = row.firstSubject || '未分类';
        const showGroup = index === 0 || rows[index - 1].firstSubject !== row.firstSubject;
        const group = groups.get(groupName);
        return <Fragment key={row.id}>
          {showGroup ? <tr style={{ background: '#e9f7f8', fontWeight: 900 }}><td colSpan={5} style={{ ...cell, ...frozen(0, '#e9f7f8'), color: '#0f4c5c' }}>{groupName} 小计</td><td colSpan={6} style={cell}>已填 {group?.filled || 0}/{group?.rows || 0} 行</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(group?.amount || 0)}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(single(group?.amount || 0, buildingArea))}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(single(group?.amount || 0, saleableArea))}</td><td colSpan={3} style={cell}>上级科目自动汇总</td></tr> : null}
          {!isLeaf ? null : <tr style={{ background: amount > 0 ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}><td style={{ ...cell, ...frozen(0), minWidth: 90, fontWeight: 900, color: '#0f4c5c' }}>{row.costCode}</td><td style={{ ...cell, ...frozen(90), minWidth: 130 }}>{row.firstSubject || '-'}</td><td style={{ ...cell, ...frozen(220), minWidth: 150 }}>{row.secondSubject || '-'}</td><td style={{ ...cell, ...frozen(370), minWidth: 170 }}>{row.thirdSubject || '-'}</td><td style={{ ...cell, ...frozen(540), minWidth: 240, fontWeight: 800 }}>{row.detailSubject || '-'}</td><td style={cell}>{saved?.regionOrProductType || row.applicableProductType || '项目整体共用'}</td><td style={cell}>{saved?.measureBasis || row.measureBasis || '-'}</td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" type="hidden" name="dictionaryRowId" value={row.id} />{saved ? <input form="target-cost-batch" type="hidden" name={`costLineId-${row.id}`} value={saved.id} /> : null}<input form="target-cost-batch" name={`quantity-${row.id}`} type="number" step="0.01" defaultValue={saved ? Number(saved.quantity || 0) || '' : ''} placeholder="工程量" style={input} /></td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`unit-${row.id}`} defaultValue={saved?.unit || row.unit || ''} style={{ ...input, minWidth: 70 }} /></td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`taxInclusiveUnitPrice-${row.id}`} type="number" step="0.01" defaultValue={saved ? Number(saved.taxInclusiveUnitPrice || 0) || '' : ''} placeholder="单价" style={input} /></td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`taxRate-${row.id}`} defaultValue={row.defaultTaxRate || '9%'} style={{ ...input, minWidth: 68 }} /></td><td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, buildingArea))}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, saleableArea))}</td><td style={cell}>{saved?.allocationMethod || row.targetAllocationMethod || '按可售面积占比'}</td><td style={{ ...cell, padding: 0 }}><input form="target-cost-batch" name={`remark-${row.id}`} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...input, minWidth: 130 }} /></td><td style={{ ...cell, color: amount > 0 ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{amount > 0 ? '已填' : '未填'}</td></tr>}
        </Fragment>;
      })}</tbody></table></div></section>
  </div></main>;
}
