import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { costTotals, effectiveCostRows, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

const cell = { padding: 10, borderBottom: '1px solid var(--border)' };
const money = { ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const };

function fmt(value: unknown) {
  return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`;
}

function color(value: number) {
  return value >= 0 ? '#2f9e44' : '#e03131';
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
  return !region
    || region.includes('全项目')
    || region.includes('项目整体')
    || region.includes('Excel导入')
    || region === productName
    || region === costGroup
    || region.includes(productName)
    || productName.includes(region)
    || region.includes(costGroup)
    || costGroup.includes(region);
}

function blankProduct(product: any, taxLiquidationObject: string | null | undefined) {
  return {
    product,
    costGroup: productCostGroupName(product),
    liquidationObject: getTaxLiquidationObject({ name: product.name, isSaleable: product.isSaleable, taxLiquidationObject }),
    revenueInclusive: 0,
    revenueExclusive: 0,
    outputVat: 0,
    costExclusive: 0,
    costInclusive: 0,
    inputVat: 0,
    landCost: 0,
    devCost: 0,
    saleManageFinance: 0,
    surcharge: 0,
    landVat: 0,
    profitBeforeIncomeTax: 0,
    incomeTax: 0,
    netProfit: 0
  };
}

function addRevenue(target: ReturnType<typeof blankProduct>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

export default async function ProfitAnalysisPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: project.activeVersionId ? { id: project.activeVersionId, projectId: params.id } : { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      revenues: { include: { productType: true } },
      commercialRevenueLines: true,
      otherRevenueLines: true,
      costs: { include: { productType: true, costSubject: true } },
      taxes: true
    }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const costsForVersion = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { productType: true, costSubject: true } }) : [];
  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const effective = effectiveCostRows(costsForVersion, leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);

  const activeProducts = (version?.products || []).filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const productMap = new Map<string, ReturnType<typeof blankProduct>>();
  activeProducts.forEach((product) => productMap.set(product.id, blankProduct(product, taxObjectMap.get(product.id))));

  const revenueProductIds = new Set<string>((version?.revenues || []).map((row) => row.productTypeId).filter((id): id is string => Boolean(id)));
  activeProducts
    .filter((product) => product.isSaleable && !revenueProductIds.has(product.id))
    .forEach((product) => addRevenue(productMap.get(product.id)!, calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate)));
  (version?.revenues || []).forEach((row) => {
    const item = productMap.get(row.productTypeId);
    if (item) addRevenue(item, row);
  });
  (version?.commercialRevenueLines || []).forEach((row) => {
    const item = productMap.get(row.parentProductTypeId);
    if (item) addRevenue(item, row);
  });

  effective.effective.forEach((row) => {
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    const region = row.regionOrProductType || '';
    const matched = directProduct ? [directProduct] : activeProducts.filter((product) => regionMatchesProduct(region, product));
    const pool = matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入']) ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
    const bases = pool.map((product) => ({ product, base: allocationBase(product, row.allocationMethod) }));
    const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || pool.length || 1;
    bases.forEach(({ product, base }) => {
      const item = productMap.get(product.id);
      if (!item) return;
      const ratio = totalBase ? base / totalBase : 1 / pool.length;
      const taxExclusive = n(row.taxExclusiveAmount || row.taxInclusiveAmount) * ratio;
      item.costExclusive += taxExclusive;
      item.costInclusive += n(row.taxInclusiveAmount) * ratio;
      item.inputVat += n(row.taxAmount) * ratio;
      if (row.costSubject.code.startsWith('01')) item.landCost += n(row.taxInclusiveAmount) * ratio;
      else if (row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')) item.devCost += taxExclusive;
      else if (row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')) item.saleManageFinance += taxExclusive;
    });
  });

  const productRows = Array.from(productMap.values()).filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive);
  const objectMap = new Map<string, any>();
  productRows.forEach((row) => {
    const current = objectMap.get(row.liquidationObject) || { liquidationObject: row.liquidationObject, rows: [], revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0 };
    current.rows.push(row);
    ['revenueExclusive', 'outputVat', 'inputVat', 'landCost', 'devCost', 'saleManageFinance'].forEach((key) => { current[key] += n((row as any)[key]); });
    objectMap.set(row.liquidationObject, current);
  });

  const clearingRows = Array.from(objectMap.values()).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const landVat = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    item.rows.forEach((row: ReturnType<typeof blankProduct>) => {
      const ratio = item.revenueExclusive ? row.revenueExclusive / item.revenueExclusive : (item.rows.length ? 1 / item.rows.length : 0);
      row.landVat = landVat.landVat * ratio;
    });
    return { ...item, payableVat, landVat };
  });

  const projectPayableVat = Math.max(revenue.outputVat - cost.inputVat, 0);
  const projectSurcharge = projectPayableVat * surchargeRate;
  const totalPositiveVatBase = productRows.reduce((sum, row) => sum + Math.max(row.outputVat - row.inputVat, 0), 0);
  const totalRevenueExclusive = productRows.reduce((sum, row) => sum + row.revenueExclusive, 0) || 1;

  productRows.forEach((row) => {
    const positiveVat = Math.max(row.outputVat - row.inputVat, 0);
    const surchargeRatio = totalPositiveVatBase ? positiveVat / totalPositiveVatBase : row.revenueExclusive / totalRevenueExclusive;
    row.surcharge = projectSurcharge * surchargeRatio;
    row.profitBeforeIncomeTax = row.revenueExclusive - row.costExclusive - row.surcharge - row.landVat;
  });

  const formalLandVat = productRows.reduce((sum, row) => sum + row.landVat, 0);
  const formalProfitBeforeIncomeTax = revenue.taxExclusive - cost.taxExclusive - projectSurcharge - formalLandVat;
  const formalIncomeTax = Math.max(formalProfitBeforeIncomeTax * incomeTaxRate, 0);
  const positiveProfitBase = productRows.reduce((sum, row) => sum + Math.max(row.profitBeforeIncomeTax, 0), 0);
  productRows.forEach((row) => {
    const incomeTaxRatio = positiveProfitBase ? Math.max(row.profitBeforeIncomeTax, 0) / positiveProfitBase : row.revenueExclusive / totalRevenueExclusive;
    row.incomeTax = formalIncomeTax * incomeTaxRatio;
    row.netProfit = row.profitBeforeIncomeTax - row.incomeTax;
  });

  const netProfit = formalProfitBeforeIncomeTax - formalIncomeTax;
  const netMargin = revenue.taxInclusive ? netProfit / revenue.taxInclusive : 0;
  const productNetProfitTotal = productRows.reduce((sum, row) => sum + row.netProfit, 0);
  const productIncomeTaxTotal = productRows.reduce((sum, row) => sum + row.incomeTax, 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">业态利润分析</p><h1 className="title">{project.name}</h1><p className="subtitle">按正式税务链路展示：收入、分摊成本、正式土增税、所得税和税后净利。金额单位：万元。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/tax-details`} className="btn btn-primary">税费测算总表</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土增税清算</Link><Link href={`/projects/${project.id}/tax-report`} className="btn">税务报告</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入</div><div className="stat-value">{fmt(revenue.taxExclusive)}</div></div><div className="stat"><div className="stat-label">不含税成本</div><div className="stat-value">{fmt(cost.taxExclusive)}</div></div><div className="stat"><div className="stat-label">正式土增税</div><div className="stat-value">{fmt(formalLandVat)}</div></div><div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value" style={{ color: color(netMargin) }}>{pct(netMargin)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>项目利润口径</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}><tbody>{[['不含税收入（万元）', revenue.taxExclusive], ['不含税成本及费用（万元）', cost.taxExclusive], ['应缴增值税（万元）', projectPayableVat], ['附加税费（万元）', projectSurcharge], ['正式土地增值税（万元）', formalLandVat], ['所得税前利润（万元）', formalProfitBeforeIncomeTax], ['企业所得税（万元）', formalIncomeTax], ['税后净利（万元）', netProfit], ['销售净利率', pct(netMargin)]].map(([name, value]) => <tr key={String(name)}><td style={{ ...cell, color: 'var(--muted)', fontWeight: 800 }}>{String(name)}</td><td style={{ ...money, fontWeight: 900, color: typeof value === 'number' ? color(value) : undefined }}>{typeof value === 'number' ? fmt(value) : String(value)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>按清算对象汇总</h2><p className="meta">土增税来自土地增值税清算测算表的正式对象口径。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['清算对象', '不含税收入', '扣除项目', '增值额', '增值率', '土增税'].map((h) => <th key={h} style={{ ...cell, textAlign: h === '清算对象' ? 'left' : 'right', color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{clearingRows.length ? clearingRows.map((row) => <tr key={row.liquidationObject}><td style={{ ...cell, fontWeight: 800 }}>{row.liquidationObject}</td><td style={money}>{fmt(row.revenueExclusive)}</td><td style={money}>{fmt(row.landVat.deductionTotal)}</td><td style={money}>{fmt(row.landVat.valueAdded)}</td><td style={money}>{pct(row.landVat.valueAddedRatio)}</td><td style={{ ...money, fontWeight: 900 }}>{fmt(row.landVat.landVat)}</td></tr>) : <tr><td colSpan={6} style={{ ...cell, color: 'var(--muted)' }}>暂无清算对象数据。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>业态利润表</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1320, borderCollapse: 'collapse' }}><thead><tr>{['业态', '清算对象', '可售/建筑面积', '不含税收入', '不含税成本', '进项税额', '附加税分摊', '土增税分摊', '所得税前利润', '所得税分摊', '税后净利', '销售净利率'].map((h) => <th key={h} style={{ ...cell, textAlign: ['业态', '清算对象'].includes(h) ? 'left' : 'right', color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{productRows.length ? productRows.map((row) => {
      const margin = row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0;
      const area = n(row.product.saleableArea || row.product.buildingArea);
      return <tr key={row.product.id}><td style={{ ...cell, fontWeight: 900 }}>{row.product.name}</td><td style={cell}>{row.liquidationObject}</td><td style={money}>{fmt(area)}</td><td style={money}>{fmt(row.revenueExclusive)}</td><td style={money}>{fmt(row.costExclusive)}</td><td style={money}>{fmt(row.inputVat)}</td><td style={money}>{fmt(row.surcharge)}</td><td style={money}>{fmt(row.landVat)}</td><td style={{ ...money, color: color(row.profitBeforeIncomeTax), fontWeight: 900 }}>{fmt(row.profitBeforeIncomeTax)}</td><td style={money}>{fmt(row.incomeTax)}</td><td style={{ ...money, color: color(row.netProfit), fontWeight: 900 }}>{fmt(row.netProfit)}</td><td style={{ ...money, color: color(margin), fontWeight: 900 }}>{pct(margin)}</td></tr>;
    }) : <tr><td colSpan={12} style={{ ...cell, color: 'var(--muted)' }}>暂无业态数据。</td></tr>}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>一致性校验</h2><div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}><div><b>业态税后净利合计</b><p className="meta">{fmt(productNetProfitTotal)} 万元</p></div><div><b>项目税后净利</b><p className="meta">{fmt(netProfit)} 万元</p></div><div><b>所得税分摊合计</b><p className="meta">{fmt(productIncomeTaxTotal)} 万元 / 项目 {fmt(formalIncomeTax)} 万元</p></div></div></section>
  </div></main>;
}
