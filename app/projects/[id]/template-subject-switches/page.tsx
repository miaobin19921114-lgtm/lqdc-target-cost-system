import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SubjectRow = {
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  parentCode: string | null;
  level: number;
  subjectPath: string | null;
  isEnabled: boolean;
  isDefaultEnabled: boolean;
  participateCost: boolean;
  participateRevenue: boolean;
  participateTax: boolean;
  participateFinance: boolean;
  showInSummary: boolean;
  allowProjectOverride: boolean;
  allowVersionOverride: boolean;
  sortOrder: number;
};

const RULE_TYPE_ORDER = ['COST', 'TAX', 'REVENUE', 'FINANCE', 'MEASURE'];
const ALLOWED_FIELDS = new Set(['isEnabled', 'isDefaultEnabled', 'showInSummary', 'allowProjectOverride', 'allowVersionOverride']);

function normalizeType(value: string) {
  const map: Record<string, string> = {
    COST: '成本规则',
    REVENUE: '收入规则',
    TAX: '税费规则',
    FINANCE: '财务规则',
    MEASURE: '工程量规则',
  };
  return map[value] || value;
}

function statusText(value: boolean) {
  return value ? '启用' : '停用';
}

function codeParts(code?: string | null) {
  return String(code || '').split(/[^0-9]+/).filter(Boolean).map((part) => Number(part));
}

function compareCode(a?: string | null, b?: string | null) {
  const left = codeParts(a);
  const right = codeParts(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? -1;
    const r = right[index] ?? -1;
    if (l !== r) return l - r;
  }
  return String(a || '').localeCompare(String(b || ''), 'zh-CN', { numeric: true });
}

function typeOrder(value: string) {
  const index = RULE_TYPE_ORDER.indexOf(value);
  return index >= 0 ? index : 999;
}

function compareSubject(a: SubjectRow, b: SubjectRow) {
  const typeDiff = typeOrder(a.ruleType) - typeOrder(b.ruleType);
  if (typeDiff !== 0) return typeDiff;
  const codeDiff = compareCode(a.subjectCode, b.subjectCode);
  if (codeDiff !== 0) return codeDiff;
  return a.sortOrder - b.sortOrder;
}

async function toggleSubject(formData: FormData) {
  'use server';
  const projectId = String(formData.get('projectId') || '');
  const subjectCode = String(formData.get('subjectCode') || '');
  const fieldName = String(formData.get('fieldName') || '');
  const nextValue = String(formData.get('nextValue') || '') === 'true';

  if (!projectId || !subjectCode || !ALLOWED_FIELDS.has(fieldName)) {
    redirect(projectId ? `/projects/${projectId}/template-subject-switches` : '/');
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "TemplateRuleSubject" SET "${fieldName}" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "templateCode" = 'residential-v1' AND "subjectCode" = $2`,
    nextValue,
    subjectCode,
  );

  if (fieldName === 'isEnabled') {
    await prisma.$executeRawUnsafe(
      `UPDATE "TemplateUnifiedRule" SET "isEnabled" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "templateCode" = 'residential-v1' AND "subjectCode" = $2`,
      nextValue,
      subjectCode,
    );
  }

  revalidatePath(`/projects/${projectId}/template-subject-switches`);
  revalidatePath(`/projects/${projectId}/rule-template-center`);
  revalidatePath(`/projects/${projectId}/template-field-requirements`);
  revalidatePath(`/projects/${projectId}/template-field-definitions`);
  redirect(`/projects/${projectId}/template-subject-switches`);
}

async function loadSubjects() {
  try {
    return await prisma.$queryRawUnsafe<SubjectRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled",
             "participateCost", "participateRevenue", "participateTax", "participateFinance", "showInSummary",
             "allowProjectOverride", "allowVersionOverride", "sortOrder"
      FROM "TemplateRuleSubject"
      WHERE "templateCode" = 'residential-v1'
    `);
  } catch {
    return [];
  }
}

function ToggleButton({ projectId, row, fieldName }: { projectId: string; row: SubjectRow; fieldName: keyof SubjectRow }) {
  const current = Boolean(row[fieldName]);
  return <form action={toggleSubject}>
    <input type="hidden" name="projectId" value={projectId} />
    <input type="hidden" name="subjectCode" value={row.subjectCode} />
    <input type="hidden" name="fieldName" value={String(fieldName)} />
    <input type="hidden" name="nextValue" value={String(!current)} />
    <button type="submit" className="btn" style={{ padding: '4px 8px', fontSize: 12, background: current ? '#e7f5ff' : '#f8f9fa', color: current ? '#0b7285' : '#868e96', borderColor: current ? '#a5d8ff' : '#dee2e6' }}>{statusText(current)}</button>
  </form>;
}

export default async function TemplateSubjectSwitchesPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const subjects = (await loadSubjects()).sort(compareSubject);
  const enabledCount = subjects.filter((item) => item.isEnabled).length;
  const summaryCount = subjects.filter((item) => item.showInSummary).length;
  const groups = RULE_TYPE_ORDER.filter((type) => subjects.some((item) => item.ruleType === type))
    .concat(Array.from(new Set(subjects.map((item) => item.ruleType))).filter((type) => !RULE_TYPE_ORDER.includes(type)));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板中心</p>
        <h1 className="title">{project.name} · 模板科目启用开关</h1>
        <p className="subtitle">模板保留全量科目，项目只控制启用状态。关闭模板科目时，对应模板规则也会同步停用，不影响历史结算数据。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn btn-primary">规则模板中心</Link>
        <Link href={`/projects/${project.id}/template-field-definitions`} className="btn">字段定义库</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">模板科目</div><div className="stat-value">{subjects.length}</div><div className="meta">住宅开发模板</div></div>
      <div className="stat"><div className="stat-label">当前启用</div><div className="stat-value">{enabledCount}</div><div className="meta">参与规则计算</div></div>
      <div className="stat"><div className="stat-label">进入汇总</div><div className="stat-value">{summaryCount}</div><div className="meta">显示在汇总口径</div></div>
      <div className="stat"><div className="stat-label">排序口径</div><div className="stat-value">科目编码</div><div className="meta">预备费在税金前</div></div>
    </div>

    {!subjects.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>模板科目尚未初始化</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后，会自动生成住宅开发模板科目。</p>
    </section> : null}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((group) => {
        const rows = subjects.filter((item) => item.ruleType === group);
        return <section key={group} className="card">
          <h2 style={{ marginTop: 0 }}>{normalizeType(group)} <span className="meta">({rows.length})</span></h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1150 }}>
              <thead><tr style={{ background: '#f1f5f9' }}>
                {['编码', '科目名称', '科目路径', '是否启用', '默认启用', '进入汇总', '项目可调', '版本可调', '参与类型'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{head}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((row) => <tr key={`${row.ruleType}-${row.subjectCode}`}>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}><b>{row.subjectCode}</b></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', paddingLeft: 10 + Math.max(0, row.level - 1) * 16 }}>{row.subjectName}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.subjectPath || '-'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><ToggleButton projectId={project.id} row={row} fieldName="isEnabled" /></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><ToggleButton projectId={project.id} row={row} fieldName="isDefaultEnabled" /></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><ToggleButton projectId={project.id} row={row} fieldName="showInSummary" /></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><ToggleButton projectId={project.id} row={row} fieldName="allowProjectOverride" /></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><ToggleButton projectId={project.id} row={row} fieldName="allowVersionOverride" /></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>
                    {row.participateCost ? '成本 ' : ''}{row.participateRevenue ? '收入 ' : ''}{row.participateTax ? '税费 ' : ''}{row.participateFinance ? '财务 ' : ''}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
