import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

export default async function LandVatPage({ params }: { params: { id: string } }) {
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
    ['不含税销售收入', revenue.taxExclusive, '销售收入剔除销项税'],
    ['土地成本', cost.landCost, '01 土地成本，暂按含税金额进入土增税扣除'],
    ['开发成本', cost.devCost, '02 前期 + 03 建安，按不含税成本进入土增税扣除'],
    ['销售/管理/财务费用', cost.saleManageFinance, '04/05/06 期间费用，清算口径后续可继续细化'],
    ['税金及附加', tax.landVat.taxAndSurcharge, '按应缴增值税×附加税率测算'],
    ['加计扣除', tax.landVat.additionalDeduction, '土地成本+开发成本的20%'],
    ['扣除项目合计', tax.landVat.deductionTotal, '自动汇总'],
    ['增值额', tax.landVat.valueAdded, '不含税收入-扣除项目'],
    ['增值率', tax.landVat.valueAddedRatio * 100, '增值额/扣除项目合计'],
    ['适用税率', tax.landVat.ladder.rate * 100, '四级超率累进'],
    ['速算扣除系数', tax.landVat.ladder.deduction * 100, '四级超率累进'],
    ['土地增值税', tax.landVat.landVat, '增值额×税率-扣除项目×速算扣除系数']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">土地增值税测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">与目标成本汇总表共用同一套收入、成本和税费口径；Excel导入四级成本科目会计入测算。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-allocation`} className="btn btn-primary">成本分摊</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入</div><div className="stat-value">{fmt(revenue.taxExclusive)}</div></div><div className="stat"><div className="stat-label">扣除项目</div><div className="stat-value">{fmt(tax.landVat.deductionTotal)}</div></div><div className="stat"><div className="stat-label">增值率</div><div className="stat-value">{fmt(tax.landVat.valueAddedRatio * 100)}%</div></div><div className="stat"><div className="stat-label">土增税</div><div className="stat-value">{fmt(tax.landVat.landVat)}</div></div></div>
    <section className="card"><h2>测算明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['项目', '金额/比例', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row[0])}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row[0]}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row[1])}{String(row[0]).includes('率') || String(row[0]).includes('系数') ? '%' : ''}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row[2]}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
