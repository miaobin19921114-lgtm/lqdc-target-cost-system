import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type FieldRow = {
  fieldKey: string;
  fieldName: string;
  fieldGroup: string | null;
  sourceTable: string;
  fieldType: string;
  unit: string | null;
  isRequired: boolean;
  applicableStage: string | null;
  precisionLevel: string | null;
  sourceRuleType: string | null;
  sourceSubjectCodes: string | null;
  sourceSubjects: string | null;
  description: string | null;
  sortOrder: number;
};

const GROUP_ORDER = ['基础输入字段', '收入测算字段', '税费测算字段', '财务评价字段', '动态成本/结算字段', '其他字段'];
const TABLE_ORDER = ['项目概况表', '业态产品表', '工程量指标表', '收入明细表', '税费参数表', '财务测算表', '合同结算表', '后评估指标库'];

function short(value?: string | null) {
  return value || '-';
}

function groupSort(name?: string | null) {
  const index = GROUP_ORDER.indexOf(name || '');
  return index >= 0 ? index : 999;
}

function tableSort(name: string) {
  const index = TABLE_ORDER.indexOf(name);
  return index >= 0 ? index : 999;
}

async function loadFields() {
  try {
    return await prisma.$queryRawUnsafe<FieldRow[]>(`
      SELECT "fieldKey", "fieldName", "fieldGroup", "sourceTable", "fieldType", "unit", "isRequired",
             "applicableStage", "precisionLevel", "sourceRuleType", "sourceSubjectCodes", "sourceSubjects", "description", "sortOrder"
      FROM "TemplateFieldDefinition"
      WHERE "templateCode" = 'residential-v1'
      ORDER BY "sortOrder" ASC
    `);
  } catch {
    return [];
  }
}

export default async function TemplateFieldDefinitionsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const fields = await loadFields();
  const groups = Array.from(new Set(fields.map((field) => field.fieldGroup || '其他字段'))).sort((a, b) => groupSort(a) - groupSort(b));
  const tables = new Set(fields.map((field) => field.sourceTable));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板中心</p>
        <h1 className="title">{project.name} · 字段定义库</h1>
        <p className="subtitle">字段定义库由规则中心反推生成。后续项目概况表、业态表、工程量表、收入表和结算表都可以从这里生成表单字段。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/template-field-requirements`} className="btn btn-primary">模板字段需求</Link>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn">规则模板中心</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">字段总数</div><div className="stat-value">{fields.length}</div><div className="meta">住宅开发模板</div></div>
      <div className="stat"><div className="stat-label">来源表</div><div className="stat-value">{tables.size}</div><div className="meta">表单生成依据</div></div>
      <div className="stat"><div className="stat-label">字段分组</div><div className="stat-value">{groups.length}</div><div className="meta">基础/收入/税费/财务/结算</div></div>
      <div className="stat"><div className="stat-label">用途</div><div className="stat-value">表单字典</div><div className="meta">字段Key、单位、类型</div></div>
    </div>

    {!fields.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>字段定义库尚未初始化</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后，会根据模板规则自动生成字段定义。</p>
    </section> : null}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((group) => {
        const groupFields = fields.filter((field) => (field.fieldGroup || '其他字段') === group)
          .sort((a, b) => tableSort(a.sourceTable) - tableSort(b.sourceTable) || a.fieldName.localeCompare(b.fieldName, 'zh-CN'));
        return <section key={group} className="card">
          <h2 style={{ marginTop: 0 }}>{group}</h2>
          <p className="meta">共 {groupFields.length} 个字段。字段用于后续自动生成录入表单，并校验测算所需数据是否完整。</p>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1250 }}>
              <thead><tr style={{ background: '#f1f5f9' }}>
                {['来源表', '字段名称', '字段Key', '单位', '类型', '必填', '适用阶段', '精度等级', '来源科目'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{head}</th>)}
              </tr></thead>
              <tbody>
                {groupFields.map((field) => <tr key={`${field.sourceTable}-${field.fieldKey}`}>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{field.sourceTable}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{field.fieldName}</b></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}><code>{field.fieldKey}</code></td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{short(field.unit)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>{field.fieldType}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7', whiteSpace: 'nowrap', color: field.isRequired ? '#2b8a3e' : '#868e96', fontWeight: 700 }}>{field.isRequired ? '是' : '否'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(field.applicableStage)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(field.precisionLevel)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(field.sourceSubjects)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
