import { Fragment } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

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

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const inputStyle = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
const frozen = (left: number, background = '#fff') => ({ position: 'sticky' as const, left, zIndex: 3, background, boxShadow: '1px 0 0 #d9e2ec' });

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

  const groupTotals = new Map<string, { amount: number; rows: number; filled: number }>();
  leafRows.forEach((row) => {
    const groupName = row.secondSubject || row.firstSubject || '未分类';
    const saved = row.costCode ? costByCode.get(row.costCode) : null;
    const group = groupTotals.get(groupName) || { amount: 0, rows: 0, filled: 0 };
    group.rows += 1;
    group.filled += saved ? 1 : 0;
    group.amount += Number(saved?.taxInclusiveAmount || 0);
    groupTotals.set(groupName, group);
  });

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
            <div><b>{props.title}｜批量填报</b><div className="meta">按“归属表”精确筛选科目；非末级科目只做小计，不允许输入工程量或单价。</div></div>
            <button form={`${props.returnPath}-batch`} className="btn btn-primary" style={{ minHeight: 34 }}>整表批量保存</button>
          </div>
          <form id={`${props.returnPath}-batch`} action={`/api/projects/${project.id}/professional-costs/batch`} method="post" />
          <input form={`${props.returnPath}-batch`} type="hidden" name="professionalGroup" value={props.professionalGroup} />
          <input form={`${props.returnPath}-batch`} type="hidden" name="returnPath" value={props.returnPath} />
          <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', minWidth: 1780, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}><th style={{ ...cell, ...frozen(0, '#f8fafc'), minWidth: 90 }}>编码</th><th style={{ ...cell, ...frozen(90, '#f8fafc'), minWidth: 130 }}>一级</th><th style={{ ...cell, ...frozen(220, '#f8fafc'), minWidth: 160 }}>二级</th><th style={{ ...cell, ...frozen(380, '#f8fafc'), minWidth: 180 }}>三级</th><th style={{ ...cell, ...frozen(560, '#f8fafc'), minWidth: 240 }}>末级/明细科目</th>{['区域/业态', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '不含税金额', '税额', '分摊方式', '备注', '状态'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead>
              <tbody>
                {dictionaryRows.length === 0 ? <tr><td colSpan={17} style={{ padding: 18, color: '#667085', textAlign: 'center' }}>{props.emptyText}</td></tr> : dictionaryRows.map((dict, index) => {
                  const isLeaf = Boolean(dict.detailSubject);
                  const saved = dict.costCode ? costByCode.get(dict.costCode) : null;
                  const amount = Number(saved?.taxInclusiveAmount || 0);
                  const quantity = Number(saved?.quantity || 0);
                  const unitPrice = Number(saved?.taxInclusiveUnitPrice || 0);
                  const isFilled = amount > 0;
                  const groupName = dict.secondSubject || dict.firstSubject || '未分类';
                  const previous = index > 0 ? dictionaryRows[index - 1] : null;
                  const showGroup = !previous || (previous.secondSubject || previous.firstSubject) !== groupName;
                  const group = groupTotals.get(groupName);
                  return <Fragment key={dict.id}>
                    {showGroup ? <tr style={{ background: '#e9f7f8', fontWeight: 900 }}><td colSpan={5} style={{ ...cell, ...frozen(0, '#e9f7f8'), color: '#0f4c5c' }}>{groupName} 小计</td><td colSpan={6} style={cell}>已填 {group?.filled || 0} / {group?.rows || 0} 行</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(group?.amount || 0)}</td><td colSpan={5} style={cell}>上级科目自动汇总，不单独录入</td></tr> : null}
                    {!isLeaf ? null : <tr style={{ background: isFilled ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
                      <td style={{ ...cell, ...frozen(0), minWidth: 90, fontWeight: 900, color: '#0f4c5c' }}>{dict.costCode || '-'}</td>
                      <td style={{ ...cell, ...frozen(90), minWidth: 130 }}>{dict.firstSubject || '-'}</td>
                      <td style={{ ...cell, ...frozen(220), minWidth: 160 }}>{dict.secondSubject || '-'}</td>
                      <td style={{ ...cell, ...frozen(380), minWidth: 180 }}>{dict.thirdSubject || '-'}</td>
                      <td style={{ ...cell, ...frozen(560), minWidth: 240, fontWeight: 800 }}>{dict.detailSubject || '-'}</td>
                      <td style={cell}>{saved?.regionOrProductType || dict.applicableProductType || '项目整体共用'}</td>
                      <td style={cell}>{saved?.measureBasis || dict.measureBasis || '-'}</td>
                      <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} type="hidden" name="dictionaryRowId" value={dict.id} />{saved ? <input form={`${props.returnPath}-batch`} type="hidden" name={`costLineId-${dict.id}`} value={saved.id} /> : null}<input form={`${props.returnPath}-batch`} name={`quantity-${dict.id}`} type="number" step="0.01" defaultValue={quantity || ''} placeholder="工程量" style={inputStyle} /></td>
                      <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`unit-${dict.id}`} defaultValue={saved?.unit || dict.unit || ''} style={{ ...inputStyle, minWidth: 70 }} /></td>
                      <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`taxInclusiveUnitPrice-${dict.id}`} type="number" step="0.01" defaultValue={unitPrice || ''} placeholder="单价" style={inputStyle} /></td>
                      <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`taxRate-${dict.id}`} defaultValue={dict.defaultTaxRate || (saved ? `${Number(saved.taxRate || 0) * 100}%` : '9%')} style={{ ...inputStyle, minWidth: 68 }} /></td>
                      <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxExclusiveAmount || 0)}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxAmount || 0)}</td>
                      <td style={cell}>{saved?.allocationMethod || dict.targetAllocationMethod || '建筑面积分摊'}</td>
                      <td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={`remark-${dict.id}`} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...inputStyle, minWidth: 130 }} /></td>
                      <td style={{ ...cell, color: isFilled ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{isFilled ? '已填' : '未填'}</td>
                    </tr>}
                  </Fragment>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
