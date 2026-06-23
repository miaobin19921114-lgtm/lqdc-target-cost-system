import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RequirementRule = {
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
  measureBasis: string | null;
  amountFormula: string | null;
  sortOrder: number;
};

type RequirementGroup = {
  tableName: string;
  fields: Set<string>;
  rules: RequirementRule[];
};

const TABLE_ORDER = [
  '项目概况表',
  '业态产品表',
  '工程量指标表',
  '收入明细表',
  '税费参数表',
  '财务测算表',
  '合同结算表',
  '后评估指标库',
];

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

function short(value?: string | null) {
  return value || '-';
}

function splitList(value?: string | null) {
  return String(value || '')
    .split(/[、,，/／]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tableSortValue(name: string) {
  const index = TABLE_ORDER.indexOf(name);
  return index >= 0 ? index : 999;
}

function ruleTypeSortValue(type: string) {
  const index = RULE_TYPE_ORDER.indexOf(type);
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

function compareRule(a: RequirementRule, b: RequirementRule) {
  const typeDiff = ruleTypeSortValue(a.ruleType) - ruleTypeSortValue(b.ruleType);
  if (typeDiff !== 0) return typeDiff;
  const codeDiff = compareCode(a.subjectCode, b.subjectCode);
  if (codeDiff !== 0) return codeDiff;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}

async function loadRules() {
  try {
    return await prisma.$queryRawUnsafe<RequirementRule[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable",
             "requiredFields", "measureBasis", "amountFormula", "sortOrder"
      FROM "TemplateUnifiedRule"
      WHERE "templateCode" = 'residential-v1' AND "isEnabled" = TRUE
    `);
  } catch {
    return [];
  }
}

function buildGroups(rules: RequirementRule[]) {
  const map = new Map<string, RequirementGroup>();
  for (const rule of rules) {
    const tables = splitList(rule.dataSourceTable || '未指定来源表');
    const fields = splitList(rule.requiredFields || '未指定字段');
    for (const table of tables) {
      if (!map.has(table)) {
        map.set(table, { tableName: table, fields: new Set<string>(), rules: [] });
      }
      const group = map.get(table)!;
      fields.forEach((field) => group.fields.add(field));
      group.rules.push(rule);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const tableDiff = tableSortValue(a.tableName) - tableSortValue(b.tableName);
    if (tableDiff !== 0) return tableDiff;
    return a.tableName.localeCompare(b.tableName, 'zh-CN');
  });
}

export default async function TemplateFieldRequirementsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const rules = (await loadRules()).sort(compareRule);
  const groups = buildGroups(rules);
  const totalFields = new Set(groups.flatMap((group) => Array.from(group.fields))).size;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">规则中心</p>
        <h1 className="title">{project.name} · 模板字段需求</h1>
        <p className="subtitle">根据住宅开发模板规则中心的“数据来源表”和“需要字段”自动反推。后续项目录入表、业态表、工程量表、收入表都应由这里生成。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn btn-primary">规则模板中心</Link>
        <Link href={`/projects/${project.id}/cost-calculation-rules`} className="btn">规则总表</Link>
        <Link href={`/projects/${project.id}`} className="btn">测算中心</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">来源规则</div><div className="stat-value">{rules.length}</div><div className="meta">住宅开发模板</div></div>
      <div className="stat"><div className="stat-label">来源表</div><div className="stat-value">{groups.length}</div><div className="meta">按数据来源归类</div></div>
      <div className="stat"><div className="stat-label">字段项</div><div className="stat-value">{totalFields}</div><div className="meta">去重后字段需求</div></div>
      <div className="stat"><div className="stat-label">用途</div><div className="stat-value">反推表单</div><div className="meta">高精度测算输入</div></div>
    </div>

    {!rules.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>暂无模板字段需求</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待规则模板中心初始化完成后，会自动根据模板规则生成字段需求。</p>
    </section> : null}

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
      {groups.map((group) => {
        const sortedRules = [...group.rules].sort(compareRule);
        const sortedFields = Array.from(group.fields).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        return <section key={group.tableName} className="card" style={{ borderColor: '#d0ebff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 4 }}>{group.tableName}</h2>
              <p className="meta" style={{ margin: 0 }}>字段 {sortedFields.length} 项 / 关联规则 {sortedRules.length} 条</p>
            </div>
            <span style={{ border: '1px solid #d0ebff', background: '#e7f5ff', color: '#0b7285', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>字段需求</span>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sortedFields.map((field) => <span key={field} style={{ border: '1px solid #e6eef7', background: '#f8fbff', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>{field}</span>)}
          </div>

          <details style={{ marginTop: 12, borderTop: '1px solid #e6eef7', paddingTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 900 }}>查看关联规则</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {sortedRules.map((rule) => <div key={`${rule.ruleType}-${rule.subjectCode}-${rule.precisionLevel}-${group.tableName}`} style={{ border: '1px solid #edf2f7', borderRadius: 10, padding: 8, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <b>{rule.subjectCode}｜{rule.subjectName}</b>
                  <span className="meta">{normalizeType(rule.ruleType)} / {rule.precisionLevel}</span>
                </div>
                <div className="meta" style={{ marginTop: 4 }}>阶段：{rule.applicableStage}</div>
                <div className="meta" style={{ marginTop: 4 }}>规则：{short(rule.measureBasis || rule.amountFormula)}</div>
              </div>)}
            </div>
          </details>
        </section>;
      })}
    </div>
  </div></main>;
}
