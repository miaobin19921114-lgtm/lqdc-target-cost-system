import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function num(value: unknown) {
  return Number(value || 0);
}

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function statusText(status: string) {
  if (status === 'locked') return '已锁定';
  if (status === 'final') return '定稿';
  return '草稿';
}

type VersionWithData = NonNullable<Awaited<ReturnType<typeof loadVersion>>>;

async function loadVersion(projectId: string, versionId: string) {
  if (!versionId) return null;
  return prisma.projectVersion.findFirst({
    where: { id: versionId, projectId },
    include: {
      products: true,
      costs: { include: { costSubject: true, productType: true } },
      revenues: true,
      taxes: true
    }
  });
}

function calcVersion(version: VersionWithData | null, buildingArea: number, saleableArea: number) {
  const products = version?.products || [];
  const activeProducts = products.filter((item) => item.isActive);
  const revenue = activeProducts
    .filter((item) => item.isSaleable)
    .reduce((sum, item) => sum + num(item.saleableArea) * num(item.salePrice), 0);

  const costs = (version?.costs || []).filter((row) => !row.productTypeId || row.productType?.isActive);
  const costInclusive = costs.reduce((sum, row) => sum + num(row.taxInclusiveAmount), 0);
  const costExclusive = costs.reduce((sum, row) => sum + num(row.taxExclusiveAmount), 0);
  const inputTax = costs.reduce((sum, row) => sum + num(row.taxAmount), 0);
  const incomeTaxRate = num(version?.taxes?.corporateIncomeTaxRate || 0.25);
  const taxBeforeProfit = revenue - costInclusive;
  const incomeTax = Math.max(taxBeforeProfit * incomeTaxRate, 0);
  const netProfit = taxBeforeProfit - incomeTax;
  const preTaxMargin = revenue ? taxBeforeProfit / revenue : 0;
  const netMargin = revenue ? netProfit / revenue : 0;

  const costByLevel1 = new Map<string, number>();
  for (const cost of costs) {
    const path = cost.costSubject.fullPath || cost.costSubject.name || '未分类';
    const level1 = path.split(/\s*[>\/\\｜|]+\s*/).filter(Boolean)[0] || cost.costSubject.name || '未分类';
    costByLevel1.set(level1, (costByLevel1.get(level1) || 0) + num(cost.taxInclusiveAmount));
  }

  return {
    revenue,
    costInclusive,
    costExclusive,
    inputTax,
    taxBeforeProfit,
    incomeTax,
    netProfit,
    preTaxMargin,
    netMargin,
    productCount: activeProducts.length,
    saleableProductCount: activeProducts.filter((item) => item.isSaleable).length,
    costLineCount: costs.length,
    revenueLineCount: version?.revenues.length || 0,
    buildingUnitCost: buildingArea ? costInclusive / buildingArea : 0,
    saleableUnitCost: saleableArea ? costInclusive / saleableArea : 0,
    revenuePerSaleable: saleableArea ? revenue / saleableArea : 0,
    costByLevel1
  };
}

function diff(a: number, b: number) {
  return b - a;
}

function diffColor(value: number, reverse = false) {
  if (!value) return '#667085';
  const good = reverse ? value < 0 : value > 0;
  return good ? '#2f9e44' : '#c92a2a';
}

function riskText(name: string, delta: number, reverse: boolean) {
  if (!delta) return '无变化';
  if (reverse) return delta > 0 ? `${name}上升，需说明成本增加原因` : `${name}下降，需确认是否为真实优化`;
  return delta > 0 ? `${name}改善` : `${name}下降，需复核经营风险`;
}

export default async function VersionComparePage({ params, searchParams }: { params: { id: string }; searchParams?: { baseId?: string; targetId?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const versions = await prisma.projectVersion.findMany({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' } });
  const baseId = searchParams?.baseId || versions[0]?.id || '';
  const targetId = searchParams?.targetId || project.activeVersionId || versions[1]?.id || versions[0]?.id || '';
  const baseVersion = await loadVersion(params.id, baseId);
  const targetVersion = await loadVersion(params.id, targetId);
  const buildingArea = num(project.totalBuildingArea);
  const saleableArea = num(project.saleableArea);
  const base = calcVersion(baseVersion, buildingArea, saleableArea);
  const target = calcVersion(targetVersion, buildingArea, saleableArea);

  const metrics: Array<[string, number, number, 'money' | 'count' | 'percent', boolean, string]> = [
    ['含税销售收入', base.revenue, target.revenue, 'money', false, '收入假设'],
    ['可售单方收入', base.revenuePerSaleable, target.revenuePerSaleable, 'money', false, '售价口径'],
    ['含税目标成本', base.costInclusive, target.costInclusive, 'money', true, '成本总控'],
    ['不含税目标成本', base.costExclusive, target.costExclusive, 'money', true, '税前成本'],
    ['进项税额', base.inputTax, target.inputTax, 'money', false, '税额口径'],
    ['税前经营利润', base.taxBeforeProfit, target.taxBeforeProfit, 'money', false, '利润指标'],
    ['企业所得税', base.incomeTax, target.incomeTax, 'money', true, '税费影响'],
    ['税后净利', base.netProfit, target.netProfit, 'money', false, '利润指标'],
    ['税前利润率', base.preTaxMargin, target.preTaxMargin, 'percent', false, '利润率'],
    ['税后净利率', base.netMargin, target.netMargin, 'percent', false, '利润率'],
    ['建面单方成本', base.buildingUnitCost, target.buildingUnitCost, 'money', true, '单方成本'],
    ['可售单方成本', base.saleableUnitCost, target.saleableUnitCost, 'money', true, '单方成本'],
    ['启用业态数', base.productCount, target.productCount, 'count', false, '业态范围'],
    ['可售业态数', base.saleableProductCount, target.saleableProductCount, 'count', false, '业态范围'],
    ['收入明细行数', base.revenueLineCount, target.revenueLineCount, 'count', false, '数据完整性'],
    ['成本明细行数', base.costLineCount, target.costLineCount, 'count', false, '数据完整性']
  ];

  const level1Names = Array.from(new Set([...base.costByLevel1.keys(), ...target.costByLevel1.keys()])).sort((a, b) => a.localeCompare(b));
  const costChanges = level1Names
    .map((name) => ({ name, left: base.costByLevel1.get(name) || 0, right: target.costByLevel1.get(name) || 0 }))
    .map((row) => ({ ...row, delta: diff(row.left, row.right), ratio: row.left ? diff(row.left, row.right) / Math.abs(row.left) : 0 }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const majorIssues = metrics
    .map(([name, left, right, unit, reverse, group]) => ({ name, left, right, unit, reverse, group, delta: diff(left, right), ratio: left ? diff(left, right) / Math.abs(left) : 0 }))
    .filter((item) => Math.abs(item.delta) > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  function show(value: number, unit: 'money' | 'count' | 'percent') {
    if (unit === 'percent') return pct(value);
    return fmt(value);
  }

  return (
    <main className="page" style={{ background: '#eef3f8' }}>
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">测算版本控制中心</p>
            <h1 className="title">阶段版本对比分析</h1>
            <p className="subtitle">按地产测算习惯对比两个阶段版本：重点看售价、收入、目标成本、税费、利润率、建面单方、可售单方和一级成本科目差异。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/versions`} className="btn btn-primary">测算版本控制中心</Link>
            <Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link>
            <Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>选择对比版本</h2>
          <p className="meta">建议用“投拓版 / 方案版 / 施工图版 / 招采版 / 动态成本版”进行阶段对比，便于追溯差异原因。</p>
          <form method="get" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10, alignItems: 'end' }}>
            <label>基准版本
              <select name="baseId" defaultValue={baseId}>
                {versions.map((version) => <option key={version.id} value={version.id}>{version.stage || '未分阶段'}｜{version.name}｜{statusText(version.status)}</option>)}
              </select>
            </label>
            <label>目标版本
              <select name="targetId" defaultValue={targetId}>
                {versions.map((version) => <option key={version.id} value={version.id}>{version.id === project.activeVersionId ? '当前｜' : ''}{version.stage || '未分阶段'}｜{version.name}｜{statusText(version.status)}</option>)}
              </select>
            </label>
            <button className="btn btn-primary">开始对比</button>
          </form>
        </section>

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">基准版本</div><div className="stat-value" style={{ fontSize: 18 }}>{baseVersion?.name || '-'}</div></div>
          <div className="stat"><div className="stat-label">目标版本</div><div className="stat-value" style={{ fontSize: 18 }}>{targetVersion?.name || '-'}</div></div>
          <div className="stat"><div className="stat-label">收入差异</div><div className="stat-value" style={{ color: diffColor(diff(base.revenue, target.revenue)) }}>{fmt(diff(base.revenue, target.revenue))}</div></div>
          <div className="stat"><div className="stat-label">税后净利差异</div><div className="stat-value" style={{ color: diffColor(diff(base.netProfit, target.netProfit)) }}>{fmt(diff(base.netProfit, target.netProfit))}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>差异结论</h2>
          {majorIssues.length === 0 ? <p className="meta">两个版本暂无明显差异。</p> : <div style={{ display: 'grid', gap: 8 }}>{majorIssues.map((item) => <div key={item.name} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 10, background: '#fff' }}><b>{item.group}｜{item.name}</b><p className="meta" style={{ margin: '4px 0 0' }}>{riskText(item.name, item.delta, item.reverse)}；差异 {show(item.delta, item.unit)}，变化率 {item.left ? pct(item.ratio) : '-'}。</p></div>)}</div>}
        </section>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>核心经营指标对比</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
              <thead><tr>{['指标分组', '指标', '基准版本', '目标版本', '差异', '变化率', '判断'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {metrics.map(([name, left, right, unit, reverse, group]) => {
                  const delta = diff(left, right);
                  const ratio = left ? delta / Math.abs(left) : 0;
                  return <tr key={name}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: '#667085' }}>{group}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{show(left, unit)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{show(right, unit)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: diffColor(delta, reverse), fontWeight: 900 }}>{show(delta, unit)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{left ? pct(ratio) : '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{riskText(name, delta, reverse)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>一级成本科目差异</h2>
          <p className="meta">成本差异按一级科目归集，用于判断土地费、前期、建安、费用、税费等哪一块导致版本变化。</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}>
              <thead><tr>{['一级科目', '基准成本', '目标成本', '差异', '变化率', '判断'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {costChanges.length === 0 ? <tr><td colSpan={6} style={{ padding: 12, color: 'var(--muted)' }}>暂无成本数据。</td></tr> : costChanges.map((row) => <tr key={row.name}>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.left)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.right)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: diffColor(row.delta, true), fontWeight: 900 }}>{fmt(row.delta)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.left ? pct(row.ratio) : '-'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.delta > 0 ? '成本上升，需说明原因' : row.delta < 0 ? '成本下降，需确认是否真实优化' : '无变化'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
