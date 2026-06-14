import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function ensurePresetRows(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  const presetRows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  if (!presetRows.length) return;
  if (count >= 100) return;
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

export async function ProfessionalDetailPage(props: DetailPageProps) {
  const project = await prisma.project.findUnique({ where: { id: props.projectId } });
  if (!project) return <main className="page">项目不存在</main>;

  await ensurePresetRows(project.id);
  const version = await prisma.projectVersion.findFirst({ where: { projectId: props.projectId }, orderBy: { createdAt: 'asc' } });

  const ors = props.dictionaryKeywords.flatMap((keyword) => [
    { sourceTable: { contains: keyword } },
    { firstSubject: { contains: keyword } },
    { secondSubject: { contains: keyword } },
    { thirdSubject: { contains: keyword } },
    { detailSubject: { contains: keyword } }
  ]);

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: {
      projectId: props.projectId,
      enabled: { not: '否' },
      OR: ors
    },
    orderBy: { rowIndex: 'asc' }
  });

  const costs = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id, professionalGroup: props.professionalGroup },
    include: { costSubject: true },
    orderBy: { sortOrder: 'asc' }
  }) : [];

  const costByCode = new Map<string, any>();
  costs.forEach((row) => costByCode.set(row.costSubject.code, row));
  const totalInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = costs.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const filledRows = dictionaryRows.filter((row) => row.costCode && costByCode.has(row.costCode)).length;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1500 }}>
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

        {props.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>{props.title}已保存/更新。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税合计</div><div className="stat-value">{fmt(totalInclusive)}</div></div>
          <div className="stat"><div className="stat-label">不含税金额</div><div className="stat-value">{fmt(totalExclusive)}</div></div>
          <div className="stat"><div className="stat-label">税额</div><div className="stat-value">{fmt(totalTax)}</div></div>
          <div className="stat"><div className="stat-label">已填 / 预设行</div><div className="stat-value">{filledRows} / {dictionaryRows.length}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <b>{props.title}｜预设科目行</b>
              <div className="meta">{props.note} 现在按预设科目行填报，只填工程量、含税单价和备注。</div>
            </div>
            <span className="badge">预设行模式</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', minWidth: 1680, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                  {['成本编码', '一级', '二级', '三级', '末级/明细科目', '区域/业态', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '不含税金额', '税额', '分摊方式', '备注', '操作'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#475467' }}>{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {dictionaryRows.length === 0 ? <tr><td colSpan={17} style={{ padding: 18, color: '#667085', textAlign: 'center' }}>{props.emptyText}</td></tr> : dictionaryRows.map((dict, index) => {
                  const saved = dict.costCode ? costByCode.get(dict.costCode) : null;
                  const amount = Number(saved?.taxInclusiveAmount || 0);
                  const quantity = Number(saved?.quantity || 0);
                  const unitPrice = Number(saved?.taxInclusiveUnitPrice || 0);
                  const isFilled = amount > 0;
                  const formId = `${props.returnPath}-${dict.id}`;
                  return (
                    <tr key={dict.id} style={{ background: isFilled ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
                      <td style={{ ...cell, fontWeight: 900, color: '#0f4c5c' }}>{dict.costCode || '-'}</td>
                      <td style={cell}>{dict.firstSubject || '-'}</td>
                      <td style={cell}>{dict.secondSubject || '-'}</td>
                      <td style={cell}>{dict.thirdSubject || '-'}</td>
                      <td style={{ ...cell, fontWeight: 800 }}>{dict.detailSubject || dict.thirdSubject || dict.secondSubject || '-'}</td>
                      <td style={cell}>{saved?.regionOrProductType || dict.applicableProductType || '项目整体共用'}</td>
                      <td style={cell}>{saved?.measureBasis || dict.measureBasis || '-'}</td>
                      <td style={{ ...cell, padding: 0 }}>
                        <form id={formId} action={`/api/projects/${project.id}/professional-costs`} method="post" />
                        <input form={formId} type="hidden" name="dictionaryRowId" value={dict.id} />
                        <input form={formId} type="hidden" name="professionalGroup" value={props.professionalGroup} />
                        <input form={formId} type="hidden" name="returnPath" value={props.returnPath} />
                        {saved ? <input form={formId} type="hidden" name="costLineId" value={saved.id} /> : null}
                        <input form={formId} name="quantity" type="number" step="0.01" defaultValue={quantity || ''} placeholder="填工程量" style={inputStyle} />
                      </td>
                      <td style={{ ...cell, padding: 0 }}><input form={formId} name="unit" defaultValue={saved?.unit || dict.unit || ''} style={{ ...inputStyle, minWidth: 70 }} /></td>
                      <td style={{ ...cell, padding: 0 }}><input form={formId} name="taxInclusiveUnitPrice" type="number" step="0.01" defaultValue={unitPrice || ''} placeholder="填单价" style={inputStyle} /></td>
                      <td style={{ ...cell, padding: 0 }}><input form={formId} name="taxRate" defaultValue={dict.defaultTaxRate || (saved ? `${Number(saved.taxRate || 0) * 100}%` : '9%')} style={{ ...inputStyle, minWidth: 68 }} /></td>
                      <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxExclusiveAmount || 0)}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxAmount || 0)}</td>
                      <td style={cell}>{saved?.allocationMethod || dict.targetAllocationMethod || '建筑面积分摊'}</td>
                      <td style={{ ...cell, padding: 0 }}>
                        <input form={formId} name="remark" defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...inputStyle, minWidth: 130 }} />
                        <input form={formId} type="hidden" name="detailName" value={dict.detailSubject || dict.thirdSubject || dict.secondSubject || props.professionalGroup} />
                        <input form={formId} type="hidden" name="regionOrProductType" value={saved?.regionOrProductType || dict.applicableProductType || '项目整体共用'} />
                        <input form={formId} type="hidden" name="measureBasis" value={saved?.measureBasis || dict.measureBasis || ''} />
                        <input form={formId} type="hidden" name="allocationMethod" value={saved?.allocationMethod || dict.targetAllocationMethod || '建筑面积分摊'} />
                      </td>
                      <td style={{ ...cell, padding: 4 }}><button form={formId} className="btn btn-primary" style={{ minHeight: 30, padding: '4px 10px' }}>{saved ? '更新' : '保存'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
