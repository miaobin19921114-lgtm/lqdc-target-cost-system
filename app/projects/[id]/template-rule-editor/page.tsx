import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RuleRow = {
  id: string;
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
  measureBasis: string | null;
  quantityFormula: string | null;
  pricingUnit: string | null;
  unitPriceSource: string | null;
  amountFormula: string | null;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  vatTreatment: string | null;
  landVatTreatment: string | null;
  incomeTaxTreatment: string | null;
  financeTreatment: string | null;
  isEnabled: boolean;
  sortOrder: number;
};

const RULE_TYPE_ORDER = ['COST', 'TAX', 'REVENUE', 'FINANCE', 'MEASURE'];

function normalizeType(value: string) {
  const map: Record<string, string> = { COST: '成本', REVENUE: '收入', TAX: '税费', FINANCE: '财务', MEASURE: '工程量' };
  return map[value] || value;
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

function compareRule(a: RuleRow, b: RuleRow) {
  const typeDiff = typeOrder(a.ruleType) - typeOrder(b.ruleType);
  if (typeDiff !== 0) return typeDiff;
  const codeDiff = compareCode(a.subjectCode, b.subjectCode);
  if (codeDiff !== 0) return codeDiff;
  return a.sortOrder - b.sortOrder;
}

function valueOf(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

async function updateRule(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const ruleId = valueOf(formData, 'ruleId');
  if (!projectId || !ruleId) redirect(projectId ? `/projects/${projectId}/template-rule-editor` : '/');

  await prisma.$executeRawUnsafe(`
    UPDATE "TemplateUnifiedRule"
    SET "dataSourceTable" = $1,
        "requiredFields" = $2,
        "measureBasis" = $3,
        "quantityFormula" = $4,
        "pricingUnit" = $5,
        "unitPriceSource" = $6,
        "amountFormula" = $7,
        "costAttributionMethod" = $8,
        "allocationMethod" = $9,
        "vatTreatment" = $10,
        "landVatTreatment" = $11,
        "incomeTaxTreatment" = $12,
        "financeTreatment" = $13,
        "isEnabled" = $14,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $15 AND "templateCode" = 'residential-v1'
  `,
    valueOf(formData, 'dataSourceTable'),
    valueOf(formData, 'requiredFields'),
    valueOf(formData, 'measureBasis'),
    valueOf(formData, 'quantityFormula'),
    valueOf(formData, 'pricingUnit'),
    valueOf(formData, 'unitPriceSource'),
    valueOf(formData, 'amountFormula'),
    valueOf(formData, 'costAttributionMethod'),
    valueOf(formData, 'allocationMethod'),
    valueOf(formData, 'vatTreatment'),
    valueOf(formData, 'landVatTreatment'),
    valueOf(formData, 'incomeTaxTreatment'),
    valueOf(formData, 'financeTreatment'),
    String(formData.get('isEnabled') || '') === 'on',
    ruleId,
  );

  revalidatePath(`/projects/${projectId}/template-rule-editor`);
  revalidatePath(`/projects/${projectId}/rule-template-center`);
  revalidatePath(`/projects/${projectId}/template-field-requirements`);
  revalidatePath(`/projects/${projectId}/template-field-definitions`);
  redirect(`/projects/${projectId}/template-rule-editor`);
}

async function loadRules() {
  try {
    return await prisma.$queryRawUnsafe<RuleRow[]>(`
      SELECT "id", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields",
             "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "costAttributionMethod", "allocationMethod",
             "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled", "sortOrder"
      FROM "TemplateUnifiedRule"
      WHERE "templateCode" = 'residential-v1'
    `);
  } catch {
    return [];
  }
}

function Field({ label, name, value, long = false }: { label: string; name: string; value?: string | null; long?: boolean }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span className="meta">{label}</span>
    <textarea name={name} defaultValue={value || ''} rows={long ? 3 : 2} style={{ width: '100%', border: '1px solid #d8e0ea', borderRadius: 8, padding: 8, fontSize: 13, lineHeight: 1.45 }} />
  </label>;
}

export default async function TemplateRuleEditorPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const rules = (await loadRules()).sort(compareRule);
  const enabledCount = rules.filter((rule) => rule.isEnabled).length;
  const groups = RULE_TYPE_ORDER.filter((type) => rules.some((rule) => rule.ruleType === type))
    .concat(Array.from(new Set(rules.map((rule) => rule.ruleType))).filter((type) => !RULE_TYPE_ORDER.includes(type)));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板规则</p>
        <h1 className="title">{project.name} · 模板规则编辑</h1>
        <p className="subtitle">这里编辑住宅模板母版规则。项目快照和版本快照不会被直接覆盖，后续可单独做同步或重建快照。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn btn-primary">规则模板中心</Link>
        <Link href={`/projects/${project.id}/project-rule-snapshot`} className="btn">项目规则快照</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">模板规则</div><div className="stat-value">{rules.length}</div><div className="meta">住宅开发模板</div></div>
      <div className="stat"><div className="stat-label">启用规则</div><div className="stat-value">{enabledCount}</div><div className="meta">参与模板规则</div></div>
      <div className="stat"><div className="stat-label">编辑范围</div><div className="stat-value">母版</div><div className="meta">不直接改项目/版本</div></div>
      <div className="stat"><div className="stat-label">字段</div><div className="stat-value">公式/口径</div><div className="meta">可维护</div></div>
    </div>

    {!rules.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>模板规则尚未初始化</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后，会自动生成规则。</p>
    </section> : null}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((group) => {
        const groupRules = rules.filter((rule) => rule.ruleType === group);
        return <section key={group} className="card">
          <h2 style={{ marginTop: 0 }}>{normalizeType(group)}规则 <span className="meta">({groupRules.length})</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupRules.map((rule) => <details key={rule.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12 }}>
              <summary style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: '90px 1fr 120px 130px 80px', gap: 10, alignItems: 'center' }}>
                <b>{rule.subjectCode}</b>
                <span>{rule.subjectName}</span>
                <span className="meta">{rule.applicableStage}</span>
                <span className="meta">{rule.precisionLevel}</span>
                <span style={{ color: rule.isEnabled ? '#2b8a3e' : '#868e96', fontWeight: 800 }}>{rule.isEnabled ? '启用' : '停用'}</span>
              </summary>
              <form action={updateRule} style={{ marginTop: 12 }}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="ruleId" value={rule.id} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                  <Field label="数据来源表" name="dataSourceTable" value={rule.dataSourceTable} />
                  <Field label="需要字段" name="requiredFields" value={rule.requiredFields} long />
                  <Field label="计量指标" name="measureBasis" value={rule.measureBasis} />
                  <Field label="工程量公式" name="quantityFormula" value={rule.quantityFormula} long />
                  <Field label="计价单位" name="pricingUnit" value={rule.pricingUnit} />
                  <Field label="单价来源" name="unitPriceSource" value={rule.unitPriceSource} />
                  <Field label="金额公式" name="amountFormula" value={rule.amountFormula} long />
                  <Field label="成本归属口径" name="costAttributionMethod" value={rule.costAttributionMethod} long />
                  <Field label="分摊口径" name="allocationMethod" value={rule.allocationMethod} long />
                  <Field label="增值税口径" name="vatTreatment" value={rule.vatTreatment} long />
                  <Field label="土地增值税口径" name="landVatTreatment" value={rule.landVatTreatment} long />
                  <Field label="企业所得税口径" name="incomeTaxTreatment" value={rule.incomeTaxTreatment} long />
                  <Field label="财务处理口径" name="financeTreatment" value={rule.financeTreatment} long />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" name="isEnabled" defaultChecked={rule.isEnabled} />
                    <span>启用此规则</span>
                  </label>
                  <button type="submit" className="btn btn-primary">保存规则</button>
                </div>
              </form>
            </details>)}
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
