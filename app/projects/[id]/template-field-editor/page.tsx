import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type FieldRow = {
  id: string;
  fieldKey: string;
  fieldName: string;
  fieldGroup: string;
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

function valueOf(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

async function updateField(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const fieldId = valueOf(formData, 'fieldId');
  if (!projectId || !fieldId) redirect(projectId ? `/projects/${projectId}/template-field-editor` : '/');

  await prisma.$executeRawUnsafe(`
    UPDATE "TemplateFieldDefinition"
    SET "fieldName" = $1,
        "fieldGroup" = $2,
        "sourceTable" = $3,
        "fieldType" = $4,
        "unit" = $5,
        "isRequired" = $6,
        "applicableStage" = $7,
        "precisionLevel" = $8,
        "description" = $9,
        "sortOrder" = $10,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $11 AND "templateCode" = 'residential-v1'
  `,
    valueOf(formData, 'fieldName'),
    valueOf(formData, 'fieldGroup'),
    valueOf(formData, 'sourceTable'),
    valueOf(formData, 'fieldType') || 'string',
    valueOf(formData, 'unit'),
    String(formData.get('isRequired') || '') === 'on',
    valueOf(formData, 'applicableStage'),
    valueOf(formData, 'precisionLevel'),
    valueOf(formData, 'description'),
    Number(valueOf(formData, 'sortOrder') || 0),
    fieldId,
  );

  revalidatePath(`/projects/${projectId}/template-field-editor`);
  revalidatePath(`/projects/${projectId}/template-field-definitions`);
  revalidatePath(`/projects/${projectId}/template-field-requirements`);
  redirect(`/projects/${projectId}/template-field-editor`);
}

async function loadFields() {
  try {
    return await prisma.$queryRawUnsafe<FieldRow[]>(`
      SELECT "id", "fieldKey", "fieldName", "fieldGroup", "sourceTable", "fieldType", "unit", "isRequired", "applicableStage", "precisionLevel",
             "sourceRuleType", "sourceSubjectCodes", "sourceSubjects", "description", "sortOrder"
      FROM "TemplateFieldDefinition"
      WHERE "templateCode" = 'residential-v1'
      ORDER BY "sourceTable" ASC, "fieldGroup" ASC, "sortOrder" ASC, "fieldName" ASC
    `);
  } catch {
    return [];
  }
}

function short(value?: string | null) {
  return value || '-';
}

function yesNo(value: boolean) {
  return value ? '是' : '否';
}

function Input({ label, name, value, type = 'text' }: { label: string; name: string; value?: string | number | null; type?: string }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span className="meta">{label}</span>
    <input name={name} type={type} defaultValue={value ?? ''} style={{ border: '1px solid #d8e0ea', borderRadius: 8, padding: 8, fontSize: 13 }} />
  </label>;
}

function Textarea({ label, name, value }: { label: string; name: string; value?: string | null }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span className="meta">{label}</span>
    <textarea name={name} defaultValue={value || ''} rows={3} style={{ border: '1px solid #d8e0ea', borderRadius: 8, padding: 8, fontSize: 13, lineHeight: 1.45 }} />
  </label>;
}

export default async function TemplateFieldEditorPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const fields = await loadFields();
  const requiredCount = fields.filter((field) => field.isRequired).length;
  const groups = Array.from(new Set(fields.map((field) => field.fieldGroup || '未分组')));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板字段</p>
        <h1 className="title">{project.name} · 字段定义编辑</h1>
        <p className="subtitle">这里维护住宅模板字段定义。字段定义会服务模板规则、项目录入表单和后续 AI 成本知识库。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/template-field-definitions`} className="btn btn-primary">字段定义库</Link>
        <Link href={`/projects/${project.id}/template-field-requirements`} className="btn">字段需求</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">字段总数</div><div className="stat-value">{fields.length}</div><div className="meta">住宅模板</div></div>
      <div className="stat"><div className="stat-label">必填字段</div><div className="stat-value">{requiredCount}</div><div className="meta">项目录入重点</div></div>
      <div className="stat"><div className="stat-label">字段分组</div><div className="stat-value">{groups.length}</div><div className="meta">按用途维护</div></div>
      <div className="stat"><div className="stat-label">编辑范围</div><div className="stat-value">母版字段</div><div className="meta">不直接改项目数据</div></div>
    </div>

    {!fields.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>字段定义尚未初始化</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后，会自动从模板规则反推字段定义。</p>
    </section> : null}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((group) => {
        const rows = fields.filter((field) => (field.fieldGroup || '未分组') === group);
        return <section key={group} className="card">
          <h2 style={{ marginTop: 0 }}>{group} <span className="meta">({rows.length})</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((field) => <details key={field.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12 }}>
              <summary style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: '180px 1fr 160px 90px 70px', gap: 10, alignItems: 'center' }}>
                <b>{field.fieldName}</b>
                <span className="meta">{field.fieldKey}</span>
                <span>{field.sourceTable}</span>
                <span>{short(field.unit)}</span>
                <span style={{ color: field.isRequired ? '#c92a2a' : '#868e96', fontWeight: 800 }}>{yesNo(field.isRequired)}</span>
              </summary>
              <form action={updateField} style={{ marginTop: 12 }}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="fieldId" value={field.id} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  <Input label="字段名称" name="fieldName" value={field.fieldName} />
                  <Input label="字段分组" name="fieldGroup" value={field.fieldGroup} />
                  <Input label="来源表" name="sourceTable" value={field.sourceTable} />
                  <Input label="字段类型" name="fieldType" value={field.fieldType} />
                  <Input label="单位" name="unit" value={field.unit} />
                  <Input label="适用阶段" name="applicableStage" value={field.applicableStage} />
                  <Input label="精度等级" name="precisionLevel" value={field.precisionLevel} />
                  <Input label="排序" name="sortOrder" value={field.sortOrder} type="number" />
                  <Textarea label="字段说明" name="description" value={field.description} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 10 }}>
                  <div><div className="meta">来源规则类型</div><b>{short(field.sourceRuleType)}</b></div>
                  <div><div className="meta">来源科目编码</div><b>{short(field.sourceSubjectCodes)}</b></div>
                  <div><div className="meta">来源科目</div><b>{short(field.sourceSubjects)}</b></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" name="isRequired" defaultChecked={field.isRequired} />
                    <span>设为必填字段</span>
                  </label>
                  <button type="submit" className="btn btn-primary">保存字段</button>
                </div>
              </form>
            </details>)}
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
