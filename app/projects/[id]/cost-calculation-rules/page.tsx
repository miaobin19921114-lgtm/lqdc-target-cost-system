import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RuleRow = {
  ruleKey: string;
  costCode: string | null;
  subjectName: string;
  subjectPath: string | null;
  dataSource: string | null;
  quantityField: string | null;
  configField: string | null;
  calculationMethod: string | null;
  defaultUnit: string | null;
  defaultUnitPrice: unknown;
  defaultCoefficient: unknown;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  taxDeductionMethod: string | null;
  vatInputCreditAllowed: boolean | null;
  vatRate: unknown;
  vatTreatment: string | null;
  nonDeductibleVatTreatment: string | null;
  landVatDeductible: boolean | null;
  landVatDeductionCategory: string | null;
  landVatAllocationMethod: string | null;
  landVatClearanceObject: string | null;
  incomeTaxDeductible: boolean | null;
  incomeTaxTreatment: string | null;
  incomeTaxCostObject: string | null;
  incomeTaxAllocationMethod: string | null;
  periodExpenseType: string | null;
  allowQuantityOverride: boolean | null;
  allowPriceOverride: boolean | null;
  enabled: boolean | null;
  priority: number | null;
  remark: string | null;
};

function short(value?: string | null) {
  return value || '-';
}

function text(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function numeric(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function groupOf(path?: string | null) {
  const textValue = path || '未分组';
  return textValue.split(/[>／/｜|]/).map((item) => item.trim()).filter(Boolean)[0] || '未分组';
}

async function loadRules() {
  try {
    return await prisma.$queryRawUnsafe<RuleRow[]>(`
      SELECT "ruleKey", "costCode", "subjectName", "subjectPath", "dataSource", "quantityField", "configField", "calculationMethod", "defaultUnit", "defaultUnitPrice", "defaultCoefficient", "costAttributionMethod", "allocationMethod", "taxDeductionMethod", "vatInputCreditAllowed", "vatRate", "vatTreatment", "nonDeductibleVatTreatment", "landVatDeductible", "landVatDeductionCategory", "landVatAllocationMethod", "landVatClearanceObject", "incomeTaxDeductible", "incomeTaxTreatment", "incomeTaxCostObject", "incomeTaxAllocationMethod", "periodExpenseType", "allowQuantityOverride", "allowPriceOverride", "enabled", "priority", "remark"
      FROM "CostCalculationRule"
      ORDER BY "priority" ASC, "costCode" ASC
    `);
  } catch {
    return [];
  }
}

const inputStyle = { height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '4px 8px', background: '#fff' };

function Field({ label, name, value, wide }: { label: string; name: string; value?: string | null; wide?: boolean }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#475467', fontWeight: 700, gridColumn: wide ? '1 / -1' : undefined }}>{label}
    <input name={name} defaultValue={value || ''} style={inputStyle} />
  </label>;
}

function NumberField({ label, name, value }: { label: string; name: string; value: unknown }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#475467', fontWeight: 700 }}>{label}
    <input name={name} type="number" step="0.01" defaultValue={text(value)} style={inputStyle} />
  </label>;
}

function SwitchField({ label, name, value }: { label: string; name: string; value?: boolean | null }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#475467', fontWeight: 700 }}>{label}
    <select name={name} defaultValue={value ? 'true' : 'false'} style={inputStyle}>
      <option value="true">是</option>
      <option value="false">否</option>
    </select>
  </label>;
}

function InfoBlock({ title, value, note }: { title: string; value: string; note?: string }) {
  return <div style={{ border: '1px solid #e6eef7', background: '#fff', borderRadius: 10, padding: 10 }}>
    <div className="meta">{title}</div>
    <b>{value || '-'}</b>
    {note ? <div className="meta" style={{ marginTop: 4 }}>{note}</div> : null}
  </div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ gridColumn: '1 / -1', fontWeight: 900, color: '#0f4c5c', paddingTop: 4 }}>{children}</div>;
}

export default async function CostCalculationRulesPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;
  const rules = await loadRules();
  const groups = Array.from(new Set(rules.map((rule) => groupOf(rule.subjectPath))));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div><p className="eyebrow">目标成本</p><h1 className="title">{project.name} · 规则数据库</h1><p className="subtitle">按末级成本科目维护计量指标、配置参数、计价规则、成本归属、成本分摊及税务处理口径。默认展示业务规则摘要，展开后编辑详细规则。</p></div>
      <div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-mapping`} className="btn">测算规则映射表</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本测算</Link><Link href={`/projects/${project.id}`} className="btn">测算中心</Link></div>
    </div>

    {searchParams?.ruleSaved === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>规则已保存。</div> : null}
    {searchParams?.ruleError === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>规则保存失败，请稍后重试或检查规则数据库是否已初始化。</div> : null}
    {searchParams?.ruleMissing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>未找到规则编号。</div> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">规则数量</div><div className="stat-value">{rules.length}</div><div className="meta">末级科目规则</div></div>
      <div className="stat"><div className="stat-label">成本分组</div><div className="stat-value">{groups.length}</div><div className="meta">按一级科目路径归组</div></div>
      <div className="stat"><div className="stat-label">税务口径</div><div className="stat-value">三套</div><div className="meta">增值税 / 土地增值税 / 企业所得税</div></div>
      <div className="stat"><div className="stat-label">展示方式</div><div className="stat-value">分组折叠</div><div className="meta">规则摘要与编辑参数分层</div></div>
    </div>

    {!rules.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}><b>规则数据库尚未初始化</b><p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后会自动创建 CostCalculationRule 表，并按标准成本末级科目生成初始规则。</p></section> : null}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((group) => {
        const rows = rules.filter((rule) => groupOf(rule.subjectPath) === group);
        return <section key={group} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0 }}>{group}</h2><p className="meta" style={{ margin: '5px 0 0' }}>本组共 {rows.length} 条规则。默认折叠，点击展开维护。</p></div><span style={{ border: '1px solid #d0ebff', background: '#e7f5ff', color: '#0b7285', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{rows.length} 条</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {rows.map((rule) => <details key={rule.ruleKey} style={{ border: '1px solid #e6eef7', borderRadius: 12, background: '#fbfdff', overflow: 'hidden' }}>
              <summary style={{ cursor: 'pointer', padding: 12, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr', gap: 10, alignItems: 'center' }}>
                <div><b>{rule.costCode || '-'}</b><div className="meta">{short(rule.subjectPath || rule.subjectName)}</div></div>
                <div><span className="meta">计价规则</span><br />{short(rule.calculationMethod)}</div>
                <div><span className="meta">计量指标</span><br />{short(rule.quantityField)}</div>
                <div><span className="meta">税务处理</span><br />增值税 {rule.vatInputCreditAllowed ? '可抵扣' : '不抵扣'} / 土增税 {rule.landVatDeductible ? '可扣除' : '不扣除'} / 所得税 {rule.incomeTaxDeductible ? '可扣除' : '不扣除'}</div>
              </summary>
              <div style={{ borderTop: '1px solid #e6eef7', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <InfoBlock title="数据来源" value={short(rule.dataSource)} />
                <InfoBlock title="计量指标" value={short(rule.quantityField)} />
                <InfoBlock title="配置参数" value={short(rule.configField)} />
                <InfoBlock title="成本归属口径" value={short(rule.costAttributionMethod)} />
                <InfoBlock title="成本分摊口径" value={short(rule.allocationMethod)} />
                <InfoBlock title="综合税务口径" value={short(rule.taxDeductionMethod)} />
              </div>
              <form action={`/api/projects/${project.id}/cost-calculation-rules`} method="post" style={{ borderTop: '1px solid #e6eef7', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                <input type="hidden" name="ruleKey" value={rule.ruleKey} />
                <SectionTitle>一、计量与计价规则</SectionTitle>
                <Field label="计量指标字段" name="quantityField" value={rule.quantityField} />
                <Field label="配置参数字段" name="configField" value={rule.configField} />
                <Field label="计价规则" name="calculationMethod" value={rule.calculationMethod} />
                <SwitchField label="允许调整计量指标" name="allowQuantityOverride" value={rule.allowQuantityOverride} />
                <SwitchField label="允许调整单价参数" name="allowPriceOverride" value={rule.allowPriceOverride} />

                <SectionTitle>二、成本归属与成本分摊</SectionTitle>
                <Field label="成本归属口径" name="costAttributionMethod" value={rule.costAttributionMethod} />
                <Field label="成本分摊口径" name="allocationMethod" value={rule.allocationMethod} />

                <SectionTitle>三、增值税处理口径</SectionTitle>
                <SwitchField label="是否允许进项税抵扣" name="vatInputCreditAllowed" value={rule.vatInputCreditAllowed} />
                <NumberField label="适用增值税税率" name="vatRate" value={numeric(rule.vatRate || 0.09)} />
                <Field label="增值税处理方式" name="vatTreatment" value={rule.vatTreatment} />
                <Field label="不可抵扣进项税处理方式" name="nonDeductibleVatTreatment" value={rule.nonDeductibleVatTreatment} />

                <SectionTitle>四、土地增值税处理口径</SectionTitle>
                <SwitchField label="是否纳入土增税扣除项目" name="landVatDeductible" value={rule.landVatDeductible} />
                <Field label="土增税扣除项目类别" name="landVatDeductionCategory" value={rule.landVatDeductionCategory} />
                <Field label="土增税清算对象" name="landVatClearanceObject" value={rule.landVatClearanceObject} />
                <Field label="土增税分摊口径" name="landVatAllocationMethod" value={rule.landVatAllocationMethod} />

                <SectionTitle>五、企业所得税处理口径</SectionTitle>
                <SwitchField label="是否企业所得税税前扣除" name="incomeTaxDeductible" value={rule.incomeTaxDeductible} />
                <Field label="企业所得税处理方式" name="incomeTaxTreatment" value={rule.incomeTaxTreatment} />
                <Field label="企业所得税成本对象" name="incomeTaxCostObject" value={rule.incomeTaxCostObject} />
                <Field label="企业所得税分摊口径" name="incomeTaxAllocationMethod" value={rule.incomeTaxAllocationMethod} />
                <Field label="期间费用类别" name="periodExpenseType" value={rule.periodExpenseType} />

                <SectionTitle>六、系统参数与备注</SectionTitle>
                <Field label="综合税务口径说明" name="taxDeductionMethod" value={rule.taxDeductionMethod} />
                <Field label="规则备注" name="remark" value={rule.remark} wide />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="btn btn-primary">保存规则</button></div>
              </form>
            </details>)}
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
