import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function includes(text: string | null | undefined, words: string[]) {
  const value = text || '';
  return words.some((word) => value.includes(word));
}

function allocationBase(product: any, method: string | null | undefined) {
  const weight = n(product.allocationWeight || 1) || 1;
  const methodText = method || '';
  if (includes(methodText, ['建筑面积', '建面'])) return n(product.buildingArea) * weight;
  if (includes(methodText, ['计容'])) return n(product.capacityArea) * weight;
  if (includes(methodText, ['不可售'])) return n(product.nonSaleableArea) * weight;
  if (includes(methodText, ['车位', '地库', '地下车位']) || includes(product.name, ['车位', '地库', '地下'])) return (n(product.saleableArea) || n(product.buildingArea)) * weight;
  if (includes(methodText, ['销售收入', '收入'])) return n(product.saleableArea) * n(product.salePrice) * weight;
  return (n(product.saleableArea) || n(product.buildingArea) || n(product.capacityArea)) * weight;
}

function productCostGroupName(product: any) {
  const setting = getCostSettings(product);
  return setting.standalone ? product.name : setting.groupName;
}

function regionMatchesProduct(region: string, product: any) {
  const productName = product.name || '';
  const costGroup = productCostGroupName(product);
  if (!region || region.includes('全项目') || region.includes('项目整体') || region.includes('Excel导入')) return true;
  if (region === productName || region === costGroup) return true;
  if (region.includes(productName) || productName.includes(region)) return true;
  if (region.includes(costGroup) || costGroup.includes(region)) return true;
  return false;
}

function blankObject(product: any, costGroup = '') {
  return { product, costGroup, revenueInclusive: 0, revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0, costExclusive: 0 };
}

function addRevenue(target: ReturnType<typeof blankObject>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

export default async function LandVatPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true, products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true }
  });
  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();
  const costLines = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { costSubject: true, productType: true } }) : [];
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(costLines, leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const activeProducts = (version?.products || []).filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const objectMap = new Map<string, ReturnType<typeof blankObject>>();
  activeProducts.forEach((product) => objectMap.set(product.id, blankObject(product, productCostGroupName(product))));

  const revenueProductIds = new Set<string>((version?.revenues || []).map((row) => row.productTypeId).filter((id): id is string => Boolean(id)));
  activeProducts.filter((product) => product.isSaleable && !revenueProductIds.has(product.id)).forEach((product) => addRevenue(objectMap.get(product.id)!, calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate)));
  (version?.revenues || []).forEach((row) => { const item = objectMap.get(row.productTypeId); if (item) addRevenue(item, row); });
  (version?.commercialRevenueLines || []).forEach((row) => { const item = objectMap.get(row.parentProductTypeId); if (item) addRevenue(item, row); });

  effective.effective.forEach((row) => {
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    const region = row.regionOrProductType || '';
    const matched = directProduct ? [directProduct] : activeProducts.filter((product) => regionMatchesProduct(region, product));
    const pool = matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入']) ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
    const bases = pool.map((product) => ({ product, base: allocationBase(product, row.allocationMethod) }));
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

  const objectRows = Array.from(objectMap.values()).filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    const surcharge = payableVat * surchargeRate;
    const taxableIncome = item.revenueExclusive - item.costExclusive - surcharge - lv.landVat;
    const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0);
    const netProfit = taxableIncome - incomeTax;
    const liquidationObject = getTaxLiquidationObject({ name: item.product.name, isSaleable: item.product.isSaleable, taxLiquidationObject: taxObjectMap.get(item.product.id) });
    return { ...item, payableVat, landVat: lv, surcharge, taxableIncome, incomeTax, netProfit, liquidationObject };
  });

  const processRows = [
    ['不含税总收入', revenue.taxExclusive, '销售收入剔除销项税'],
    ['土地成本', cost.landCost, '土地成本'],
    ['开发成本', cost.devCost, '前期+建安'],
    ['销售/管理/财务费用', cost.saleManageFinance, '期间费用'],
    ['税金及附加', tax.landVat.taxAndSurcharge, '应缴增值税×附加税率'],
    ['加计扣除', tax.landVat.additionalDeduction, '土地成本+开发成本的20%'],
    ['扣除项目合计', tax.landVat.deductionTotal, '自动汇总'],
    ['增值额', tax.landVat.valueAdded, '不含税收入-扣除项目'],
    ['增值率', tax.landVat.valueAddedRatio * 100, '增值额/扣除项目'],
    ['土地增值税', tax.landVat.landVat, '按超率累进口径暂估']
  ] as const;

  return <main className="page"><div className="container" style={{ maxWidth: 1400 }}>
    <div className="page-header"><div><p className="eyebrow">土地增值税清算测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">金额单位统一为万元；按业态维护里的税务清算对象汇总，未维护时才按名称兜底判断。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/product-maintenance`} className="btn btn-primary">业态维护</Link><Link href={`/projects/${project.id}/cost-allocation`} className="btn">成本分摊</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税费测算总表</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入（万元）</div><div className="stat-value">{fmt(revenue.taxExclusive)}</div></div><div className="stat"><div className="stat-label">扣除项目（万元）</div><div className="stat-value">{fmt(tax.landVat.deductionTotal)}</div></div><div className="stat"><div className="stat-label">增值率</div><div className="stat-value">{fmt(tax.landVat.valueAddedRatio * 100)}%</div></div><div className="stat"><div className="stat-label">土增税（万元）</div><div className="stat-value">{fmt(tax.landVat.landVat)}</div></div></div>
    <section className="card" style={{ marginBottom: 18 }}><h2>按清算对象/业态测算</h2><p className="meta">清算对象来自业态维护；支持普通住宅、非普通住宅、非住宅、车位等对象。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1640, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本归属组', '清算对象', '含税收入(万元)', '不含税收入(万元)', '分摊不含税成本(万元)', '扣除项目(万元)', '增值率', '土增税(万元)', '所得税应税所得(万元)', '所得税(万元)', '税后净利(万元)', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{objectRows.length ? objectRows.map((row) => <tr key={row.product.id}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.product.name}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.costGroup}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.liquidationObject}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.revenueExclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.costExclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.landVat.deductionTotal)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{pct(row.landVat.valueAddedRatio)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(row.landVat.landVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.taxableIncome)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.incomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(row.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={13} style={{ padding: 12, color: 'var(--muted)' }}>暂无可售业态，先维护业态指标。</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>项目整体土增税过程</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['项目', '金额(万元)/比例', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{processRows.map(([name, value, remark]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{name.includes('率') ? `${fmt(value)}%` : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{remark}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
