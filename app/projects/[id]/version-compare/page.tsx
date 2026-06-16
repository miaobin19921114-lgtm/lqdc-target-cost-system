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
      taxes: true
    }
  });
}

function calcVersion(version: VersionWithData | null) {
  const products = version?.products || [];
  const activeProducts = products.filter((item) => item.isActive);
  const revenue = activeProducts
    .filter((item) => item.isSaleable)
    .reduce((sum, item) => sum + num(item.saleableArea) * num(item.salePrice), 0);

  const costs = (version?.costs || []).filter((row) => !row.productTypeId || row.productType?.isActive);
  const costInclusive = costs.reduce((sum, row) => sum + num(row.taxInclusiveAmount), 0);
  const costExclusive = costs.reduce((sum, row) => sum + num(row.taxExclusiveAmount), 0);
  const taxAmount = costs.reduce((sum, row) => sum + num(row.taxAmount), 0);
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
    taxAmount,
    taxBeforeProfit,
    incomeTax,
    netProfit,
    preTaxMargin,
    netMargin,
    productCount: activeProducts.length,
    costLineCount: costs.length,
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

export default async function VersionComparePage({ params, searchParams }: { params: { id: string }; searchParams?: { baseId?: string; targetId?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const versions = await prisma.projectVersion.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' }
  });

  const baseId = searchParams?.baseId || versions[0]?.id || '';
  const targetId = searchParams?.targetId || project.activeVersionId || versions[1]?.id || versions[0]?.id || '';
  const baseVersion = await loadVersion(params.id, baseId);
  const targetVersion = await loadVersion(params.id, targetId);
  const base = calcVersion(baseVersion);
  const target = calcVersion(targetVersion);

  const metrics: Array<[string, number, number, 'money' | 'count' | 'percent', boolean]> = [
    ['含税销售收入', base.revenue, target.revenue, 'money', false],
    ['含税目标成本', base.costInclusive, target.costInclusive, 'money', true],
    ['不含税目标成本', base.costExclusive, target.costExclusive, 'money', true],
    ['成本税额', base.taxAmount, target.taxAmount, 'money', true],
    ['税前经营利润', base.taxBeforeProfit, target.taxBeforeProfit, 'money', false],
    ['所得税', base.incomeTax, target.incomeTax, 'money', true],
    ['税后净利', base.netProfit, target.netProfit, 'money', false],
    ['税前销售利润率', base.preTaxMargin, target.preTaxMargin, 'percent', false],
    ['销售净利率', base.netMargin, target.netMargin, 'percent', false],
    ['启用业态数', base.productCount, target.productCount, 'count', false],
    ['成本明细行数', base.costLineCount, target.costLineCount, 'count', false]
  ];

  const level1Names = Array.from(new Set([...base.costByLevel1.keys(), ...target.costByLevel1.keys()])).sort((a, b) => a.localeCompare(b));

  function show(value: number, unit: 'money' | 'count' | 'percent') {
    if (unit === 'percent') return pct(value);
    return fmt(value);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">版本对比</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">对比两个测算版本的收入、成本、利润、利润率和一级成本科目差异。当前版本会自动作为目标版本。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/versions`} className="btn btn-primary">版本管理</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>选择对比版本</h2>
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
          <div className="stat"><div className="stat-label">基准版本</div><div className="stat-value">{baseVersion?.name || '-'}</div></div>
          <div className="stat"><div className="stat-label">目标版本</div><div className="stat-value">{targetVersion?.name || '-'}</div></div>
          <div className="stat"><div className="stat-label">销售收入差异</div><div className="stat-value" style={{ color: diffColor(diff(base.revenue, target.revenue)) }}>{fmt(diff(base.revenue, target.revenue))}</div></div>
          <div className="stat"><div className="stat-label">税后净利差异</div><div className="stat-value" style={{ color: diffColor(diff(base.netProfit, target.netProfit)) }}>{fmt(diff(base.netProfit, target.netProfit))}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>核心指标对比</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['指标', '基准版本', '目标版本', '差异', '变化率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {metrics.map(([name, left, right, unit, reverse]) => {
                  const delta = diff(left, right);
                  const ratio = left ? delta / Math.abs(left) : 0;
                  return (
                    <tr key={name}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{show(left, unit)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{show(right, unit)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: diffColor(delta, reverse), fontWeight: 900 }}>{show(delta, unit)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{left ? pct(ratio) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>一级成本科目差异</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['一级科目', '基准成本', '目标成本', '差异', '变化率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {level1Names.length === 0 ? <tr><td colSpan={5} style={{ padding: 12, color: 'var(--muted)' }}>暂无成本数据。</td></tr> : level1Names.map((name) => {
                  const left = base.costByLevel1.get(name) || 0;
                  const right = target.costByLevel1.get(name) || 0;
                  const delta = diff(left, right);
                  const ratio = left ? delta / Math.abs(left) : 0;
                  return (
                    <tr key={name}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(left)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(right)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: diffColor(delta, true), fontWeight: 900 }}>{fmt(delta)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{left ? pct(ratio) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
