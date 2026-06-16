import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function n(value: unknown) { return Number(value || 0); }
function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function landVatByRatio(valueAdded: number, deductionTotal: number) {
  const ratio = deductionTotal ? valueAdded / deductionTotal : 0;
  if (ratio <= 0) return 0;
  if (ratio <= 0.5) return valueAdded * 0.3;
  if (ratio <= 1) return valueAdded * 0.4 - deductionTotal * 0.05;
  if (ratio <= 2) return valueAdded * 0.5 - deductionTotal * 0.15;
  return valueAdded * 0.6 - deductionTotal * 0.35;
}

export default async function TaxDetailsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { revenues: { include: { productType: true } }, costs: { include: { costSubject: true, productType: true } }, taxes: true, products: true }
  });

  const allProducts = version?.products || [];
  const disabledProducts = allProducts.filter((item) => !item.isActive).length;
  const allRevenues = version?.revenues || [];
  const revenues = allRevenues.filter((row) => row.productType?.isActive && row.productType?.isSaleable);
  const allCosts = version?.costs || [];
  const costs = allCosts.filter((row) => !row.productTypeId || row.productType?.isActive);
  const excludedRows = (allRevenues.length - revenues.length) + (allCosts.length - costs.length);
  const taxParam = version?.taxes;

  const outputVat = revenues.reduce((sum, row) => sum + n(row.taxAmount), 0);
  const inputVat = costs.reduce((sum, row) => sum + n(row.taxAmount), 0);
  const payableVat = Math.max(0, outputVat - inputVat);
  const urbanRate = n(taxParam?.urbanMaintenanceRate || 0.07);
  const eduRate = n(taxParam?.educationSurchargeRate || 0.03);
  const localEduRate = n(taxParam?.localEducationSurchargeRate || 0.02);
  const surcharge = payableVat * (urbanRate + eduRate + localEduRate);

  const revenueExclusive = revenues.reduce((sum, row) => sum + n(row.taxExclusiveRevenue), 0);
  const landCost = costs.filter((row) => row.costSubject.code.startsWith('01')).reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const devCost = costs.filter((row) => row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')).reduce((sum, row) => sum + n(row.taxExclusiveAmount || row.taxInclusiveAmount), 0);
  const saleManageFinance = costs.filter((row) => row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')).reduce((sum, row) => sum + n(row.taxExclusiveAmount || row.taxInclusiveAmount), 0);
  const additionalDeduction = (landCost + devCost) * 0.2;
  const deductionTotal = landCost + devCost + saleManageFinance + surcharge + additionalDeduction;
  const valueAdded = Math.max(0, revenueExclusive - deductionTotal);
  const landVat = Math.max(0, landVatByRatio(valueAdded, deductionTotal));

  const taxableIncome = Math.max(0, revenueExclusive - landCost - devCost - saleManageFinance - surcharge - landVat);
  const incomeTaxRate = n(taxParam?.corporateIncomeTaxRate || 0.25);
  const incomeTax = taxableIncome * incomeTaxRate;
  const totalTax = payableVat + surcharge + landVat + incomeTax;

  const rows = [
    ['销项税额', outputVat, '启用且可售业态收入明细表税额汇总'],
    ['进项税额', inputVat, '启用业态成本明细税额汇总'],
    ['应缴增值税', payableVat, '销项税额-进项税额，低于0按0暂估'],
    ['附加税费', surcharge, '应缴增值税×附加税率'],
    ['土地增值税', landVat, '按土增税测算逻辑自动取数'],
    ['企业所得税应纳税所得额', taxableIncome, '不含税收入-成本费用-附加-土增税'],
    ['企业所得税', incomeTax, `应纳税所得额×${fmt(incomeTaxRate * 100)}%`],
    ['税费合计', totalTax, '增值税+附加+土增税+所得税']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">税金明细表</p><h1 className="title">{project.name}</h1><p className="subtitle">自动汇总增值税、附加税、土地增值税和企业所得税。当前只统计启用业态收入与启用业态成本，停用业态自动排除。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/land-vat`} className="btn btn-primary">土地增值税</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || excludedRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、收入/成本行 {excludedRows} 行。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">应缴增值税</div><div className="stat-value">{fmt(payableVat)}</div></div><div className="stat"><div className="stat-label">附加税</div><div className="stat-value">{fmt(surcharge)}</div></div><div className="stat"><div className="stat-label">土增税</div><div className="stat-value">{fmt(landVat)}</div></div><div className="stat"><div className="stat-label">税费合计</div><div className="stat-value">{fmt(totalTax)}</div></div></div>
    <section className="card"><h2>税金明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['税费项目', '金额', '取数/计算说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row[0])}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row[0]}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row[1])}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row[2]}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
