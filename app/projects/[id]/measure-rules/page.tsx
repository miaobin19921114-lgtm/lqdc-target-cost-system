import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getVersionStageLabel, normalizeVersionStage, versionStageOptions } from '@/lib/version-stage';

export const dynamic = 'force-dynamic';

function fmtRate(value: unknown) {
  const num = Number(value || 0);
  return `${Math.round(num * 10000) / 100}%`;
}

function stageBadge(stage: string) {
  const option = versionStageOptions.find((item) => item.value === stage);
  return option?.label || getVersionStageLabel(stage);
}

function formulaText(quantityFormula?: string | null, amountFormula?: string | null) {
  return [quantityFormula, amountFormula].filter(Boolean).join(' → ') || '-';
}

function hiddenContext(stage: string, q: string, onlyStage: boolean) {
  return <>
    <input type="hidden" name="stage" value={stage} />
    <input type="hidden" name="q" value={q} />
    {onlyStage ? <input type="hidden" name="onlyStage" value="1" /> : null}
  </>;
}

const inputStyle = { width: '100%' } as const;

export default async function MeasureRulesPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({ where: activeVersionWhere(project), orderBy: activeVersionOrder(project), select: { id: true, name: true, stage: true } });
  const currentStage = normalizeVersionStage(searchParams?.stage || version?.stage);
  const keyword = String(searchParams?.q || '').trim();
  const onlyStage = searchParams?.onlyStage === '1';

  const rules = await prisma.measureBasisRule.findMany({
    where: {
      enabled: true,
      ...(keyword ? {
        OR: [
          { costCode: { contains: keyword } },
          { basisName: { contains: keyword } },
          { metricKey: { contains: keyword } },
          { applicableProductType: { contains: keyword } },
          { remark: { contains: keyword } }
        ]
      } : {})
    },
    include: { stageRules: { where: { enabled: true }, orderBy: [{ stage: 'asc' }, { priority: 'asc' }] } },
    orderBy: [{ costCode: 'asc' }, { priority: 'asc' }, { basisName: 'asc' }]
  });

  const costSubjects = await prisma.costSubject.findMany({
    where: { code: { in: Array.from(new Set(rules.map((rule) => rule.costCode))) } },
    select: { code: true, name: true, fullPath: true, defaultTaxRate: true },
    orderBy: { code: 'asc' }
  });
  const allCostSubjects = await prisma.costSubject.findMany({
    where: { enabled: true },
    select: { code: true, name: true, fullPath: true },
    orderBy: { code: 'asc' }
  });
  const subjectMap = new Map(costSubjects.map((item) => [item.code, item]));
  const visibleRules = onlyStage ? rules.filter((rule) => rule.stageRules.some((stageRule) => stageRule.stage === currentStage)) : rules;

  const totalRules = rules.length;
  const currentStageRules = rules.filter((rule) => rule.stageRules.some((stageRule) => stageRule.stage === currentStage)).length;
  const metricRules = rules.filter((rule) => rule.metricKey).length;
  const manualRules = rules.filter((rule) => !rule.metricKey).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">模板与规则</p><h1 className="title">成本测算规则配置</h1><p className="subtitle">查看、新增并维护每个成本科目的测算依据、指标 key、阶段规则、工程量公式和金额公式。当前版本：{version?.name || '暂无'}｜{getVersionStageLabel(currentStage)}</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本编制</Link></div></div>

    {searchParams?.created ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>规则已新增。</div> : null}
    {searchParams?.saved ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>规则已保存。</div> : null}
    {searchParams?.stageSaved ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>阶段启用状态已保存。</div> : null}
    {searchParams?.disabled ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>规则已停用。</div> : null}
    {searchParams?.missing ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>请填写必填项或检查规则是否存在。</div> : null}

    <section className="card" style={{ marginBottom: 14 }}><div className="summary-strip"><div className="stat"><div className="stat-label">规则总数</div><div className="stat-value">{totalRules}</div></div><div className="stat"><div className="stat-label">当前阶段规则</div><div className="stat-value">{currentStageRules}</div></div><div className="stat"><div className="stat-label">指标取数规则</div><div className="stat-value">{metricRules}</div></div><div className="stat"><div className="stat-label">手动/固定规则</div><div className="stat-value">{manualRules}</div></div></div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>筛选</h2><form style={{ display: 'grid', gridTemplateColumns: '180px 1fr 150px 120px', gap: 10, alignItems: 'end' }}><label>阶段<select name="stage" defaultValue={currentStage}>{versionStageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label><label>关键词<input name="q" defaultValue={keyword} placeholder="科目编码 / 测算依据 / 指标 key / 业态" /></label><label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}><input type="checkbox" name="onlyStage" value="1" defaultChecked={onlyStage} />只看当前阶段</label><button className="btn btn-primary">查询</button></form></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>新增测算依据规则</h2><form action={`/api/projects/${project.id}/measure-rules`} method="post" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(140px, 1fr))', gap: 10, alignItems: 'end' }}><input type="hidden" name="action" value="create-rule" />{hiddenContext(currentStage, keyword, onlyStage)}<label>科目编码<input name="costCode" list="cost-subject-options" placeholder="如 03.03.12.01" required style={inputStyle} /></label><datalist id="cost-subject-options">{allCostSubjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code} {subject.name} {subject.fullPath || ''}</option>)}</datalist><label>测算依据名称<input name="basisName" placeholder="如 户数×厨房防水面积" required style={inputStyle} /></label><label>指标 key<input name="metricKey" placeholder="如 householdCount" style={inputStyle} /></label><label>取数范围<select name="metricScope" defaultValue="project" style={inputStyle}><option value="project">project</option><option value="product">product</option><option value="building">building</option><option value="basement">basement</option><option value="special">special</option></select></label><label>工程量单位<input name="quantityUnit" placeholder="㎡/m/台/项" style={inputStyle} /></label><label>单价单位<input name="pricingUnit" placeholder="元/㎡" style={inputStyle} /></label><label>默认系数<input name="defaultCoefficient" type="number" step="0.0001" defaultValue="1" style={inputStyle} /></label><label>适用业态<input name="applicableProductType" placeholder="住宅/地下车位" style={inputStyle} /></label><label>优先级<input name="priority" type="number" defaultValue="100" style={inputStyle} /></label><label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}><input type="checkbox" name="stageEnabled" value="1" defaultChecked />当前阶段启用</label><label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}><input type="checkbox" name="allowManualOverride" value="1" defaultChecked />允许手动覆盖</label><button className="btn btn-primary">新增规则</button><label style={{ gridColumn: 'span 3' }}>工程量公式<input name="quantityFormula" placeholder="如 metric(householdCount) * coefficient" style={inputStyle} /></label><label style={{ gridColumn: 'span 3' }}>金额公式<input name="amountFormula" placeholder="如 quantity * unitPrice / 10000" style={inputStyle} /></label><label style={{ gridColumn: 'span 6' }}>说明备注<textarea name="remark" placeholder="说明适用口径、阶段、注意事项" style={{ width: '100%', minHeight: 60 }} /></label></form></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>编辑说明</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>指标 key</b><p className="meta">如 baseArea、sitePerimeter、product.buildingArea。后端保存明细时会按 key 自动取数。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>默认系数</b><p className="meta">用于含量法，例如 建筑面积×钢筋含量、户数×栏杆含量。页面和后端都会使用。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>阶段启用</b><p className="meta">“当前阶段启用”控制当前版本阶段是否优先使用该规则。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>停用规则</b><p className="meta">停用后目标成本下拉和后端计算不再使用该规则。</p></div></div></section>

    <section className="card"><h2>测算依据规则清单</h2><div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1900, fontSize: 13 }}><thead><tr>{['科目编码', '科目名称', '测算依据', '指标 key', '范围', '工程量单位', '单价单位', '默认系数', '阶段', '公式', '适用业态', '优先级', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', color: '#667085', background: '#f8fafc', position: 'sticky', top: 0 }}>{head}</th>)}</tr></thead><tbody>{visibleRules.map((rule) => { const subject = subjectMap.get(rule.costCode); const stageRules = rule.stageRules.length ? rule.stageRules : []; const stageNames = stageRules.length ? stageRules.map((item) => `${stageBadge(item.stage)}${item.isDefault ? '默认' : ''}`).join('、') : '-'; const stageMatched = stageRules.some((item) => item.stage === currentStage); const formId = `measure-rule-${rule.id}`; const stageFormId = `stage-rule-${rule.id}`; const disableFormId = `disable-rule-${rule.id}`; return <tr key={rule.id} style={{ background: stageMatched ? '#f0fbfc' : '#fff' }}><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{rule.costCode}<form id={formId} action={`/api/projects/${project.id}/measure-rules`} method="post"><input type="hidden" name="action" value="update-rule" /><input type="hidden" name="ruleId" value={rule.id} />{hiddenContext(currentStage, keyword, onlyStage)}</form><form id={stageFormId} action={`/api/projects/${project.id}/measure-rules`} method="post"><input type="hidden" name="action" value="toggle-stage" /><input type="hidden" name="ruleId" value={rule.id} />{hiddenContext(currentStage, keyword, onlyStage)}</form><form id={disableFormId} action={`/api/projects/${project.id}/measure-rules`} method="post"><input type="hidden" name="action" value="disable-rule" /><input type="hidden" name="ruleId" value={rule.id} />{hiddenContext(currentStage, keyword, onlyStage)}</form></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 180 }}><b>{subject?.name || '-'}</b><div className="meta" style={{ maxWidth: 260 }}>{subject?.fullPath || ''}</div><div className="meta">税率：{fmtRate(subject?.defaultTaxRate || 0)}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 190 }}><b>{rule.basisName}</b>{stageMatched ? <div className="meta" style={{ color: '#0b7285' }}>当前阶段启用</div> : null}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 160 }}><input form={formId} name="metricKey" defaultValue={rule.metricKey || ''} placeholder="如 baseArea" style={{ width: 150 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><select form={formId} name="metricScope" defaultValue={rule.metricScope || 'project'} style={{ width: 110 }}><option value="project">project</option><option value="product">product</option><option value="building">building</option><option value="basement">basement</option><option value="special">special</option></select></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><input form={formId} name="quantityUnit" defaultValue={rule.quantityUnit || ''} style={{ width: 80 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><input form={formId} name="pricingUnit" defaultValue={rule.pricingUnit || ''} style={{ width: 100 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><input form={formId} name="defaultCoefficient" type="number" step="0.0001" defaultValue={Number(rule.defaultCoefficient || 1)} style={{ width: 90 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 220 }}><div>{stageNames}</div><label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}><input form={stageFormId} type="checkbox" name="stageEnabled" value="1" defaultChecked={stageMatched} />当前阶段启用</label><button form={stageFormId} className="btn" style={{ marginTop: 6, minHeight: 28, padding: '4px 10px' }}>保存阶段</button></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 310 }}><textarea form={formId} name="quantityFormula" defaultValue={rule.quantityFormula || ''} placeholder="工程量公式" style={{ minHeight: 54, width: 290 }} /><textarea form={formId} name="amountFormula" defaultValue={rule.amountFormula || ''} placeholder="金额公式" style={{ minHeight: 54, width: 290, marginTop: 6 }} /><div className="meta">当前：{formulaText(rule.quantityFormula, rule.amountFormula)}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 150 }}><input form={formId} name="applicableProductType" defaultValue={rule.applicableProductType || ''} style={{ width: 150 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><input form={formId} name="priority" type="number" defaultValue={rule.priority || 100} style={{ width: 80 }} /><label className="meta" style={{ display: 'flex', gap: 6, marginTop: 6 }}><input form={formId} type="checkbox" name="allowManualOverride" value="1" defaultChecked={rule.allowManualOverride} />可手动覆盖</label></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 240 }}><textarea form={formId} name="remark" defaultValue={rule.remark || ''} style={{ minHeight: 70, width: 230 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 130 }}><button form={formId} className="btn btn-primary" style={{ minHeight: 30, padding: '4px 10px' }}>保存规则</button><button form={disableFormId} className="btn" style={{ marginTop: 6, minHeight: 30, padding: '4px 10px', color: '#c92a2a' }}>停用</button></td></tr>; })}</tbody></table></div>{!visibleRules.length ? <p className="meta">暂无匹配规则。</p> : null}</section>
  </div></main>;
}
