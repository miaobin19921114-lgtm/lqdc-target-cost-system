import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SnapshotRow = {
  id: string;
  sourceTemplateCode: string;
  sourceTemplateName: string;
  sourceTemplateVersion: string;
  snapshotName: string;
  snapshotStatus: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SubjectRow = {
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  level: number;
  subjectPath: string | null;
  isEnabled: boolean;
  showInSummary: boolean;
  sortOrder: number;
};

type RuleRow = {
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
  isEnabled: boolean;
  allowProjectOverride: boolean;
  allowVersionOverride: boolean;
  participateSettlementFeedback: boolean;
  sortOrder: number;
};

const RULE_TYPE_ORDER = ['COST', 'TAX', 'REVENUE', 'FINANCE', 'MEASURE'];

function normalizeType(value: string) {
  const map: Record<string, string> = { COST: '成本规则', REVENUE: '收入规则', TAX: '税费规则', FINANCE: '财务规则', MEASURE: '工程量规则' };
  return map[value] || value;
}

function short(value?: string | null) {
  return value || '-';
}

function yesNo(value: boolean) {
  return value ? '是' : '否';
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

function compareItem(a: SubjectRow | RuleRow, b: SubjectRow | RuleRow) {
  const typeDiff = typeOrder(a.ruleType) - typeOrder(b.ruleType);
  if (typeDiff !== 0) return typeDiff;
  const codeDiff = compareCode(a.subjectCode, b.subjectCode);
  if (codeDiff !== 0) return codeDiff;
  return a.sortOrder - b.sortOrder;
}

async function loadSnapshot(projectId: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<SnapshotRow[]>(`
      SELECT "id", "sourceTemplateCode", "sourceTemplateName", "sourceTemplateVersion", "snapshotName", "snapshotStatus", "isActive", "createdAt", "updatedAt"
      FROM "ProjectRuleSnapshot"
      WHERE "projectId" = $1 AND "sourceTemplateCode" = 'residential-v1'
      LIMIT 1
    `, projectId);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function loadSubjects(snapshotId?: string) {
  if (!snapshotId) return [];
  try {
    return await prisma.$queryRawUnsafe<SubjectRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "level", "subjectPath", "isEnabled", "showInSummary", "sortOrder"
      FROM "ProjectRuleSubjectSnapshot"
      WHERE "snapshotId" = $1
    `, snapshotId);
  } catch {
    return [];
  }
}

async function loadRules(snapshotId?: string) {
  if (!snapshotId) return [];
  try {
    return await prisma.$queryRawUnsafe<RuleRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "isEnabled",
             "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
      FROM "ProjectUnifiedRuleSnapshot"
      WHERE "snapshotId" = $1
    `, snapshotId);
  } catch {
    return [];
  }
}

export default async function ProjectRuleSnapshotPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const snapshot = await loadSnapshot(project.id);
  const [subjects, rules] = await Promise.all([loadSubjects(snapshot?.id), loadRules(snapshot?.id)]);
  const sortedSubjects = [...subjects].sort(compareItem);
  const sortedRules = [...rules].sort(compareItem);
  const enabledSubjects = sortedSubjects.filter((item) => item.isEnabled).length;
  const enabledRules = sortedRules.filter((item) => item.isEnabled).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">项目规则</p>
        <h1 className="title">{project.name} · 项目规则快照</h1>
        <p className="subtitle">项目规则快照从住宅模板复制而来。后续项目层调整规则时，只改项目快照，不改模板母版。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn btn-primary">模板母版</Link>
        <Link href={`/projects/${project.id}/template-subject-switches`} className="btn">模板科目开关</Link>
      </div>
    </div>

    {!snapshot ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>项目规则快照尚未生成</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后，会自动把 residential-v1 模板规则复制到项目快照。</p>
    </section> : null}

    {snapshot ? <>
      <div className="summary-strip" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="stat-label">来源模板</div><div className="stat-value">{snapshot.sourceTemplateName}</div><div className="meta">{snapshot.sourceTemplateCode} / {snapshot.sourceTemplateVersion}</div></div>
        <div className="stat"><div className="stat-label">快照科目</div><div className="stat-value">{subjects.length}</div><div className="meta">启用 {enabledSubjects} 项</div></div>
        <div className="stat"><div className="stat-label">快照规则</div><div className="stat-value">{rules.length}</div><div className="meta">启用 {enabledRules} 条</div></div>
        <div className="stat"><div className="stat-label">状态</div><div className="stat-value">{snapshot.snapshotStatus}</div><div className="meta">项目独立副本</div></div>
      </div>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>快照说明</h2>
        <p className="meta" style={{ marginTop: 4 }}>模板升级后不会自动覆盖项目快照。后续版本快照会从这里继续复制。</p>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>项目快照科目树</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr style={{ background: '#f1f5f9' }}>{['规则类型', '编码', '科目名称', '科目路径', '是否启用', '进入汇总'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' }}>{head}</th>)}</tr></thead>
            <tbody>{sortedSubjects.map((row) => <tr key={`${row.ruleType}-${row.subjectCode}`}>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{normalizeType(row.ruleType)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{row.subjectCode}</b></td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', paddingLeft: 10 + Math.max(0, row.level - 1) * 16 }}>{row.subjectName}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.subjectPath)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(row.isEnabled)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(row.showInSummary)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>项目快照规则</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead><tr style={{ background: '#f1f5f9' }}>{['规则类型', '科目编码', '科目名称', '阶段', '精度', '数据来源', '需要字段', '项目可调', '版本可调', '结算反哺', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{head}</th>)}</tr></thead>
            <tbody>{sortedRules.map((rule) => <tr key={`${rule.ruleType}-${rule.subjectCode}-${rule.applicableStage}-${rule.precisionLevel}`}>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{normalizeType(rule.ruleType)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{rule.subjectCode}</b></td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{rule.subjectName}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{rule.applicableStage}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{rule.precisionLevel}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(rule.dataSourceTable)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(rule.requiredFields)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(rule.allowProjectOverride)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(rule.allowVersionOverride)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(rule.participateSettlementFeedback)}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(rule.isEnabled)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </> : null}
  </div></main>;
}
