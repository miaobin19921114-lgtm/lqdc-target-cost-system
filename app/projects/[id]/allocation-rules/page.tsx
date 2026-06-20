import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

const allocationMethods = [
  '',
  '按可售面积占比',
  '按建筑面积占比',
  '按计容面积占比',
  '按销售收入占比',
  '按受益对象/成本归属组',
  '直接归属业态',
  '按地下车位面积/数量',
  '按景观面积',
  '按硬景面积',
  '按软景面积',
  '按周界长度',
  '按出入口数量',
  '按资金占用比例',
  '不参与分摊/单独列示'
];

const incomeTaxMethods = [
  '',
  '按所得税成本对象可售面积',
  '按所得税成本对象建筑面积',
  '按所得税成本对象收入比例',
  '直接归属所得税成本对象',
  '期间费用项目整体扣除',
  '不计入所得税成本'
];

function codeLevel(code?: string | null, subjectLevel?: string | null) {
  const explicit = Number(String(subjectLevel || '').replace(/[^0-9]/g, ''));
  if (explicit) return explicit;
  if (!code) return 0;
  return code.split(/[.。\-_/]/).filter(Boolean).length;
}

function codeSortKey(code?: string | null) {
  const raw = String(code || '').trim();
  if (!raw) return [9999];
  const parts = raw.split(/[.。\-_/]/).filter(Boolean);
  return parts.map((part) => {
    const num = Number(part.replace(/[^0-9]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : 9999;
  });
}

function compareCode(a?: string | null, b?: string | null) {
  const aa = codeSortKey(a);
  const bb = codeSortKey(b);
  const length = Math.max(aa.length, bb.length);
  for (let i = 0; i < length; i += 1) {
    const av = aa[i] ?? -1;
    const bv = bb[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return String(a || '').localeCompare(String(b || ''), 'zh-CN', { numeric: true });
}

function indent(level: number) {
  return Math.max(level - 1, 0) * 18;
}

function precisionAdvice(row: { costCode?: string | null; subjectLevel?: string | null; firstSubject?: string | null; secondSubject?: string | null; thirdSubject?: string | null; detailSubject?: string | null }) {
  const code = row.costCode || '';
  const level = codeLevel(code, row.subjectLevel);
  const text = `${row.firstSubject || ''}${row.secondSubject || ''}${row.thirdSubject || ''}${row.detailSubject || ''}`;
  if (code.startsWith('01') || text.includes('土地')) return '建议四级/末级配置';
  if (text.includes('地下') || text.includes('车位') || text.includes('人防')) return '建议四级/末级配置';
  if (text.includes('景观') || text.includes('管网') || text.includes('围墙') || text.includes('出入口')) return '建议三级或四级配置';
  if (text.includes('销售') || text.includes('管理') || text.includes('财务')) return '二级/三级默认即可';
  if (level <= 2) return '大类默认规则';
  if (level === 3) return '主要配置层';
  return '精细覆盖层';
}

function ruleValue(value?: string | null) {
  return value || '继承上级/系统默认';
}

function select(name: string, value: string | null | undefined, options: string[]) {
  return <select name={name} defaultValue={value || ''} style={{ width: '100%', height: 32, border: '1px solid #d9e2ec', borderRadius: 6 }}>
    {options.map((option) => <option key={option || 'inherit'} value={option}>{option || '继承上级/系统默认'}</option>)}
  </select>;
}

function statusMessage(searchParams?: Record<string, string | undefined>) {
  if (searchParams?.saved === '1') return <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>分摊规则已保存。</div>;
  if (searchParams?.saved === '0') return <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>分摊规则保存失败，请检查科目是否存在。</div>;
  return null;
}

export default async function AllocationRulesPage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const rows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    orderBy: { rowIndex: 'asc' }
  });
  const sortedRows = [...rows].sort((a, b) => compareCode(a.costCode, b.costCode) || a.rowIndex - b.rowIndex);

  const configured = sortedRows.filter((row) => row.targetAllocationMethod || row.landVatAllocationMethod || row.incomeTaxDeductionCategory || row.costAttributionMethod).length;
  const level3Plus = sortedRows.filter((row) => codeLevel(row.costCode, row.subjectLevel) >= 3).length;
  const keyLevel4 = sortedRows.filter((row) => precisionAdvice(row).includes('四级') || precisionAdvice(row).includes('末级')).length;

  return <main className="page"><div className="container" style={{ maxWidth: 1520 }}>
    <ProjectTopNav projectId={project.id} projectName={project.name} current="分摊规则配置" />
    <div className="page-header"><div><p className="eyebrow">成本分摊 · 规则维护</p><h1 className="title">分摊规则配置</h1><p className="subtitle">这是成本分摊页下的规则维护入口，不作为项目一级导航。科目按编码树排序；空值代表继承上级或系统默认，项目明细行仍可覆盖。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-allocation`} className="btn btn-primary">返回成本分摊</Link><Link href={`/projects/${project.id}/cost-mapping`} className="btn">科目映射</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {statusMessage(searchParams)}
    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">规则科目</div><div className="stat-value">{sortedRows.length}</div></div><div className="stat"><div className="stat-label">已配置</div><div className="stat-value">{configured}</div></div><div className="stat"><div className="stat-label">三级及以下</div><div className="stat-value">{level3Plus}</div></div><div className="stat"><div className="stat-label">关键四级/末级</div><div className="stat-value">{keyLevel4}</div></div></div>
    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>规则精度原则</b><p className="meta" style={{ margin: '6px 0 0' }}>一级只汇总，二级做大类默认，三级为主配置层；土地、地下室、车位、人防、景观、管网、围墙出入口、设备等关键科目做到四级/末级；项目特殊情况由成本明细行覆盖。</p></section>
    <section className="card"><h2>科目分摊规则树</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1720, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['编码', '科目', '级次', '精度建议', '当前经营规则', '当前土增税规则', '当前所得税规则', '归属/受益对象', '规则调整'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{sortedRows.map((row) => {
      const level = codeLevel(row.costCode, row.subjectLevel);
      const subject = row.detailSubject || row.thirdSubject || row.secondSubject || row.firstSubject || row.name || '';
      return <tr key={row.id}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800, whiteSpace: 'nowrap' }}>{row.costCode}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', paddingLeft: indent(level) + 9 }}>{subject}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{level || '-'}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{precisionAdvice(row)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{ruleValue(row.targetAllocationMethod)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{ruleValue(row.landVatAllocationMethod)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{ruleValue(row.incomeTaxDeductionCategory)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{ruleValue(row.costAttributionMethod)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', minWidth: 520 }}><form action={`/api/projects/${project.id}/allocation-rules`} method="post" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 70px', gap: 6, alignItems: 'center' }}><input type="hidden" name="rowId" value={row.id} />{select('targetAllocationMethod', row.targetAllocationMethod, allocationMethods)}{select('landVatAllocationMethod', row.landVatAllocationMethod, allocationMethods)}{select('incomeTaxDeductionCategory', row.incomeTaxDeductionCategory, incomeTaxMethods)}{select('costAttributionMethod', row.costAttributionMethod, allocationMethods)}<button className="btn" style={{ padding: '5px 8px' }}>保存</button><input name="taxRemark" defaultValue={row.taxRemark || ''} placeholder="备注/口径说明" style={{ gridColumn: '1 / -1', height: 30, border: '1px solid #d9e2ec', borderRadius: 6, padding: '0 8px' }} /></form></td></tr>;
    })}</tbody></table></div></section>
  </div></main>;
}
