import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { LOCKED_VERSION_EDIT_MESSAGE } from '@/lib/v1-maintenance-copy';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const incomeTypes = [
  { name: '税收返还', desc: '增值税、所得税等地方留成返还或财政奖励，需关注协议和兑现口径。' },
  { name: '产业奖励', desc: '招商引资、产业导入、总部经济、产值贡献等奖励。' },
  { name: '财政补贴', desc: '政府财政补助、建设补助、运营补贴等。' },
  { name: '土地款返还', desc: '土地出让金、基础设施配套或历史协议返还，需重点核实合法性和兑现条件。' },
  { name: '基础设施配套补助', desc: '道路、管网、代建、公服配套等补助或返还。' },
  { name: '其他政策收益', desc: '人才公寓、租金补贴、装修补贴、专项扶持等其他非销售收益。' }
];

export default async function OtherRevenuePage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; rows?: string; locked?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true }
  });
  const otherRevenueLines = version ? await prisma.otherRevenueLine.findMany({ where: { projectVersionId: version.id } }) : [];

  const lineMap = new Map(otherRevenueLines.map((line) => [line.incomeType, line]));
  const rows = incomeTypes.map((item) => {
    const line = lineMap.get(item.name);
    const amount = Number(line?.amount || 0);
    const taxRate = Number(line?.taxRate || 0);
    const result = calculateRevenueLine(1, amount, taxRate);
    return {
      ...item,
      amount,
      taxRate,
      net: Number(line?.taxExclusiveRevenue || result.taxExclusiveRevenue),
      fee: Number(line?.taxAmount || result.taxAmount),
      cashDate: line?.cashDate || '',
      certainty: line?.certainty || '待确认',
      condition: line?.condition || '',
      policyBasis: line?.policyBasis || '',
      remark: line?.remark || ''
    };
  });

  const activeRows = rows.filter((row) => row.amount > 0);
  const total = activeRows.reduce((sum, row) => sum + row.amount, 0);
  const net = activeRows.reduce((sum, row) => sum + row.net, 0);
  const fee = activeRows.reduce((sum, row) => sum + row.fee, 0);
  const uncertainCount = activeRows.filter((row) => row.certainty === '不确定' || row.certainty === '待确认').length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">其他收入测算</h1><p className="subtitle">税收返还、产业奖励、财政补贴、土地款返还等政策性收益单独测算，不与住宅、商业、车位销售收入混算。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue-summary`} className="btn">收入汇总</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>其他收入已保存到独立其他收入表。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>{LOCKED_VERSION_EDIT_MESSAGE}</div> : null}

    <section className="card" style={{ marginBottom: 16 }}><div className="summary-strip"><div className="stat"><div className="stat-label">其他收入项</div><div className="stat-value">{activeRows.length}</div></div><div className="stat"><div className="stat-label">预计含税金额</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">预计不含税金额</div><div className="stat-value">{fmt(net)}元</div></div><div className="stat"><div className="stat-label">预计税额</div><div className="stat-value">{fmt(fee)}元</div></div><div className="stat"><div className="stat-label">待确认/不确定</div><div className="stat-value" style={{ color: uncertainCount ? '#f08c00' : '#2f9e44' }}>{uncertainCount}</div></div></div></section>

    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>口径说明</b><p className="meta" style={{ margin: '6px 0 0' }}>其他收入现在存入 OtherRevenueLine，不再伪装为业态。是否计入利润、是否缴纳增值税、是否影响所得税和现金流，应以后续协议、财政文件和税务判断为准。</p></section>

    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>其他收入明细</h2><p className="meta">金额按预计含税金额录入；不涉增值税的项目税率可填 0。</p></div><button form="other-revenue-batch" className="btn btn-primary">保存其他收入</button></div>
      <div style={{ overflowX: 'auto' }}><form id="other-revenue-batch" action={`/api/projects/${project.id}/other-revenue/batch`} method="post" /><input form="other-revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1480 }}><thead><tr>{['收入类型', '预计含税金额', '税率', '不含税金额', '预计税额', '确定性', '预计兑现时间', '兑现条件', '政策依据', '备注', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><input form="other-revenue-batch" type="hidden" name={`type-${index}`} value={row.name} />{row.name}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="other-revenue-batch" name={`amount-${index}`} type="number" step="0.01" defaultValue={row.amount || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 140 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="other-revenue-batch" name={`taxRate-${index}`} type="number" step="0.0001" defaultValue={row.taxRate || 0} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 90 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><select form="other-revenue-batch" name={`certainty-${index}`} defaultValue={row.certainty} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 110 }}><option>确定</option><option>较确定</option><option>待确认</option><option>不确定</option></select></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="other-revenue-batch" name={`cashDate-${index}`} defaultValue={row.cashDate} placeholder="如2026Q4" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 110 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="other-revenue-batch" name={`condition-${index}`} defaultValue={row.condition} placeholder="协议/产值/纳税/开工等" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 200 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="other-revenue-batch" name={`policyBasis-${index}`} defaultValue={row.policyBasis} placeholder="政策文件/协议编号" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 180 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="other-revenue-batch" name={`remark-${index}`} defaultValue={row.remark} placeholder="备注" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 160 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.desc}</td></tr>)}</tbody></table></div>
    </section>
  </div></main>;
}
