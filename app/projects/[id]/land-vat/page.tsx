import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function n(value: unknown) { return Number(value || 0); }
function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function rateByRatio(ratio: number) {
  if (ratio <= 0.5) return { rate: 0.30, deduction: 0 };
  if (ratio <= 1) return { rate: 0.40, deduction: 0.05 };
  if (ratio <= 2) return { rate: 0.50, deduction: 0.15 };
  return { rate: 0.60, deduction: 0.35 };
}

export default async function LandVatPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { revenues: { include: { productType: true } }, costs: { include: { costSubject: true, productType: true } }, products: true }
  });

  const allProducts = version?.products || [];
  const disabledProducts = allProducts.filter((item) => !item.isActive).length;
  const allRevenues = version?.revenues || [];
  const revenues = allRevenues.filter((row) => row.productType?.isActive && row.productType?.isSaleable);
  const allCosts = version?.costs || [];
  const costs = allCosts.filter((row) => !row.productTypeId || row.productType?.isActive);
  const excludedRows = (allRevenues.length - revenues.length) + (allCosts.length - costs.length);

  const revenueInclusive = revenues.reduce((sum, row) => sum + n(row.taxInclusiveRevenue), 0);
  const revenueExclusive = revenues.reduce((sum, row) => sum + n(row.taxExclusiveRevenue), 0);
  const outputVat = revenues.reduce((sum, row) => sum + n(row.taxAmount), 0);

  const landCost = costs.filter((row) => row.costSubject.code.startsWith('01')).reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const devCost = costs.filter((row) => row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')).reduce((sum, row) => sum + n(row.taxExclusiveAmount || row.taxInclusiveAmount), 0);
  const saleManageFinance = costs.filter((row) => row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')).reduce((sum, row) => sum + n(row.taxExclusiveAmount || row.taxInclusiveAmount), 0);
  const taxAndSurcharge = outputVat * 0.12;
  const additionalDeduction = (landCost + devCost) * 0.2;
  const deductionTotal = landCost + devCost + saleManageFinance + taxAndSurcharge + additionalDeduction;
  const valueAdded = Math.max(0, revenueExclusive - deductionTotal);
  const valueAddedRatio = deductionTotal ? valueAdded / deductionTotal : 0;
  const ladder = rateByRatio(valueAddedRatio);
  const landVat = Math.max(0, valueAdded * ladder.rate - deductionTotal * ladder.deduction);

  const rows = [
    ['含税销售收入', revenueInclusive, '来自当前版本启用且可售业态收入明细表'],
    ['不含税销售收入', revenueExclusive, '销售收入剔除销项税'],
    ['土地成本', landCost, '01 土地成本，已排除停用业态关联成本'],
    ['开发成本', devCost, '02 前期 + 03 建安，已排除停用业态关联成本'],
    ['销售/管理/财务费用', saleManageFinance, '04/05/06 期间费用，清算口径后续可细化'],
    ['税金及附加', taxAndSurcharge, '暂按销项税×12%测算'],
    ['加计扣除', additionalDeduction, '土地成本+开发成本的20%'],
    ['扣除项目合计', deductionTotal, '自动汇总'],
    ['增值额', valueAdded, '不含税收入-扣除项目'],
    ['增值率', valueAddedRatio * 100, '增值额/扣除项目合计'],
    ['适用税率', ladder.rate * 100, '四级超率累进'],
    ['速算扣除系数', ladder.deduction * 100, '四级超率累进'],
    ['土地增值税', landVat, '增值额×税率-扣除项目×速算扣除系数']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">土地增值税测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">按当前版本收入、土地成本、开发成本、税金及附加和加计扣除自动测算。当前只统计启用业态收入与启用业态成本，停用业态自动排除。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-allocation`} className="btn btn-primary">成本分摊</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || excludedRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、收入/成本行 {excludedRows} 行。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入</div><div className="stat-value">{fmt(revenueExclusive)}</div></div><div className="stat"><div className="stat-label">扣除项目</div><div className="stat-value">{fmt(deductionTotal)}</div></div><div className="stat"><div className="stat-label">增值率</div><div className="stat-value">{fmt(valueAddedRatio * 100)}%</div></div><div className="stat"><div className="stat-label">土增税</div><div className="stat-value">{fmt(landVat)}</div></div></div>
    <section className="card"><h2>测算明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['项目', '金额/比例', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row[0])}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row[0]}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row[1])}{String(row[0]).includes('率') || String(row[0]).includes('系数') ? '%' : ''}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row[2]}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
