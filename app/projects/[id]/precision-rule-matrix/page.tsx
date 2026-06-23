import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type MatrixRow = {
  applicableStage: string;
  precisionLevel: string;
  ruleType: string;
  ruleCount: number;
  enabledCount: number;
};

type SampleRow = {
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

const PRECISION_ORDER = ['L1 快速估算', 'L2 方案估算', 'L3 目标测算', 'L4 动态控制', 'L5 结算复盘'];
const RULE_TYPE_ORDER = ['COST', 'TAX', 'REVENUE', 'FINANCE', 'MEASURE'];

function normalizeType(value: string) {
  const map: Record<string, string> = { COST: '成本', REVENUE: '收入', TAX: '税费', FINANCE: '财务', MEASURE: '工程量' };
  return map[value] || value;
}

function short(value?: string | null) {
  return value || '-';
}

async function loadMatrix() {
  try {
    return await prisma.$queryRawUnsafe<MatrixRow[]>(`
      SELECT "applicableStage", "precisionLevel", "ruleType", COUNT(*)::int AS "ruleCount", COUNT(*) FILTER (WHERE "isEnabled" = TRUE)::int AS "enabledCount"
      FROM "TemplateUnifiedRule"
      WHERE "templateCode" = 'residential-v1'
      GROUP BY "applicableStage", "precisionLevel", "ruleType"
    `);
  } catch {
    return [];
  }
}

async function loadSamples() {
  try {
    return await prisma.$queryRawUnsafe<SampleRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields", "measureBasis", "amountFormula", "sortOrder"
      FROM "TemplateUnifiedRule"
      WHERE "templateCode" = 'residential-v1'
      ORDER BY "sortOrder" ASC
      LIMIT 240
    `);
  } catch {
    return [];
  }
}

function precisionIndex(value: string) {
  const index = PRECISION_ORDER.indexOf(value);
  return index >= 0 ? index : 999;
}

function typeIndex(value: string) {
  const index = RULE_TYPE_ORDER.indexOf(value);
  return index >= 0 ? index : 999;
}

export default async function PrecisionRuleMatrixPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [matrix, samples] = await Promise.all([loadMatrix(), loadSamples()]);
  const sortedMatrix = [...matrix].sort((a, b) => precisionIndex(a.precisionLevel) - precisionIndex(b.precisionLevel) || typeIndex(a.ruleType) - typeIndex(b.ruleType));
  const totalRules = matrix.reduce((sum, row) => sum + row.ruleCount, 0);
  const totalEnabled = matrix.reduce((sum, row) => sum + row.enabledCount, 0);
  const levels = Array.from(new Set(matrix.map((row) => row.precisionLevel))).sort((a, b) => precisionIndex(a) - precisionIndex(b));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1450 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板规则</p>
        <h1 className="title">{project.name} · L1-L5 精度规则矩阵</h1>
        <p className="subtitle">同一个末级科目按不同测算阶段拆成五级规则：投前快测、方案估算、目标测算、动态控制、结算复盘。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/template-rule-editor`} className="btn btn-primary">模板规则编辑</Link>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn">规则模板中心</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">精度等级</div><div className="stat-value">{levels.length}</div><div className="meta">应为 5 级</div></div>
      <div className="stat"><div className="stat-label">规则总数</div><div className="stat-value">{totalRules}</div><div className="meta">所有级别合计</div></div>
      <div className="stat"><div className="stat-label">启用规则</div><div className="stat-value">{totalEnabled}</div><div className="meta">参与模板测算</div></div>
      <div className="stat"><div className="stat-label">规则来源</div><div className="stat-value">L3扩展</div><div className="meta">由目标规则拆分</div></div>
    </div>

    <section className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ marginTop: 0 }}>精度规则统计</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead><tr style={{ background: '#f1f5f9' }}>{['精度等级', '测算阶段', '规则类型', '规则数', '启用数'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' }}>{head}</th>)}</tr></thead>
          <tbody>{sortedMatrix.map((row) => <tr key={`${row.precisionLevel}-${row.ruleType}-${row.applicableStage}`}>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{row.precisionLevel}</b></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.applicableStage}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{normalizeType(row.ruleType)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.ruleCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.enabledCount}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>规则样例</h2>
      <p className="meta">用于快速检查 L1-L5 是否已经生成不同的数据来源、字段和公式。</p>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
          <thead><tr style={{ background: '#f1f5f9' }}>{['精度', '阶段', '类型', '编码', '科目', '数据来源', '字段', '计量指标', '金额公式'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' }}>{head}</th>)}</tr></thead>
          <tbody>{samples.map((row) => <tr key={`${row.precisionLevel}-${row.ruleType}-${row.subjectCode}-${row.applicableStage}`}>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}><b>{row.precisionLevel}</b></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{row.applicableStage}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{normalizeType(row.ruleType)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.subjectCode}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.subjectName}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.dataSourceTable)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.requiredFields)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.measureBasis)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.amountFormula)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div></main>;
}
