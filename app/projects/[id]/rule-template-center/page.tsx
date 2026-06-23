import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TemplateRow = {
  code: string;
  name: string;
  developmentType: string;
  region: string | null;
  version: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
};

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
  measureBasis: string | null;
  amountFormula: string | null;
  isEnabled: boolean;
  participateSettlementFeedback: boolean;
  sortOrder: number;
};

const RULE_TYPE_ORDER = ['COST', 'TAX', 'REVENUE', 'FINANCE', 'MEASURE'];

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

function badge(value: boolean) {
  return value ? '启用' : '停用';
}

function short(value?: string | null) {
  return value || '-';
}

function ruleTypeOrder(value: string) {
  const index = RULE_TYPE_ORDER.indexOf(value);
  return index >= 0 ? index : 999;
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

function compareSubjectOrder<T extends { ruleType: string; subjectCode: string; sortOrder: number }>(a: T, b: T) {
  const typeDiff = ruleTypeOrder(a.ruleType) - ruleTypeOrder(b.ruleType);
  if (typeDiff !== 0) return typeDiff;
  const codeDiff = compareCode(a.subjectCode, b.subjectCode);
  if (codeDiff !== 0) return codeDiff;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}

async function loadTemplate() {
  try {
    const rows = await prisma.$queryRawUnsafe<TemplateRow[]>(`
      SELECT "code", "name", "developmentType", "region", "version", "description", "isDefault", "isActive"
      FROM "RuleTemplate"
      WHERE "code" = 'residential-v1'
      LIMIT 1
    `);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function loadSubjects() {
  try {
    return await prisma.$queryRawUnsafe<SubjectRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath", "isEnabled", "isDefaultEnabled",
             "participateCost", "participateRevenue", "participateTax", "participateFinance", "showInSummary", "sortOrder"
      FROM "TemplateRuleSubject"
      WHERE "templateCode" = 'residential-v1'
    `);
  } catch {
    return [];
  }
}

async function loadRules() {
  try {
    return await prisma.$queryRawUnsafe<RuleRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields",
             "measureBasis", "amountFormula", "isEnabled", "participateSettlementFeedback", "sortOrder"
      FROM "TemplateUnifiedRule"
      WHERE "templateCode" = 'residential-v1'
    `);
  } catch {
    return [];
  }
}

export default async function RuleTemplateCenterPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [template, subjects, rules] = await Promise.all([loadTemplate(), loadSubjects(), loadRules()]);
  const sortedSubjects = [...subjects].sort(compareSubjectOrder);
  const sortedRules = [...rules].sort(compareSubjectOrder);
  const groups = RULE_TYPE_ORDER.filter((type) => sortedSubjects.some((item) => item.ruleType === type))
    .concat(Array.from(new Set(sortedSubjects.map((item) => item.ruleType))).filter((type) => !RULE_TYPE_ORDER.includes(type)));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">规则中心</p>
        <h1 className="title">{project.name} · 规则模板中心</h1>
        <p className="subtitle">按开发类型模板统一管理成本、收入、税费、财务和工程量规则。模板预设全量可能科目，项目只控制是否启用；测算版本控制精度。当前排序按科目编码自然顺序。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/cost-calculation-rules`} className="btn btn-primary">规则总表</Link>
        <Link href={`/projects/${project.id}`} className="btn">测算中心</Link>
      </div>
    </div>

    {!template ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>规则模板中心尚未初始化</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后，会自动创建住宅开发模板和模板规则表。</p>
    </section> : null}

    {template ? <>
      <div className="summary-strip" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="stat-label">当前模板</div><div className="stat-value">{template.name}</div><div className="meta">{template.developmentType} / {template.version}</div></div>
        <div className="stat"><div className="stat-label">全量预设科目</div><div className="stat-value">{sortedSubjects.length}</div><div className="meta">默认预设，项目按需启用</div></div>
        <div className="stat"><div className="stat-label">规则总数</div><div className="stat-value">{sortedRules.length}</div><div className="meta">成本 / 收入 / 税费 / 财务</div></div>
        <div className="stat"><div className="stat-label">排序口径</div><div className="stat-value">科目编码</div><div className="meta">01→02→03，R01→R02</div></div>
      </div>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>{template.name}</h2>
        <p className="meta" style={{ marginTop: 4 }}>{template.description}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 12 }}>
          <div><div className="meta">开发类型</div><b>{template.developmentType}</b></div>
          <div><div className="meta">适用地区</div><b>{short(template.region)}</b></div>
          <div><div className="meta">版本号</div><b>{template.version}</b></div>
          <div><div className="meta">状态</div><b>{template.isActive ? '启用' : '停用'}</b></div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}>
        <h2 style={{ marginTop: 0 }}>模板科目树</h2>
        <p className="meta">模板下预设所有可能用到的科目。项目测算时只需要控制是否启用，不再临时补科目。预备费排在税金前面。</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginTop: 12 }}>
          {groups.map((group) => {
            const rows = sortedSubjects.filter((item) => item.ruleType === group);
            return <details key={group} open={group === 'COST'} style={{ border: '1px solid #e6eef7', borderRadius: 12, background: '#fff', padding: '10px 12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 900 }}>{normalizeType(group)} <span className="meta">({rows.length})</span></summary>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map((row) => <div key={`${row.ruleType}-${row.subjectCode}`} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 48px', gap: 8, fontSize: 13, paddingLeft: Math.max(0, row.level - 1) * 14 }}>
                  <b>{row.subjectCode}</b>
                  <span>{row.subjectName}</span>
                  <span style={{ color: row.isEnabled ? '#2b8a3e' : '#868e96', fontWeight: 700 }}>{badge(row.isEnabled)}</span>
                </div>)}
              </div>
            </details>;
          })}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>规则总表</h2>
        <p className="meta">规则以模板为上级容器。规则总表按科目编码自然顺序排列，后续新增厂房模板、商业模板时沿用同一排序口径。</p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead><tr style={{ background: '#f1f5f9' }}>
              {['规则类型', '科目编码', '科目名称', '适用阶段', '精度等级', '数据来源', '需要字段', '计算规则', '结算反哺', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{head}</th>)}
            </tr></thead>
            <tbody>
              {sortedRules.map((rule) => <tr key={`${rule.ruleType}-${rule.subjectCode}-${rule.precisionLevel}`}>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{normalizeType(rule.ruleType)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}><b>{rule.subjectCode}</b></td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{rule.subjectName}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{rule.applicableStage}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{rule.precisionLevel}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(rule.dataSourceTable)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(rule.requiredFields)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(rule.measureBasis || rule.amountFormula)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{rule.participateSettlementFeedback ? '是' : '否'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{badge(rule.isEnabled)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </> : null}
  </div></main>;
}
