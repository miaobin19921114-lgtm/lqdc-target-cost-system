import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

export default async function TaxDetailsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { costs: { include: { costSubject: true, productType: true } }, taxes: true, products: true }
  });

  const taxParam = version?.taxes;
  const vatRate = n(taxParam?.vatRate || 0.09);
  const surchargeRate = n(taxParam?.urbanMaintenanceRate || 0.07) + n(taxParam?.educationSurchargeRate || 0.03) + n(taxParam?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(taxParam?.corporateIncomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter(Boolean));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProducts(version?.products || [], vatRate);
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({
    revenueExclusive: revenue.taxExclusive,
    outputVat: revenue.outputVat,
    inputVat: cost.inputVat,
    costExclusive: cost.taxExclusive,
    landCost: cost.landCost,
    devCost: cost.devCost,
    saleManageFinance: cost.saleManageFinance,
    surchargeRate,
    incomeTaxRate
  });
  const disabledProducts = (version?.products || []).filter((item) => !item.isActive).length;

  const rows = [
    ['含税销售收入', revenue.taxInclusive, '按当前启用且可售业态自动测算'],
    ['不含税销售收入', revenue.taxExclusive, '含税销售收入 / (1+增值税率)'],
    ['销项税额', revenue.outputVat, '不含税销售收入对应销项税'],
    ['进项税额', cost.inputVat, '当前有效末级成本税额汇总，含Excel导入四级科目'],
    ['应缴增值税', tax.payableVat, '销项税额-进项税额，低于0按0暂估'],
    ['附加税费', tax.surcharge, `应缴增值税×${fmt(surchargeRate * 100)}%`],
    ['土地增值税', tax.landVat.landVat, '按土增税测算逻辑自动取数'],
    ['企业所得税应纳税所得额', tax.profitBeforeIncomeTax, '不含税收入-不含税成本-附加税费-土增税'],
    ['企业所得税', tax.incomeTax, `应纳税所得额×${fmt(incomeTaxRate * 100)}%`],
    ['税费合计', tax.totalTax, '增值税+附加税+土增税+所得税']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">税金明细表</p><h1 className="title">{project.name}</h1><p className="subtitle">统一按目标成本汇总口径自动计算增值税、附加税、土地增值税和企业所得税；停用业态自动排除。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/land-vat`} className="btn btn-primary">土地增值税</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">应缴增值税</div><div className="stat-value">{fmt(tax.payableVat)}</div></div><div className="stat"><div className="stat-label">附加税</div><div className="stat-value">{fmt(tax.surcharge)}</div></div><div className="stat"><div className="stat-label">土增税</div><div className="stat-value">{fmt(tax.landVat.landVat)}</div></div><div className="stat"><div className="stat-label">税费合计</div><div className="stat-value">{fmt(tax.totalTax)}</div></div></div>
    <section className="card"><h2>税金明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['税费项目', '金额', '取数/计算说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row[0])}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row[0]}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row[1])}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row[2]}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
