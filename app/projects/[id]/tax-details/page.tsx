import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, landVatSummary, n, revenueFromProducts } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; }
function includes(text: string | null | undefined, words: string[]) { const value = text || ''; return words.some((word) => value.includes(word)); }

function allocationBase(product: any, method: string | null | undefined) {
  const weight = n(product.allocationWeight || 1) || 1;
  const name = product.name || '';
  const methodText = method || '';
  if (includes(methodText, ['建筑面积', '建面'])) return n(product.buildingArea) * weight;
  if (includes(methodText, ['计容'])) return n(product.capacityArea) * weight;
  if (includes(methodText, ['不可售'])) return n(product.nonSaleableArea) * weight;
  if (includes(methodText, ['车位', '地库', '地下车位']) || includes(name, ['车位', '地库', '地下'])) return (n(product.saleableArea) || n(product.buildingArea)) * weight;
  if (includes(methodText, ['销售收入', '收入'])) return n(product.saleableArea) * n(product.salePrice) * weight;
  return (n(product.saleableArea) || n(product.buildingArea) || n(product.capacityArea)) * weight;
}

function taxObjectName(product: any) {
  if (!product.isSaleable) return '不可售/配套';
  if (includes(product.name, ['车位', '车库', '地下'])) return '车位';
  if (includes(product.name, ['商业', '底商', '商铺'])) return '商业';
  return '住宅';
}

function methodName(method: string | null | undefined) { return method || '按可售面积占比'; }

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

  const activeProducts = (version?.products || []).filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const objectMap = new Map<string, { product: any; revenueInclusive: number; revenueExclusive: number; outputVat: number; inputVat: number; costExclusive: number; landCost: number; devCost: number; saleManageFinance: number }>();

  activeProducts.forEach((product) => {
    const rev = product.isSaleable ? calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate) : { taxInclusiveRevenue: 0, taxExclusiveRevenue: 0, taxAmount: 0 };
    objectMap.set(product.id, {
      product,
      revenueInclusive: rev.taxInclusiveRevenue,
      revenueExclusive: rev.taxExclusiveRevenue,
      outputVat: rev.taxAmount,
      inputVat: 0,
      costExclusive: 0,
      landCost: 0,
      devCost: 0,
      saleManageFinance: 0
    });
  });

  effective.effective.forEach((row) => {
    const method = methodName(row.allocationMethod);
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    let pool: any[] = [];
    if (directProduct) {
      pool = [directProduct];
    } else {
      const matched = activeProducts.filter((product) => {
        const region = row.regionOrProductType || '';
        if (!region || region.includes('全项目') || region.includes('项目整体') || region.includes('Excel导入')) return true;
        return region.includes(product.name) || product.name.includes(region) || (region.includes('地下') && product.name.includes('地下')) || (region.includes('车位') && product.name.includes('车位'));
      });
      pool = matched.length ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
    }
    const bases = pool.map((product) => ({ product, base: allocationBase(product, method) }));
    const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || pool.length || 1;
    bases.forEach(({ product, base }) => {
      const item = objectMap.get(product.id);
      if (!item) return;
      const ratio = totalBase ? base / totalBase : 1 / pool.length;
      const taxExclusive = n(row.taxExclusiveAmount || row.taxInclusiveAmount) * ratio;
      item.costExclusive += taxExclusive;
      item.inputVat += n(row.taxAmount) * ratio;
      if (row.costSubject.code.startsWith('01')) item.landCost += n(row.taxInclusiveAmount) * ratio;
      else if (row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')) item.devCost += taxExclusive;
      else if (row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')) item.saleManageFinance += taxExclusive;
    });
  });

  const objectRows = Array.from(objectMap.values()).filter((item) => item.product.isSaleable).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const surcharge = payableVat * surchargeRate;
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    const taxableIncome = item.revenueExclusive - item.costExclusive - surcharge - lv.landVat;
    const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0);
    const totalTax = payableVat + surcharge + lv.landVat + incomeTax;
    const netProfit = taxableIncome - incomeTax;
    return { ...item, payableVat, surcharge, landVat: lv.landVat, taxableIncome, incomeTax, totalTax, netProfit };
  });

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

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">税金明细表</p><h1 className="title">{project.name}</h1><p className="subtitle">统一按目标成本汇总口径自动计算增值税、附加税、土地增值税和企业所得税；新增按业态成本对象拆分税金。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/land-vat`} className="btn btn-primary">土地增值税</Link><Link href={`/projects/${project.id}/cost-allocation`} className="btn">成本分摊</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">应缴增值税</div><div className="stat-value">{fmt(tax.payableVat)}</div></div><div className="stat"><div className="stat-label">附加税</div><div className="stat-value">{fmt(tax.surcharge)}</div></div><div className="stat"><div className="stat-label">土增税</div><div className="stat-value">{fmt(tax.landVat.landVat)}</div></div><div className="stat"><div className="stat-label">税费合计</div><div className="stat-value">{fmt(tax.totalTax)}</div></div></div>
    <section className="card" style={{ marginBottom: 18 }}><h2>按业态成本对象税金拆分</h2><p className="meta">第一版按成本分摊结果拆分税金，便于查看住宅、商业、车位等对象的税后利润。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1460, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本对象', '销项税', '进项税', '应缴增值税', '附加税', '土增税', '所得税应税所得', '所得税', '税费合计', '税后净利', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{objectRows.length ? objectRows.map((row) => <tr key={row.product.id}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.product.name}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{taxObjectName(row.product)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.outputVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.inputVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.payableVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.surcharge)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.landVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxableIncome)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.incomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.totalTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={12} style={{ padding: 12, color: 'var(--muted)' }}>暂无可售业态，先维护业态指标和销售单价。</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>项目整体税金明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['税费项目', '金额', '取数/计算说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row[0])}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row[0]}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row[1])}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row[2]}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
