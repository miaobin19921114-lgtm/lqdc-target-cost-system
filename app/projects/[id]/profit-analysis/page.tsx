import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { getProjectVersionRevenueLines } from '@/lib/project-version-revenue-lines';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { costTotals, effectiveCostRows, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { buildProjectAllocationRuleMap, readProjectAllocationMethod } from '@/lib/project-allocation-rule-reader';

export const dynamic = 'force-dynamic';

const cell = { padding: 10, borderBottom: '1px solid var(--border)' };
const money = { ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const };

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function color(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function includes(text: string | null | undefined, words: string[]) { const value = text || ''; return words.some((word) => value.includes(word)); }

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
  return !region || includes(region, ['全项目', '项目整体', 'Excel导入']) || region === productName || region === costGroup || region.includes(productName) || productName.includes(region) || region.includes(costGroup) || costGroup.includes(region);
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
    netProfit: 0,
    incomeTaxBase: 0
  };
}

function addRevenue(target: ReturnType<typeof blankProduct>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

function allocateCostToProducts(args: {
  row: any;
  products: any[];
  method: string | null | undefined;
  onShare: (product: any, ratio: number) => void;
}) {
  const bases = args.products.map((product) => ({ product, base: allocationBase(product, args.method) }));
  const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || args.products.length || 1;
  bases.forEach(({ product, base }) => args.onShare(product, totalBase ? base / totalBase : 1 / args.products.length));
}

export default async function ProfitAnalysisPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: project.activeVersionId ? { id: project.activeVersionId, projectId: params.id } : { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, revenues: { include: { productType: true } }, taxes: true }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(version?.id);

  const costsForVersion = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { productType: true, costSubject: true } }) : [];
  const projectRules = version ? await prisma.projectCostRule.findMany({ where: { projectVersionId: version.id }, select: { costCode: true, allocationMethod: true, remark: true } }) : [];
  const ruleMap = buildProjectAllocationRuleMap(projectRules);
  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const effective = effectiveCostRows(costsForVersion, leafCodes);
  const activeProducts = (version?.products || []).filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
  const productMap = new Map<string, ReturnType<typeof blankProduct>>();
  activeProducts.forEach((product) => productMap.set(product.id, blankProduct(product, taxObjectMap.get(product.id))));

  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines, otherRevenueLines, vatRate });
  const cost = costTotals(effective.effective);
  const revenueProductIds = new Set<string>((version?.revenues || []).map((row) => row.productTypeId).filter((id): id is string => Boolean(id)));
  activeProducts.filter((product) => product.isSaleable && !revenueProductIds.has(product.id)).forEach((product) => addRevenue(productMap.get(product.id)!, calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate)));
  (version?.revenues || []).forEach((row) => { const item = productMap.get(row.productTypeId); if (item) addRevenue(item, row); });
  commercialRevenueLines.forEach((row) => { const item = productMap.get(row.parentProductTypeId); if (item) addRevenue(item, row); });

  effective.effective.forEach((row) => {
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    const region = row.regionOrProductType || '';
    const matched = directProduct ? [directProduct] : activeProducts.filter((product) => regionMatchesProduct(region, product));
    const pool = matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入']) ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
    const operatingMethod = readProjectAllocationMethod(row.costSubject.code, row.allocationMethod, ruleMap, 'operating') || row.allocationMethod;
    const incomeTaxMethod = readProjectAllocationMethod(row.costSubject.code, row.allocationMethod, ruleMap, 'incomeTax') || operatingMethod;
    allocateCostToProducts({ row, products: pool, method: operatingMethod, onShare: (product, ratio) => {
      const item = productMap.get(product.id);
      if (!item) return;
      const taxExclusive = n(row.taxExclusiveAmount || row.taxInclusiveAmount) * ratio;
      item.costExclusive += taxExclusive;
      item.costInclusive += n(row.taxInclusiveAmount) * ratio;
      item.inputVat += n(row.taxAmount) * ratio;
      if (row.costSubject.code.startsWith('01')) item.landCost += n(row.taxInclusiveAmount) * ratio;
      else if (row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')) item.devCost += taxExclusive;
      else if (row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')) item.saleManageFinance += taxExclusive;
    } });
    allocateCostToProducts({ row, products: pool, method: incomeTaxMethod, onShare: (product, ratio) => {
      const item = productMap.get(product.id);
      if (item) item.incomeTaxBase += n(row.taxExclusiveAmount || row.taxInclusiveAmount) * ratio;
    } });
  });

  const productRows = Array.from(productMap.values()).filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive);
  const objectMap = new Map<string, any>();
  productRows.forEach((row) => {
    const current = objectMap.get(row.liquidationObject) || { liquidationObject: row.liquidationObject, rows: [], revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0 };
    current.rows.push(row);
    ['revenueExclusive', 'outputVat', 'inputVat', 'landCost', 'devCost', 'saleManageFinance'].forEach((key) => { current[key] += n((row as any)[key]); });
    objectMap.set(row.liquidationObject, current);
  });

  Array.from(objectMap.values()).forEach((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const landVat = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    item.rows.forEach((row: ReturnType<typeof blankProduct>) => {
      const ratio = item.revenueExclusive ? row.revenueExclusive / item.revenueExclusive : (item.rows.length ? 1 / item.rows.length : 0);
      row.landVat = landVat.landVat * ratio;
    });
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
  const totalIncomeTaxBase = productRows.reduce((sum, row) => sum + Math.max(row.incomeTaxBase, 0), 0);
  productRows.forEach((row) => {
    const incomeTaxRatio = totalIncomeTaxBase ? Math.max(row.incomeTaxBase, 0) / totalIncomeTaxBase : row.revenueExclusive / totalRevenueExclusive;
    row.incomeTax = formalIncomeTax * incomeTaxRatio;
    row.netProfit = row.profitBeforeIncomeTax - row.incomeTax;
  });

  const netProfit = formalProfitBeforeIncomeTax - formalIncomeTax;
  const netMargin = revenue.taxInclusive ? netProfit / revenue.taxInclusive : 0;
  const productNetProfitTotal = productRows.reduce((sum, row) => sum + row.netProfit, 0);
  const productIncomeTaxTotal = productRows.reduce((sum, row) => sum + row.incomeTax, 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">业态利润分析</p><h1 className="title">{project.name}</h1><p className="subtitle">成本分摊读取经营分摊规则，所得税拆分读取所得税成本对象规则。金额单位：万元。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/tax-details`} className="btn btn-primary">税费测算总表</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土地增值税清算测算表</Link><Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入</div><div className="stat-value">{fmt(revenue.taxExclusive)}</div></div><div className="stat"><div className="stat-label">不含税成本</div><div className="stat-value">{fmt(cost.taxExclusive)}</div></div><div className="stat"><div className="stat-label">正式土地增值税</div><div className="stat-value">{fmt(formalLandVat)}</div></div><div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value" style={{ color: color(netMargin) }}>{pct(netMargin)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>项目利润口径</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}><tbody>{[['不含税收入（万元）', revenue.taxExclusive], ['不含税成本（万元）', cost.taxExclusive], ['增值税附加（万元）', projectSurcharge], ['土地增值税（万元）', formalLandVat], ['所得税前利润（万元）', formalProfitBeforeIncomeTax], ['企业所得税（万元）', formalIncomeTax], ['税后净利润（万元）', netProfit]].map(([name, value]) => <tr key={String(name)}><td style={cell}>{name}</td><td style={{ ...money, fontWeight: 900, color: String(name).includes('利润') ? color(Number(value)) : undefined }}>{fmt(value)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>业态利润明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1560, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本归属组', '清算对象', '不含税收入', '不含税成本', '收入毛利', '附加税', '土地增值税', '所得税分摊基数', '所得税', '税后净利', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{productRows.map((row) => <tr key={row.product.id}><td style={{ ...cell, fontWeight: 800 }}>{row.product.name}</td><td style={cell}>{row.costGroup}</td><td style={cell}>{row.liquidationObject}</td><td style={money}>{fmt(row.revenueExclusive)}</td><td style={money}>{fmt(row.costExclusive)}</td><td style={money}>{fmt(row.revenueExclusive - row.costExclusive)}</td><td style={money}>{fmt(row.surcharge)}</td><td style={money}>{fmt(row.landVat)}</td><td style={money}>{fmt(row.incomeTaxBase)}</td><td style={money}>{fmt(row.incomeTax)}</td><td style={{ ...money, fontWeight: 900, color: color(row.netProfit) }}>{fmt(row.netProfit)}</td><td style={cell}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>)}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>校验</h2><p className="meta">业态所得税合计：{fmt(productIncomeTaxTotal)} 万元；业态净利合计：{fmt(productNetProfitTotal)} 万元。与项目口径有差异时优先复核成本分摊、税金测算和土地增值税页面。</p></section>
  </div></main>;
}
