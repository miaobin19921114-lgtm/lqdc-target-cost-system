import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VAT_RATE = 0.09;
const SURCHARGE_RATE = 0.12;
const INCOME_TAX_RATE = 0.25;

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function calcRevenue(saleableArea: number, salePrice: number) {
  const taxInclusiveRevenue = saleableArea * salePrice;
  const taxExclusiveRevenue = taxInclusiveRevenue / (1 + VAT_RATE);
  const taxAmount = taxInclusiveRevenue - taxExclusiveRevenue;
  return { taxInclusiveRevenue, taxExclusiveRevenue, taxAmount };
}

function subjectLevels(subject: { code: string; name: string; fullPath: string | null }) {
  const path = subject.fullPath || subject.name;
  const parts = path.split(/\s*[>\/\\｜|]+\s*/).filter(Boolean);
  const level1 = parts[0] || `${subject.code.slice(0, 1)} ${subject.name}`;
  const level2 = parts[1] || subject.name;
  return { level1, level2 };
}

export default async function TargetCostSummaryPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      costs: { include: { costSubject: true } }
    }
  });

  if (!project) return <main className="page">项目不存在</main>;

  const products = version?.products || [];
  const costs = version?.costs || [];

  const revenueRows = products
    .filter((item) => item.isSaleable)
    .map((item) => calcRevenue(Number(item.saleableArea || 0), Number(item.salePrice || 0)));

  const revenueInclusive = revenueRows.reduce((sum, row) => sum + row.taxInclusiveRevenue, 0);
  const revenueExclusive = revenueRows.reduce((sum, row) => sum + row.taxExclusiveRevenue, 0);
  const outputTax = revenueRows.reduce((sum, row) => sum + row.taxAmount, 0);

  const costInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const costExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const inputTax = costs.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);

  const vatPayable = Math.max(outputTax - inputTax, 0);
  const surcharge = vatPayable * SURCHARGE_RATE;
  const landValueAddedTax = 0;
  const taxBeforeProfit = revenueExclusive - costExclusive - surcharge - landValueAddedTax;
  const incomeTax = Math.max(taxBeforeProfit, 0) * INCOME_TAX_RATE;
  const netProfit = taxBeforeProfit - incomeTax;
  const preTaxMargin = revenueInclusive ? taxBeforeProfit / revenueInclusive : 0;
  const netMargin = revenueInclusive ? netProfit / revenueInclusive : 0;

  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const buildingUnitCost = buildingArea ? costInclusive / buildingArea : 0;
  const saleableUnitCost = saleableArea ? costInclusive / saleableArea : 0;

  const costGroups = new Map<string, { level1: string; level2: string; inclusive: number; exclusive: number; tax: number }>();
  for (const row of costs) {
    const levels = subjectLevels(row.costSubject);
    const key = `${levels.level1}__${levels.level2}`;
    const current = costGroups.get(key) || { ...levels, inclusive: 0, exclusive: 0, tax: 0 };
    current.inclusive += Number(row.taxInclusiveAmount || 0);
    current.exclusive += Number(row.taxExclusiveAmount || 0);
    current.tax += Number(row.taxAmount || 0);
    costGroups.set(key, current);
  }
  const groupedCosts = Array.from(costGroups.values()).sort((a, b) => a.level1.localeCompare(b.level1) || a.level2.localeCompare(b.level2));

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">目标成本汇总表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">汇总收入、目标成本、增值税及附加、所得税前后利润指标，并展示二级科目成本结构。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/revenue`} className="btn">收入明细</Link>
            <Link href={`/projects/${project.id}/costs`} className="btn">目标成本</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(revenueInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(costInclusive)}元</div></div>
          <div className="stat"><div className="stat-label">建面单方 / 可售单方</div><div className="stat-value">{fmt(buildingUnitCost)} / {fmt(saleableUnitCost)}</div></div>
          <div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value">{pct(netMargin)}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>所得税前 / 所得税后经营指标</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <tbody>
                {[
                  ['销售收入（含税）', revenueInclusive, '元'],
                  ['销售收入（不含税）', revenueExclusive, '元'],
                  ['开发成本及费用合计（含税）', costInclusive, '元'],
                  ['开发成本及费用合计（不含税）', costExclusive, '元'],
                  ['销项税额', outputTax, '元'],
                  ['进项税额', inputTax, '元'],
                  ['应缴增值税', vatPayable, '元'],
                  ['附加税费（暂按12%）', surcharge, '元'],
                  ['土地增值税（待专项表接入）', landValueAddedTax, '元'],
                  ['税前经营利润', taxBeforeProfit, '元'],
                  ['税前销售利润率', preTaxMargin, 'percent'],
                  ['所得税（暂按25%）', incomeTax, '元'],
                  ['税后净利', netProfit, '元'],
                  ['销售净利率', netMargin, 'percent']
                ].map(([name, value, unit]) => (
                  <tr key={String(name)}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>
                      {unit === 'percent' ? pct(Number(value)) : fmt(Number(value))}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{unit === 'percent' ? '' : unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>成本汇总（二级科目）</h2>
          {groupedCosts.length === 0 ? (
            <p className="meta">暂无成本明细。请先到“目标成本测算”录入土地费、前期费、建安费等成本。</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    {['一级科目', '二级科目', '含税成本', '不含税成本', '税额', '占含税成本比例'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedCosts.map((row) => (
                    <tr key={`${row.level1}-${row.level2}`}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.level1}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.level2}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.inclusive)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.exclusive)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.tax)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(costInclusive ? row.inclusive / costInclusive : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
