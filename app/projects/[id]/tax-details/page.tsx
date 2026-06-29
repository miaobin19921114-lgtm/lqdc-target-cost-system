import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getProjectVersionRevenueLines } from '@/lib/project-version-revenue-lines';
import { costTotals, effectiveCostRows, fullTaxSummary, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';
import { buildProjectAllocationRuleMap, readProjectAllocationMethod } from '@/lib/project-allocation-rule-reader';
import { ProjectTopNav } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

type Row = [string, number, string];
const textCell = { padding: 9, borderBottom: '1px solid var(--border)' };
const moneyCell = { ...textCell, textAlign: 'right' as const };

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
  const groupName = productCostGroupName(product);
  if (!region || includes(region, ['全项目', '项目整体', 'Excel导入'])) return true;
  if (region === productName || region === groupName) return true;
  return region.includes(productName) || productName.includes(region) || region.includes(groupName) || groupName.includes(region);
}

function blankObject(product: any, costGroup = '') {
  return { product, costGroup, revenueInclusive: 0, revenueExclusive: 0, outputVat: 0, inputVat: 0, costExclusive: 0, landCost: 0, devCost: 0, saleManageFinance: 0 };
}

function addRevenue(target: ReturnType<typeof blankObject>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

function addRevenueToObjects(targets: Map<string, ReturnType<typeof blankObject>>, products: any[], version: any, vatRate: number, commercialRevenueLines: Array<{ parentProductTypeId: string; taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }>) {
  const revenueProductIds = new Set<string>((version?.revenues || []).map((row: any) => row.productTypeId).filter((id: unknown): id is string => Boolean(id)));
  products.filter((product) => product.isSaleable && !revenueProductIds.has(product.id)).forEach((product) => addRevenue(targets.get(product.id)!, calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate)));
  (version?.revenues || []).forEach((row: any) => { const item = targets.get(row.productTypeId); if (item) addRevenue(item, row); });
  commercialRevenueLines.forEach((row) => { const item = targets.get(row.parentProductTypeId); if (item) addRevenue(item, row); });
}

function allocateCostsToObjects(args: {
  targets: Map<string, ReturnType<typeof blankObject>>;
  costs: any[];
  activeProducts: any[];
  saleableProducts: any[];
  ruleMap: ReturnType<typeof buildProjectAllocationRuleMap>;
  purpose: 'incomeTax' | 'landVat';
}) {
  const { targets, costs, activeProducts, saleableProducts, ruleMap, purpose } = args;
  costs.forEach((row) => {
    const code = row.costSubject?.code || '';
    const method = readProjectAllocationMethod(code, row.allocationMethod, ruleMap, purpose) || '按可售面积占比';
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    const region = row.regionOrProductType || '';
    const matched = directProduct ? [directProduct] : activeProducts.filter((product) => regionMatchesProduct(region, product));
    const pool = matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入']) ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
    const bases = pool.map((product) => ({ product, base: allocationBase(product, method) }));
    const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || pool.length || 1;
    bases.forEach(({ product, base }) => {
      const item = targets.get(product.id);
      if (!item) return;
      const ratio = totalBase ? base / totalBase : 1 / pool.length;
      const taxExclusive = n(row.taxExclusiveAmount || row.taxInclusiveAmount) * ratio;
      item.costExclusive += taxExclusive;
      item.inputVat += n(row.taxAmount) * ratio;
      if (code.startsWith('01')) item.landCost += n(row.taxInclusiveAmount) * ratio;
      else if (code.startsWith('02') || code.startsWith('03')) item.devCost += taxExclusive;
      else if (code.startsWith('04') || code.startsWith('05') || code.startsWith('06')) item.saleManageFinance += taxExclusive;
    });
  });
}

export default async function TaxDetailsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true, products: true, revenues: { include: { productType: true } } }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(version?.id);

  const costsForVersion = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { costSubject: true, productType: true } }) : [];
  const projectRules = version ? await prisma.projectCostRule.findMany({ where: { projectVersionId: version.id }, select: { costCode: true, allocationMethod: true, remark: true } }) : [];
  const ruleMap = buildProjectAllocationRuleMap(projectRules);
  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(costsForVersion, leafCodes);
  const allProducts = version?.products || [];
  const activeProducts = allProducts.filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const disabledProducts = allProducts.filter((item) => !item.isActive).length;

  const revenue = revenueFromProjectData({ products: allProducts, revenues: version?.revenues || [], commercialRevenueLines, otherRevenueLines, vatRate });
  const cost = costTotals(effective.effective);
  const quickTax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const incomeTaxObjectMap = new Map<string, ReturnType<typeof blankObject>>();
  activeProducts.forEach((product) => incomeTaxObjectMap.set(product.id, blankObject(product, productCostGroupName(product))));
  addRevenueToObjects(incomeTaxObjectMap, activeProducts, version, vatRate, commercialRevenueLines);
  allocateCostsToObjects({ targets: incomeTaxObjectMap, costs: effective.effective, activeProducts, saleableProducts, ruleMap, purpose: 'incomeTax' });

  const landVatObjectMap = new Map<string, ReturnType<typeof blankObject>>();
  activeProducts.forEach((product) => landVatObjectMap.set(product.id, blankObject(product, productCostGroupName(product))));
  addRevenueToObjects(landVatObjectMap, activeProducts, version, vatRate, commercialRevenueLines);
  allocateCostsToObjects({ targets: landVatObjectMap, costs: effective.effective, activeProducts, saleableProducts, ruleMap, purpose: 'landVat' });

  const clearingMap = new Map<string, any>();
  Array.from(landVatObjectMap.values()).forEach((item) => {
    if (!item.product.isSaleable && !item.revenueInclusive && !item.costExclusive) return;
    const liquidationObject = getTaxLiquidationObject({ name: item.product.name, isSaleable: item.product.isSaleable, taxLiquidationObject: taxObjectMap.get(item.product.id) });
    const current = clearingMap.get(liquidationObject) || { name: liquidationObject, revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0 };
    current.revenueExclusive += item.revenueExclusive;
    current.outputVat += item.outputVat;
    current.inputVat += item.inputVat;
    current.landCost += item.landCost;
    current.devCost += item.devCost;
    current.saleManageFinance += item.saleManageFinance;
    clearingMap.set(liquidationObject, current);
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

  const objectRows = Array.from(incomeTaxObjectMap.values()).filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const surcharge = payableVat * surchargeRate;
    const liquidationObject = getTaxLiquidationObject({ name: item.product.name, isSaleable: item.product.isSaleable, taxLiquidationObject: taxObjectMap.get(item.product.id) });
    const taxableIncome = item.revenueExclusive - item.costExclusive - surcharge;
    const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0);
    return { ...item, payableVat, surcharge, taxableIncome, incomeTax, totalTax: payableVat + surcharge + incomeTax, netProfit: taxableIncome - incomeTax, liquidationObject };
  });

  const rows: Row[] = [
    ['含税总收入', revenue.taxInclusive, '销售收入+商业专项收入+车位收入+其他收入'],
    ['不含税总收入', revenue.taxExclusive, '按各收入行税率拆分后的不含税收入'],
    ['销项税额', revenue.outputVat, '按各收入行税额汇总'],
    ['进项税额', cost.inputVat, '有效末级成本税额汇总'],
    ['应缴增值税', quickTax.payableVat, '销项税额-进项税额，低于0按0暂估'],
    ['附加税费', quickTax.surcharge, `应缴增值税×${fmt(surchargeRate * 100)}%`],
    ['土地增值税', formalLandVat, '引用土地增值税清算测算表：按清算对象和土增税清算分摊规则计算后汇总'],
    ['企业所得税应纳税所得额', formalProfitBeforeIncomeTax, '不含税收入-不含税成本-附加税费-正式土增税'],
    ['企业所得税', formalIncomeTax, `应纳税所得额×${fmt(incomeTaxRate * 100)}%`],
    ['税费合计', formalTotalTax, '增值税+附加税+正式土增税+所得税']
  ];

  return <main className="page"><ProjectTopNav projectId={project.id} projectName={project.name} current="税费测算总表" /><div className="container" style={{ maxWidth: 1400 }}>
    <div className="page-header"><div><p className="eyebrow">税费测算总表</p><h1 className="title">{project.name}</h1><p className="subtitle">金额单位统一为万元；土地增值税读取土增税清算分摊规则，所得税成本对象拆分读取所得税成本对象规则。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/land-vat`} className="btn btn-primary">土地增值税清算测算表</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">业态利润分析</Link></div></div>
    {disabledProducts || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税总收入（万元）</div><div className="stat-value">{fmt(revenue.taxInclusive)}</div></div><div className="stat"><div className="stat-label">应缴增值税（万元）</div><div className="stat-value">{fmt(quickTax.payableVat)}</div></div><div className="stat"><div className="stat-label">正式土增税（万元）</div><div className="stat-value">{fmt(formalLandVat)}</div></div><div className="stat"><div className="stat-label">税费合计（万元）</div><div className="stat-value">{fmt(formalTotalTax)}</div></div></div>
    <section className="card" style={{ marginBottom: 18 }}><h2>按所得税成本对象拆分</h2><p className="meta">本表用于管理视角查看业态税费贡献；项目整体所得税仍按项目法人口径汇总，正式土增税以土地增值税清算测算表为准。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1450, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本归属组', '清算对象', '销项税', '进项税', '应缴增值税', '附加税', '所得税应税所得', '所得税', '税费合计(不含土增税)', '税后净利', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{objectRows.length ? objectRows.map((row) => <tr key={row.product.id}><td style={{ ...textCell, fontWeight: 800 }}>{row.product.name}</td><td style={textCell}>{row.costGroup}</td><td style={textCell}>{row.liquidationObject}</td><td style={moneyCell}>{fmt(row.outputVat)}</td><td style={moneyCell}>{fmt(row.inputVat)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.payableVat)}</td><td style={moneyCell}>{fmt(row.surcharge)}</td><td style={moneyCell}>{fmt(row.taxableIncome)}</td><td style={moneyCell}>{fmt(row.incomeTax)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.totalTax)}</td><td style={{ ...moneyCell, fontWeight: 900, color: row.netProfit >= 0 ? '#2f9e44' : '#e03131' }}>{fmt(row.netProfit)}</td><td style={textCell}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={12} style={{ padding: 12, color: 'var(--muted)' }}>暂无启用业态或可分摊成本。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>土地增值税清算对象汇总</h2><p className="meta">本区与土地增值税清算测算表保持一致，读取土增税清算分摊规则。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}><thead><tr>{['清算对象', '不含税收入', '应缴增值税', '扣除项目', '增值额', '增值率', '土增税'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{clearingRows.length ? clearingRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.revenueExclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.payableVat)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.landVat.deductionTotal)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.landVat.valueAdded)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{pct(row.landVat.valueAddedRatio)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 900 }}>{fmt(row.landVat.landVat)}</td></tr>) : <tr><td colSpan={7} style={{ padding: 12, color: 'var(--muted)' }}>暂无清算对象数据。</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>项目整体税费明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['税费项目', '金额(万元)', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map(([name, value, remark]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{remark}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
