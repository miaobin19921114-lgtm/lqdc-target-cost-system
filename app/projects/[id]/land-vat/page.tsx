import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { calculateRevenueLine } from '@/lib/calculations';
import { costTotals, effectiveCostRows, fullTaxSummary, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';
import { buildProjectAllocationRuleMap, readProjectAllocationMethod } from '@/lib/project-allocation-rule-reader';

export const dynamic = 'force-dynamic';

const cell = { padding: 9, borderBottom: '1px solid var(--border)' };
const money = { ...cell, textAlign: 'right' as const };

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
  const group = productCostGroupName(product);
  if (!region || includes(region, ['全项目', '项目整体', 'Excel导入'])) return true;
  return region === productName || region === group || region.includes(productName) || productName.includes(region) || region.includes(group) || group.includes(region);
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

  const costLines = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { costSubject: true, productType: true } }) : [];
  const projectRules = version ? await prisma.projectCostRule.findMany({ where: { projectVersionId: version.id }, select: { costCode: true, allocationMethod: true, remark: true } }) : [];
  const ruleMap = buildProjectAllocationRuleMap(projectRules);
  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(costLines, leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const quickTax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

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
    const method = readProjectAllocationMethod(row.costSubject.code, row.allocationMethod, ruleMap, 'landVat');
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

  const productRows = Array.from(objectMap.values())
    .filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive)
    .map((item) => ({ ...item, liquidationObject: getTaxLiquidationObject({ name: item.product.name, isSaleable: item.product.isSaleable, taxLiquidationObject: taxObjectMap.get(item.product.id) }) }));
  const groupMap = new Map<string, any>();
  productRows.forEach((row) => {
    const current = groupMap.get(row.liquidationObject) || { liquidationObject: row.liquidationObject, productNames: [], revenueInclusive: 0, revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0, costExclusive: 0 };
    current.productNames.push(row.product.name);
    ['revenueInclusive', 'revenueExclusive', 'outputVat', 'inputVat', 'landCost', 'devCost', 'saleManageFinance', 'costExclusive'].forEach((key) => { current[key] += n((row as any)[key]); });
    groupMap.set(row.liquidationObject, current);
  });
  const clearingRows = Array.from(groupMap.values()).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    const surcharge = payableVat * surchargeRate;
    const taxableIncome = item.revenueExclusive - item.costExclusive - surcharge - lv.landVat;
    const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0);
    return { ...item, payableVat, landVat: lv, surcharge, taxableIncome, incomeTax, netProfit: taxableIncome - incomeTax };
  });
  const formalTotals = clearingRows.reduce((sum, row) => ({ deduction: sum.deduction + row.landVat.deductionTotal, valueAdded: sum.valueAdded + row.landVat.valueAdded, landVat: sum.landVat + row.landVat.landVat }), { deduction: 0, valueAdded: 0, landVat: 0 });

  return <main className="page"><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">土地增值税清算测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">按清算对象分组，并优先读取模板中心的“土增税清算分摊规则”。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/product-maintenance`} className="btn btn-primary">业态维护</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税费测算总表</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入（万元）</div><div className="stat-value">{fmt(revenue.taxExclusive)}</div></div><div className="stat"><div className="stat-label">扣除项目合计（万元）</div><div className="stat-value">{fmt(formalTotals.deduction)}</div></div><div className="stat"><div className="stat-label">综合增值率</div><div className="stat-value">{fmt(formalTotals.deduction ? formalTotals.valueAdded / formalTotals.deduction * 100 : 0)}%</div></div><div className="stat"><div className="stat-label">土增税合计（万元）</div><div className="stat-value">{fmt(formalTotals.landVat)}</div></div></div>
    <section className="card" style={{ marginBottom: 18 }}><h2>按清算对象正式测算</h2><p className="meta">金额单位为万元；各清算对象分别适用四级超率累进。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1500, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['清算对象', '包含业态', '不含税收入', '土地成本', '开发成本', '开发费用', '税金及附加', '加计扣除', '扣除项目', '增值额', '增值率', '适用税率', '土地增值税'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{clearingRows.length ? clearingRows.map((row) => <tr key={row.liquidationObject}><td style={{ ...cell, fontWeight: 800 }}>{row.liquidationObject}</td><td style={cell}>{row.productNames.join('、')}</td><td style={money}>{fmt(row.revenueExclusive)}</td><td style={money}>{fmt(row.landCost)}</td><td style={money}>{fmt(row.devCost)}</td><td style={money}>{fmt(row.saleManageFinance)}</td><td style={money}>{fmt(row.landVat.taxAndSurcharge)}</td><td style={money}>{fmt(row.landVat.additionalDeduction)}</td><td style={money}>{fmt(row.landVat.deductionTotal)}</td><td style={money}>{fmt(row.landVat.valueAdded)}</td><td style={money}>{pct(row.landVat.valueAddedRatio)}</td><td style={money}>{pct(row.landVat.ladder.rate)}</td><td style={{ ...money, fontWeight: 800 }}>{fmt(row.landVat.landVat)}</td></tr>) : <tr><td colSpan={13} style={{ padding: 12, color: 'var(--muted)' }}>暂无清算对象数据。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginBottom: 18 }}><h2>业态分摊明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '清算对象', '含税收入', '不含税收入', '分摊不含税成本', '所得税应税所得', '所得税', '税后净利'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{productRows.map((row) => { const payableVat = Math.max(row.outputVat - row.inputVat, 0); const lv = landVatSummary({ revenueExclusive: row.revenueExclusive, outputVat: payableVat, landCost: row.landCost, devCost: row.devCost, saleManageFinance: row.saleManageFinance, surchargeRate }); const surcharge = payableVat * surchargeRate; const taxableIncome = row.revenueExclusive - row.costExclusive - surcharge - lv.landVat; const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0); return <tr key={row.product.id}><td style={{ ...cell, fontWeight: 800 }}>{row.product.name}</td><td style={cell}>{row.liquidationObject}</td><td style={money}>{fmt(row.revenueInclusive)}</td><td style={money}>{fmt(row.revenueExclusive)}</td><td style={money}>{fmt(row.costExclusive)}</td><td style={money}>{fmt(taxableIncome)}</td><td style={money}>{fmt(incomeTax)}</td><td style={{ ...money, fontWeight: 800 }}>{fmt(taxableIncome - incomeTax)}</td></tr>; })}</tbody></table></div></section>
    <section className="card"><h2>项目整体快速校验</h2><p className="meta">仅作为校验参考，正式结果以上方“按清算对象正式测算”的合计为准。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><tbody>{[['项目整体扣除项目', quickTax.landVat.deductionTotal, '快速校验'], ['项目整体增值额', quickTax.landVat.valueAdded, '快速校验'], ['项目整体增值率', quickTax.landVat.valueAddedRatio * 100, '快速校验'], ['项目整体土增税', quickTax.landVat.landVat, '快速校验']].map(([name, value, remark]) => <tr key={name as string}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{String(name).includes('率') ? `${fmt(value)}%` : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{remark}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
