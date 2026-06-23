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

function groupOf(path?: string | null) {
  const textValue = path || '未分组';
  return textValue.split(/[>／/｜|]/).map((item) => item.trim()).filter(Boolean)[0] || '未分组';
}

async function loadRules() {
  try {
    return await prisma.$queryRawUnsafe<RuleRow[]>(`
      SELECT "ruleKey", "costCode", "subjectName", "subjectPath", "dataSource", "quantityField", "configField", "calculationMethod", "defaultUnit", "defaultUnitPrice", "defaultCoefficient", "costAttributionMethod", "allocationMethod", "taxDeductionMethod", "allowQuantityOverride", "allowPriceOverride", "enabled", "priority", "remark"
      FROM "CostCalculationRule"
      ORDER BY "priority" ASC, "costCode" ASC
    `);
  } catch {
    return [];
  }
}

function Field({ label, name, value, wide }: { label: string; name: string; value?: string | null; wide?: boolean }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#475467', fontWeight: 700, gridColumn: wide ? '1 / -1' : undefined }}>{label}
    <input name={name} defaultValue={value || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '4px 8px', background: '#fff' }} />
  </label>;
}

function SwitchField({ label, name, value }: { label: string; name: string; value?: boolean | null }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#475467', fontWeight: 700 }}>{label}
    <select name={name} defaultValue={value ? 'true' : 'false'} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '4px 8px', background: '#fff' }}>
      <option value="true">是</option>
      <option value="false">否</option>
    </select>
  </label>;
}

export default async function CostCalculationRulesPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;
  const rules = await loadRules();
  const groups = Array.from(new Set(rules.map((rule) => groupOf(rule.subjectPath))));

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header">
      <div><p className="eyebrow">目标成本</p><h1 className="title">{project.name} · 规则数据库</h1><p className="subtitle">这里维护每个末级成本科目的取数规则、计算方式、归属口径和分摊口径。业态归属不在这里维护，业态归属在“业态产品 / 税务清算对象”页面维护。</p></div>
      <div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-mapping`} className="btn">测算规则映射表</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本测算</Link><Link href={`/projects/${project.id}`} className="btn">测算中心</Link></div>
    </div>

    {searchParams?.ruleSaved === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>规则已保存。</div> : null}
    {searchParams?.ruleError === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>规则保存失败，请稍后重试或检查规则数据库是否已初始化。</div> : null}
    {searchParams?.ruleMissing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>未找到规则编号。</div> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">规则数量</div><div className="stat-value">{rules.length}</div><div className="meta">末级科目规则</div></div>
      <div className="stat"><div className="stat-label">成本分组</div><div className="stat-value">{groups.length}</div><div className="meta">按一级科目路径归组</div></div>
      <div className="stat"><div className="stat-label">规则口径</div><div className="stat-value">归属/分摊</div><div className="meta">不再使用适用业态列</div></div>
      <div className="stat"><div className="stat-label">当前阶段</div><div className="stat-value">可编辑</div><div className="meta">先编辑规则，后续自动生成成本</div></div>
    </div>

    {!rules.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}><b>规则数据库还没有初始化</b><p className="meta" style={{ margin: '6px 0 0' }}>等待 Railway 启动脚本执行完成后会自动创建 CostCalculationRule 表并按标准成本末级科目生成规则。</p></section> : null}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((group) => {
        const rows = rules.filter((rule) => groupOf(rule.subjectPath) === group);
        return <section key={group} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0 }}>{group}</h2><p className="meta" style={{ margin: '5px 0 0' }}>本组共 {rows.length} 条规则。</p></div><span style={{ border: '1px solid #d0ebff', background: '#e7f5ff', color: '#0b7285', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{rows.length} 条</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {rows.map((rule) => <details key={rule.ruleKey} style={{ border: '1px solid #e6eef7', borderRadius: 12, background: '#fbfdff', overflow: 'hidden' }}>
              <summary style={{ cursor: 'pointer', padding: 12, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10, alignItems: 'center' }}>
                <div><b>{rule.costCode || '-'}</b><div className="meta">{short(rule.subjectPath || rule.subjectName)}</div></div>
                <div><span className="meta">工程量</span><br />{short(rule.quantityField)}</div>
                <div><span className="meta">配置</span><br />{short(rule.configField)}</div>
                <div><span className="meta">归属/分摊</span><br />{short(rule.costAttributionMethod)}</div>
              </summary>
              <form action={`/api/projects/${project.id}/cost-calculation-rules`} method="post" style={{ borderTop: '1px solid #e6eef7', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                <input type="hidden" name="ruleKey" value={rule.ruleKey} />
                <Field label="工程量字段" name="quantityField" value={rule.quantityField} />
                <Field label="建造配置字段" name="configField" value={rule.configField} />
                <Field label="计算方式" name="calculationMethod" value={rule.calculationMethod} />
                <Field label="成本归属口径" name="costAttributionMethod" value={rule.costAttributionMethod} />
                <Field label="分摊口径" name="allocationMethod" value={rule.allocationMethod} />
                <Field label="税务扣除口径" name="taxDeductionMethod" value={rule.taxDeductionMethod} />
                <SwitchField label="允许改工程量" name="allowQuantityOverride" value={rule.allowQuantityOverride} />
                <SwitchField label="允许改单价" name="allowPriceOverride" value={rule.allowPriceOverride} />
                <Field label="备注" name="remark" value={rule.remark} wide />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="btn btn-primary">保存规则</button></div>
              </form>
            </details>)}
          </div>
        </section>;
      })}
    </div>
  </div></main>;
}
