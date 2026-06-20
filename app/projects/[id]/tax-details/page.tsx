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

type Row = [string, number, string];

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

function methodName(method: string | null | undefined) {
  return method || '按可售面积占比';
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
  if (region.includes('主楼地下室') && productName.includes('主楼地下室')) return true;
  if (region.includes('非主楼地下室') && (productName.includes('非主楼') || productName.includes('纯地库') || costGroup.includes('非主楼地下室'))) return true;
  if (region.includes('人防地下室') && (productName.includes('人防') || costGroup.includes('人防地下室'))) return true;
  if (region.includes('地下') && productName.includes('地下') && !region.includes('非主楼') && !region.includes('主楼')) return true;
  return false;
}

function blankObject(product: any, costGroup = '') {
  return { product, costGroup, revenueInclusive: 0, revenueExclusive: 0, outputVat: 0, inputVat: 0, costExclusive: 0, landCost: 0, devCost: 0, saleManageFinance: 0 };
}

function addRevenue(target: ReturnType<typeof blankObject>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

const moneyCell = { padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' as const };
const textCell = { padding: 9, borderBottom: '1px solid var(--border)' };

export default async function TaxDetailsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true, products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const costsForVersion = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id },
    include: { costSubject: true, productType: true }
  }) : [];

  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    select: { costCode: true }
  });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(costsForVersion, leafCodes);
  const revenue = revenueFromProjectData({
    products: version?.products || [],
    revenues: version?.revenues || [],
    commercialRevenueLines: version?.commercialRevenueLines || [],
    otherRevenueLines: version?.otherRevenueLines || [],
    vatRate
  });
  const cost = costTotals(effective.effective);
  const quickTax = fullTaxSummary({
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

  const allProducts = version?.products || [];
  const disabledProducts = allProducts.filter((item) => !item.isActive).length;
  const activeProducts = allProducts.filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const objectMap = new Map<string, ReturnType<typeof blankObject>>();
  activeProducts.forEach((product) => objectMap.set(product.id, blankObject(product, productCostGroupName(product))));

  const revenueProductIds = new Set<string>((version?.revenues || []).map((row) => row.productTypeId).filter((id): id is string => Boolean(id)));
  activeProducts.filter((product) => product.isSaleable && !revenueProductIds.has(product.id)).forEach((product) => addRevenue(objectMap.get(product.id)!, calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate)));
  (version?.revenues || []).forEach((row) => { const item = objectMap.get(row.productTypeId); if (item) addRevenue(item, row); });
  (version?.commercialRevenueLines || []).forEach((row) => { const item = objectMap.get(row.parentProductTypeId); if (item) addRevenue(item, row); });

  effective.effective.forEach((row) => {
    const method = methodName(row.allocationMethod);
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    const region = row.regionOrProductType || '';
    let pool: any[] = [];
    if (directProduct) pool = [directProduct];
    else {
      const matched = activeProducts.filter((product) => regionMatchesProduct(region, product));
      pool = matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入']) ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
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

  const objectRows = Array.from(objectMap.values()).filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const surcharge = payableVat * surchargeRate;
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    const taxableIncome = item.revenueExclusive - item.costExclusive - surcharge - lv.landVat;
    const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0);
    const totalTax = payableVat + surcharge + lv.landVat + incomeTax;
    const netProfit = taxableIncome - incomeTax;
    const liquidationObject = getTaxLiquidationObject({ name: item.product.name, isSaleable: item.product.isSaleable, taxLiquidationObject: taxObjectMap.get(item.product.id) });
    return { ...item, payableVat, surcharge, landVat: lv.landVat, taxableIncome, incomeTax, totalTax, netProfit, liquidationObject };
  });

  const clearingMap = new Map<string, any>();
  objectRows.forEach((row) => {
    const current = clearingMap.get(row.liquidationObject) || { name: row.liquidationObject, revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0 };
    current.revenueExclusive += row.revenueExclusive;
    current.outputVat += row.outputVat;
    current.inputVat += row.inputVat;
    current.landCost += row.landCost;
    current.devCost += row.devCost;
    current.saleManageFinance += row.saleManageFinance;
    clearingMap.set(row.liquidationObject, current);
  });
  const clearingRows = Array.from(clearingMap.values()).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    return { ...item, payableVat, landVat: lv };
  });
  const formalLandVat = clearingRows.reduce((sum, item) => sum + item.landVat.landVat, 0);
  const formalProfitBeforeIncomeTax = revenue.taxExclusive - cost.taxExclusive - quickTax.surcharge - formalLandVat;
  const formalIncomeTax = Math.max(formalProfitBeforeIncomeTax * incomeTaxRate, 0);
  const formalTotalTax = quickTax.payableVat + quickTax.surcharge + formalLandVat + formalIncomeTax;

  const rows: Row[] = [
    ['含税总收入', revenue.taxInclusive, '销售收入+商业专项收入+车位收入+其他收入'],
    ['不含税总收入', revenue.taxExclusive, '按各收入行税率拆分后的不含税收入'],
    ['销项税额', revenue.outputVat, '按各收入行税额汇总'],
    ['进项税额', cost.inputVat, '有效末级成本税额汇总'],
    ['应缴增值税', quickTax.payableVat, '销项税额-进项税额，低于0按0暂估'],
    ['附加税费', quickTax.surcharge, `应缴增值税×${fmt(surchargeRate * 100)}%`],
    ['土地增值税', formalLandVat, '引用土地增值税清算测算表：按清算对象分别计算后汇总'],
    ['企业所得税应纳税所得额', formalProfitBeforeIncomeTax, '不含税收入-不含税成本-附加税费-正式土增税'],
    ['企业所得税', formalIncomeTax, `应纳税所得额×${fmt(incomeTaxRate * 100)}%`],
    ['税费合计', formalTotalTax, '增值税+附加税+正式土增税+所得税']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1400 }}>
    <div className="page-header"><div><p className="eyebrow">税费测算总表</p><h1 className="title">{project.name}</h1><p className="subtitle">金额单位统一为万元；土地增值税引用“土地增值税清算测算表”的正式清算对象合计结果，不再按项目整体快速测算作为正式数。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/land-vat`} className="btn btn-primary">土地增值税清算</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">业态利润</Link><Link href={`/projects/${project.id}/cost-allocation`} className="btn">成本分摊</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税总收入（万元）</div><div className="stat-value">{fmt(revenue.taxInclusive)}</div></div><div className="stat"><div className="stat-label">应缴增值税（万元）</div><div className="stat-value">{fmt(quickTax.payableVat)}</div></div><div className="stat"><div className="stat-label">正式土增税（万元）</div><div className="stat-value">{fmt(formalLandVat)}</div></div><div className="stat"><div className="stat-label">税费合计（万元）</div><div className="stat-value">{fmt(formalTotalTax)}</div></div></div>
    <section className="card" style={{ marginBottom: 18 }}><h2>土增税正式来源</h2><p className="meta">按清算对象分别计算，以下合计进入本税费测算总表。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['清算对象', '不含税收入(万元)', '扣除项目(万元)', '增值额(万元)', '增值率', '土增税(万元)'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{clearingRows.map((row) => <tr key={row.name}><td style={{ ...textCell, fontWeight: 800 }}>{row.name}</td><td style={moneyCell}>{fmt(row.revenueExclusive)}</td><td style={moneyCell}>{fmt(row.landVat.deductionTotal)}</td><td style={moneyCell}>{fmt(row.landVat.valueAdded)}</td><td style={moneyCell}>{pct(row.landVat.valueAddedRatio)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.landVat.landVat)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>按业态成本对象税金拆分</h2><p className="meta">本表按成本归属组拆分税金，金额单位均为万元。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1560, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本归属组', '清算对象', '销项税(万元)', '进项税(万元)', '应缴增值税(万元)', '附加税(万元)', '业态土增税(万元)', '所得税应税所得(万元)', '所得税(万元)', '税费合计(万元)', '税后净利(万元)', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{objectRows.length ? objectRows.map((row) => <tr key={row.product.id}><td style={{ ...textCell, fontWeight: 800 }}>{row.product.name}</td><td style={textCell}>{row.costGroup}</td><td style={textCell}>{row.liquidationObject}</td><td style={moneyCell}>{fmt(row.outputVat)}</td><td style={moneyCell}>{fmt(row.inputVat)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.payableVat)}</td><td style={moneyCell}>{fmt(row.surcharge)}</td><td style={moneyCell}>{fmt(row.landVat)}</td><td style={moneyCell}>{fmt(row.taxableIncome)}</td><td style={moneyCell}>{fmt(row.incomeTax)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.totalTax)}</td><td style={{ ...moneyCell, fontWeight: 900, color: row.netProfit >= 0 ? '#2f9e44' : '#e03131' }}>{fmt(row.netProfit)}</td><td style={textCell}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={13} style={{ padding: 12, color: 'var(--muted)' }}>暂无启用业态或可分摊成本。</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>项目整体税费明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['税费项目', '金额(万元)', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map(([name, value, remark]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{remark}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
