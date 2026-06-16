import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateIncomeTax, calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const DEFAULT_VAT_RATE = 0.09;
const DEFAULT_SURCHARGE_RATE = 0.12;
const DEFAULT_INCOME_TAX_RATE = 0.25;

type CostGroupRow = {
  level1: string;
  level2: string;
  inclusive: number;
  exclusive: number;
  tax: number;
  count: number;
};

type LevelOneRow = {
  level1: string;
  inclusive: number;
  exclusive: number;
  tax: number;
  count: number;
  children: CostGroupRow[];
};

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function subjectLevels(subject: { code: string; name: string; fullPath: string | null }) {
  const path = subject.fullPath || subject.name;
  const parts = path.split(/\s*[>\/\\｜|]+\s*/).filter(Boolean);
  const level1 = parts[0] || `${subject.code.slice(0, 1)} ${subject.name}`;
  const level2 = parts[1] || subject.name;
  return { level1, level2 };
}

function detailHref(projectId: string, row: { level1: string; level2: string }) {
  const text = `${row.level1} ${row.level2}`;
  const rules: Array<[RegExp, string]> = [
    [/土地/, 'land'],
    [/前期|设计|报批|勘察|测绘|三通一平/, 'pre-costs'],
    [/土建|建筑|结构|主体|桩基|地下室|门窗|防水/, 'building-details'],
    [/安装|给排水|电气|暖通|消防|弱电/, 'installation-details'],
    [/设备|电梯|充电桩|人防|立体车库/, 'equipment-details'],
    [/精装|装修|大堂/, 'fitout-details'],
    [/管网|室外管网|综合管线/, 'outdoor-pipe-details'],
    [/景观|绿化|硬景|软景/, 'landscape-details'],
    [/道路|总平|交安|标识/, 'road-details'],
    [/围墙|出入口|临设/, 'wall-gate-details'],
    [/销售|营销|示范区|包装/, 'sales-expense-details'],
    [/管理|行政|开发间接/, 'admin-expense-details'],
    [/财务|利息|融资/, 'finance-expense-details'],
    [/税|增值税|所得税|土地增值税/, 'tax-details']
  ];
  const matched = rules.find(([regex]) => regex.test(text));
  return `/projects/${projectId}/${matched?.[1] || 'costs-batch'}`;
}

function warningText(row: { inclusive: number; count: number }, costInclusive: number, buildingArea: number, saleableArea: number) {
  if (!row.inclusive || row.count === 0) return '待补数据';
  if (!buildingArea || !saleableArea) return '缺面积';
  if (costInclusive && row.inclusive / costInclusive > 0.35) return '占比较高';
  return '正常';
}

function warningColor(text: string) {
  if (text === '正常') return '#2f9e44';
  if (text === '占比较高') return '#f08c00';
  return '#e03131';
}

export default async function TargetCostSummaryPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: {
      products: true,
      taxes: true,
      costs: { include: { costSubject: true, productType: true } }
    }
  });

  const vatRate = Number(version?.taxes?.vatRate || DEFAULT_VAT_RATE);
  const surchargeRate = DEFAULT_SURCHARGE_RATE;
  const incomeTaxRate = Number(version?.taxes?.corporateIncomeTaxRate || DEFAULT_INCOME_TAX_RATE);

  const allProducts = version?.products || [];
  const activeProducts = allProducts.filter((item) => item.isActive);
  const disabledProductCount = allProducts.length - activeProducts.length;

  const rawCosts = version?.costs || [];
  const activeCosts = rawCosts.filter((row) => !row.productTypeId || row.productType?.isActive);
  const ignoredDisabledCostRows = rawCosts.length - activeCosts.length;

  const leafDictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null }, detailSubject: { not: null } },
    select: { costCode: true }
  });
  const leafCodes = new Set(leafDictionaryRows.map((row) => row.costCode).filter(Boolean));
  const costs = leafCodes.size > 0 ? activeCosts.filter((row) => leafCodes.has(row.costSubject.code)) : activeCosts;
  const ignoredNonLeafCostRows = activeCosts.length - costs.length;

  const revenueRows = activeProducts
    .filter((item) => item.isSaleable)
    .map((item) => calculateRevenueLine(Number(item.saleableArea || 0), Number(item.salePrice || 0), vatRate));
  const revenueInclusive = revenueRows.reduce((sum, row) => sum + row.taxInclusiveRevenue, 0);
  const revenueExclusive = revenueRows.reduce((sum, row) => sum + row.taxExclusiveRevenue, 0);
  const outputTax = revenueRows.reduce((sum, row) => sum + row.taxAmount, 0);

  const costInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const costExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const inputTax = costs.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);

  const vatPayable = Math.max(outputTax - inputTax, 0);
  const surcharge = vatPayable * surchargeRate;
  const landValueAddedTax = 0;
  const taxBeforeProfit = revenueExclusive - costExclusive - surcharge - landValueAddedTax;
  const incomeTax = calculateIncomeTax(taxBeforeProfit, incomeTaxRate);
  const netProfit = taxBeforeProfit - incomeTax;
  const preTaxMargin = revenueInclusive ? taxBeforeProfit / revenueInclusive : 0;
  const netMargin = revenueInclusive ? netProfit / revenueInclusive : 0;

  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const buildingUnitCost = buildingArea ? costInclusive / buildingArea : 0;
  const saleableUnitCost = saleableArea ? costInclusive / saleableArea : 0;

  const costGroups = new Map<string, CostGroupRow>();
  for (const row of costs) {
    const levels = subjectLevels(row.costSubject);
    const key = `${levels.level1}__${levels.level2}`;
    const current = costGroups.get(key) || { ...levels, inclusive: 0, exclusive: 0, tax: 0, count: 0 };
    current.inclusive += Number(row.taxInclusiveAmount || 0);
    current.exclusive += Number(row.taxExclusiveAmount || 0);
    current.tax += Number(row.taxAmount || 0);
    current.count += 1;
    costGroups.set(key, current);
  }

  const levelOneGroups = new Map<string, LevelOneRow>();
  for (const row of Array.from(costGroups.values())) {
    const current = levelOneGroups.get(row.level1) || { level1: row.level1, inclusive: 0, exclusive: 0, tax: 0, count: 0, children: [] };
    current.inclusive += row.inclusive;
    current.exclusive += row.exclusive;
    current.tax += row.tax;
    current.count += row.count;
    current.children.push(row);
    levelOneGroups.set(row.level1, current);
  }
  const levelOneRows = Array.from(levelOneGroups.values()).sort((a, b) => a.level1.localeCompare(b.level1));

  const metrics: Array<[string, number, 'money' | 'percent']> = [
    ['销售收入（含税）', revenueInclusive, 'money'],
    ['销售收入（不含税）', revenueExclusive, 'money'],
    ['开发成本及费用合计（含税，末级）', costInclusive, 'money'],
    ['开发成本及费用合计（不含税，末级）', costExclusive, 'money'],
    ['销项税额', outputTax, 'money'],
    ['进项税额（末级）', inputTax, 'money'],
    ['应缴增值税', vatPayable, 'money'],
    ['附加税费', surcharge, 'money'],
    ['土地增值税（待专项表接入）', landValueAddedTax, 'money'],
    ['税前经营利润', taxBeforeProfit, 'money'],
    ['税前销售利润率', preTaxMargin, 'percent'],
    [`所得税（${pct(incomeTaxRate)}）`, incomeTax, 'money'],
    ['税后净利', netProfit, 'money'],
    ['销售净利率', netMargin, 'percent']
  ];

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1380 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">目标成本汇总表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">当前汇总基于当前启用版本，只统计启用业态和末级成本行；充电桩作为车位/设备指标，不作为业态。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/revenue`} className="btn">收入明细</Link>
            <Link href={`/projects/${project.id}/summary-check`} className="btn">汇总联动校验</Link>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本编制</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {disabledProductCount > 0 ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>本项目当前版本有 {disabledProductCount} 个停用业态，已从销售收入和目标成本汇总中排除。</div> : null}
        {ignoredDisabledCostRows > 0 ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除 {ignoredDisabledCostRows} 条停用业态关联成本行，当前汇总只统计启用业态成本。</div> : null}
        {ignoredNonLeafCostRows > 0 ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已发现并排除 {ignoredNonLeafCostRows} 条非末级历史成本行，当前汇总只统计末级科目，避免重复计算。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(revenueInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">末级含税目标成本</div><div className="stat-value">{fmt(costInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">建面单方 / 可售单方</div><div className="stat-value">{fmt(buildingUnitCost)} / {fmt(saleableUnitCost)}</div></div>
          <div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value">{pct(netMargin)}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>所得税前 / 所得税后经营指标</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <tbody>
                {metrics.map(([name, value, unit]) => (
                  <tr key={name}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{unit === 'percent' ? pct(value) : fmt(value)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{unit === 'percent' ? '' : '元'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>成本汇总（一级折叠 / 二级穿透）</h2>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">进入目标成本编制</Link>
          </div>
          {levelOneRows.length === 0 ? (
            <p className="meta">暂无末级成本明细。请先到“目标成本编制”录入末级科目。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {levelOneRows.map((group) => {
                const groupWarning = warningText(group, costInclusive, buildingArea, saleableArea);
                return (
                  <details key={group.level1} open style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <summary style={{ cursor: 'pointer', listStyle: 'none', padding: 12, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 90px 130px 110px 110px 100px 110px', gap: 10, alignItems: 'center' }}>
                      <b>{group.level1}</b><span className="meta">{group.count} 行</span><span style={{ textAlign: 'right', fontWeight: 900 }}>{fmt(group.inclusive)}</span><span style={{ textAlign: 'right' }}>{fmt(buildingArea ? group.inclusive / buildingArea : 0)}</span><span style={{ textAlign: 'right' }}>{fmt(saleableArea ? group.inclusive / saleableArea : 0)}</span><span style={{ color: warningColor(groupWarning), fontWeight: 900 }}>{groupWarning}</span><span style={{ color: '#0b7285', textAlign: 'right' }}>展开/收起</span>
                    </summary>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1240 }}>
                        <thead><tr>{['二级科目', '末级行数', '含税成本', '建面单方', '可售单方', '不含税成本', '税额', '占比', '预警', '穿透'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
                        <tbody>
                          {group.children.sort((a, b) => a.level2.localeCompare(b.level2)).map((row) => {
                            const warn = warningText(row, costInclusive, buildingArea, saleableArea);
                            return (
                              <tr key={`${row.level1}-${row.level2}`}>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.level2}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{row.count}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(row.inclusive)}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(buildingArea ? row.inclusive / buildingArea : 0)}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(saleableArea ? row.inclusive / saleableArea : 0)}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.exclusive)}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.tax)}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(costInclusive ? row.inclusive / costInclusive : 0)}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: warningColor(warn), fontWeight: 900 }}>{warn}</td>
                                <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={detailHref(project.id, row)}>查看明细</Link></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
