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
  const subjectMap = new Map(costSubjects.map((item) => [item.code, item]));
  const visibleRules = onlyStage ? rules.filter((rule) => rule.stageRules.some((stageRule) => stageRule.stage === currentStage)) : rules;

  const totalRules = rules.length;
  const currentStageRules = rules.filter((rule) => rule.stageRules.some((stageRule) => stageRule.stage === currentStage)).length;
  const metricRules = rules.filter((rule) => rule.metricKey).length;
  const manualRules = rules.filter((rule) => !rule.metricKey).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">模板与规则</p><h1 className="title">成本测算规则配置</h1><p className="subtitle">查看每个成本科目的测算依据、指标 key、阶段规则、工程量公式和金额公式。当前版本：{version?.name || '暂无'}｜{getVersionStageLabel(currentStage)}</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本编制</Link></div></div>

    <section className="card" style={{ marginBottom: 14 }}><div className="summary-strip"><div className="stat"><div className="stat-label">规则总数</div><div className="stat-value">{totalRules}</div></div><div className="stat"><div className="stat-label">当前阶段规则</div><div className="stat-value">{currentStageRules}</div></div><div className="stat"><div className="stat-label">指标取数规则</div><div className="stat-value">{metricRules}</div></div><div className="stat"><div className="stat-label">手动/固定规则</div><div className="stat-value">{manualRules}</div></div></div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>筛选</h2><form style={{ display: 'grid', gridTemplateColumns: '180px 1fr 150px 120px', gap: 10, alignItems: 'end' }}><label>阶段<select name="stage" defaultValue={currentStage}>{versionStageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label><label>关键词<input name="q" defaultValue={keyword} placeholder="科目编码 / 测算依据 / 指标 key / 业态" /></label><label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}><input type="checkbox" name="onlyStage" value="1" defaultChecked={onlyStage} />只看当前阶段</label><button className="btn btn-primary">查询</button></form></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>规则使用说明</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>指标 key</b><p className="meta">如 baseArea、sitePerimeter、product.buildingArea。保存明细时后端会读取 ProjectMetricValue 或概况表字段。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>默认系数</b><p className="meta">用于含量法，例如 建筑面积×钢筋含量、户数×栏杆含量。页面可手动覆盖系数。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>阶段规则</b><p className="meta">同一科目在投拓、方案、施工图、招采、动态、结算阶段可以采用不同优先取数逻辑。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>手动覆盖</b><p className="meta">勾选工程量手动覆盖时，后端不会用规则库覆盖你录入的工程量。</p></div></div></section>

    <section className="card"><h2>测算依据规则清单</h2><div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1500, fontSize: 13 }}><thead><tr>{['科目编码', '科目名称', '测算依据', '指标 key', '范围', '工程量单位', '单价单位', '默认系数', '阶段', '公式', '适用业态', '税率', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', color: '#667085', background: '#f8fafc', position: 'sticky', top: 0 }}>{head}</th>)}</tr></thead><tbody>{visibleRules.map((rule) => { const subject = subjectMap.get(rule.costCode); const stageRules = rule.stageRules.length ? rule.stageRules : []; const stageNames = stageRules.length ? stageRules.map((item) => `${stageBadge(item.stage)}${item.isDefault ? '默认' : ''}`).join('、') : '-'; const stageMatched = stageRules.some((item) => item.stage === currentStage); return <tr key={rule.id} style={{ background: stageMatched ? '#f0fbfc' : '#fff' }}><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{rule.costCode}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 160 }}><b>{subject?.name || '-'}</b><div className="meta" style={{ maxWidth: 260 }}>{subject?.fullPath || ''}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 180 }}><b>{rule.basisName}</b>{stageMatched ? <div className="meta" style={{ color: '#0b7285' }}>当前阶段启用</div> : null}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{rule.metricKey || '-'}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{rule.metricScope}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{rule.quantityUnit || '-'}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{rule.pricingUnit || '-'}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{Number(rule.defaultCoefficient || 1)}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 180 }}>{stageNames}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 260 }}><code style={{ whiteSpace: 'normal' }}>{formulaText(rule.quantityFormula, rule.amountFormula)}</code></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 150 }}>{rule.applicableProductType || '-'}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{fmtRate(subject?.defaultTaxRate || 0)}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 220 }}>{rule.remark || '-'}</td></tr>; })}</tbody></table></div>{!visibleRules.length ? <p className="meta">暂无匹配规则。</p> : null}</section>
  </div></main>;
}
