import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';
import { buildProjectAllocationRuleMap, readProjectAllocationMethod } from '@/lib/project-allocation-rule-reader';

export const dynamic = 'force-dynamic';

const cell = { padding: 9, borderBottom: '1px solid var(--border)' };
const money = { ...cell, textAlign: 'right' as const };

type ReportLine = [string, number | string, string];

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
  return !region || region.includes('全项目') || region.includes('项目整体') || region.includes('Excel导入') || region === productName || region === costGroup || region.includes(productName) || productName.includes(region) || region.includes(costGroup) || costGroup.includes(region);
}

function blankObject(product: any, costGroup = '') {
  return { product, costGroup, revenueInclusive: 0, revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0, costExclusive: 0 };
}

function addRevenue(target: ReturnType<typeof blankObject>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

function statusColor(value: number) {
  return value >= 0 ? '#2f9e44' : '#e03131';
}

function riskColor(level: string) {
  return level === '高' ? '#e03131' : level === '中' ? '#f08c00' : '#2f9e44';
}

export default async function TaxReportPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true, products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

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
    const method = readProjectAllocationMethod(row.costSubject.code, row.allocationMethod, ruleMap, 'landVat') || row.allocationMethod;
    const directProduct = row.productTypeId ? activeProducts.find((product) => product.id === row.productTypeId) : null;
    const region = row.regionOrProductType || '';
    const matched = directProduct ? [directProduct] : activeProducts.filter((product) => regionMatchesProduct(region, product));
    const pool = matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入']) ? matched : (saleableProducts.length ? saleableProducts : activeProducts);
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

  const productRows = Array.from(objectMap.values()).filter((item) => item.product.isSaleable || item.revenueInclusive || item.costExclusive).map((item) => ({
    ...item,
    liquidationObject: getTaxLiquidationObject({ name: item.product.name, isSaleable: item.product.isSaleable, taxLiquidationObject: taxObjectMap.get(item.product.id) })
  }));

  const groupMap = new Map<string, any>();
  productRows.forEach((row) => {
    const current = groupMap.get(row.liquidationObject) || { liquidationObject: row.liquidationObject, productNames: [], revenueExclusive: 0, outputVat: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0, costExclusive: 0 };
    current.productNames.push(row.product.name);
    ['revenueExclusive', 'outputVat', 'inputVat', 'landCost', 'devCost', 'saleManageFinance', 'costExclusive'].forEach((key) => { current[key] += n((row as any)[key]); });
    groupMap.set(row.liquidationObject, current);
  });

  const clearingRows = Array.from(groupMap.values()).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    return { ...item, landVat: lv };
  });

  const formalLandVat = clearingRows.reduce((sum, item) => sum + item.landVat.landVat, 0);
  const formalProfitBeforeIncomeTax = revenue.taxExclusive - cost.taxExclusive - quickTax.surcharge - formalLandVat;
  const formalIncomeTax = Math.max(formalProfitBeforeIncomeTax * incomeTaxRate, 0);
  const netProfit = formalProfitBeforeIncomeTax - formalIncomeTax;
  const formalTotalTax = quickTax.payableVat + quickTax.surcharge + formalLandVat + formalIncomeTax;
  const salesNetMargin = revenue.taxInclusive ? netProfit / revenue.taxInclusive : 0;
  const taxBurden = revenue.taxInclusive ? formalTotalTax / revenue.taxInclusive : 0;
  const inputCoverage = revenue.outputVat ? cost.inputVat / revenue.outputVat : 0;

  const reportLines: ReportLine[] = [
    ['含税总收入（万元）', revenue.taxInclusive, '来自销售收入、商业收入、车位收入和其他收入。'],
    ['不含税总收入（万元）', revenue.taxExclusive, '按收入行税率剔除销项税后的经营收入。'],
    ['不含税成本及费用（万元）', cost.taxExclusive, '有效末级成本行不含税金额合计。'],
    ['应缴增值税（万元）', quickTax.payableVat, '销项税额减进项税额，小于0暂按0。'],
    ['附加税费（万元）', quickTax.surcharge, '按应缴增值税乘以附加税率。'],
    ['正式土增税（万元）', formalLandVat, '引用土地增值税清算测算表，按清算对象和土增税清算分摊规则分别计算后汇总。'],
    ['所得税前利润（万元）', formalProfitBeforeIncomeTax, '不含税收入减不含税成本、附加税费和正式土增税。'],
    ['企业所得税（万元）', formalIncomeTax, '按所得税前利润乘以所得税率测算，亏损时暂按0。'],
    ['税费合计（万元）', formalTotalTax, '增值税+附加税+正式土增税+企业所得税。'],
    ['税后净利（万元）', netProfit, '所得税前利润减企业所得税。'],
    ['销售净利率', pct(salesNetMargin), '税后净利除以含税总收入，仅用于经营测算展示。']
  ];

  const risks = [
    { name: '进项抵扣充分性', level: inputCoverage < 0.3 ? '高' : inputCoverage < 0.6 ? '中' : '低', text: `进项覆盖率 ${pct(inputCoverage)}，进项不足会推高增值税和附加税。` },
    { name: '土增税压力', level: formalLandVat > revenue.taxInclusive * 0.06 ? '高' : formalLandVat > revenue.taxInclusive * 0.03 ? '中' : '低', text: `正式土增税 ${fmt(formalLandVat)} 万元，来源于清算对象分别测算。` },
    { name: '所得税压力', level: formalIncomeTax > revenue.taxInclusive * 0.04 ? '高' : formalIncomeTax > revenue.taxInclusive * 0.02 ? '中' : '低', text: `企业所得税 ${fmt(formalIncomeTax)} 万元。` },
    { name: '综合税负', level: taxBurden > 0.12 ? '高' : taxBurden > 0.08 ? '中' : '低', text: `税费合计 ${fmt(formalTotalTax)} 万元，综合税负率 ${pct(taxBurden)}。` },
    { name: '利润承压', level: netProfit < 0 ? '高' : salesNetMargin < 0.05 ? '中' : '低', text: `税后净利 ${fmt(netProfit)} 万元，销售净利率 ${pct(salesNetMargin)}。` },
    { name: '数据口径', level: effective.importedLeafRows > 0 || effective.ignoredNonLeaf > 0 ? '中' : '低', text: `临时导入科目 ${effective.importedLeafRows} 行，非末级排除 ${effective.ignoredNonLeaf} 行。` }
  ];

  return <main className="print-report">
    <div className="no-print toolbar"><Link href={`/projects/${project.id}/tax-details`} className="btn btn-primary">税费测算总表</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土地增值税清算</Link><Link href={`/projects/${project.id}/report-print`} className="btn">经营报告打印版</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link><span className="btn">打印：Ctrl/Cmd + P</span></div>
    <section className="cover block"><div className="eyebrow">源信达地产目标成本测算系统</div><h1>{project.name}</h1><h2>税务测算报告</h2><p>当前版本：{version?.name || '当前版本'}　阶段：{version?.stage || '投拓阶段'}　城市/区域：{project.city || '-'} / {project.district || '-'}</p><div className="decision" style={{ color: statusColor(netProfit) }}>{netProfit >= 0 ? '税后盈利' : '税后亏损'}</div><p>税费合计 {fmt(formalTotalTax)} 万元，综合税负率 {pct(taxBurden)}，税后净利 {fmt(netProfit)} 万元</p></section>
    <section className="block"><h2>一、项目税费总览</h2><table><thead><tr><th>指标</th><th>金额/比例</th><th>口径说明</th></tr></thead><tbody>{reportLines.map(([name, value, remark]) => <tr key={name}><td>{name}</td><td style={{ fontWeight: 900 }}>{typeof value === 'number' ? fmt(value) : value}</td><td>{remark}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>二、土地增值税清算来源</h2><p>以下为土地增值税清算测算表的正式清算对象结果，税费测算总表引用该合计。</p><table><thead><tr><th>清算对象</th><th>包含业态</th><th>不含税收入</th><th>扣除项目</th><th>增值额</th><th>增值率</th><th>土增税</th></tr></thead><tbody>{clearingRows.length ? clearingRows.map((row) => <tr key={row.liquidationObject}><td>{row.liquidationObject}</td><td>{row.productNames.join('、')}</td><td>{fmt(row.revenueExclusive)} 万元</td><td>{fmt(row.landVat.deductionTotal)} 万元</td><td>{fmt(row.landVat.valueAdded)} 万元</td><td>{pct(row.landVat.valueAddedRatio)}</td><td>{fmt(row.landVat.landVat)} 万元</td></tr>) : <tr><td colSpan={7}>暂无清算对象数据。</td></tr>}</tbody></table></section>
    <section className="block"><h2>三、企业所得税测算说明</h2><p>企业所得税应纳税所得额 = 不含税收入 - 不含税成本及费用 - 附加税费 - 土地增值税。</p><table><tbody><tr><td>所得税前利润</td><td>{fmt(formalProfitBeforeIncomeTax)} 万元</td></tr><tr><td>所得税率</td><td>{fmt(incomeTaxRate * 100)}%</td></tr><tr><td>企业所得税</td><td>{fmt(formalIncomeTax)} 万元</td></tr><tr><td>税后净利</td><td>{fmt(netProfit)} 万元</td></tr></tbody></table></section>
    <section className="block"><h2>四、税务风险提示</h2><table><thead><tr><th>风险项</th><th>等级</th><th>说明</th></tr></thead><tbody>{risks.map((risk) => <tr key={risk.name}><td>{risk.name}</td><td style={{ color: riskColor(risk.level), fontWeight: 900 }}>{risk.level}</td><td>{risk.text}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>五、复核与签批区</h2><table><tbody><tr><td>复核结论</td><td>□ 通过　□ 需调整　□ 暂缓</td></tr><tr><td>需复核事项</td><td>□ 进项税　□ 土增税扣除　□ 所得税成本对象　□ 发票口径　□ 分摊规则</td></tr><tr><td>税务复核人</td><td></td></tr><tr><td>复核日期</td><td></td></tr><tr><td>备注</td><td style={{ height: 80 }}></td></tr></tbody></table></section>
    <style>{`.print-report{max-width:980px;margin:0 auto;padding:24px;background:#fff;color:#111;font-family:Arial,'Microsoft YaHei',sans-serif}.toolbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:16px;flex-wrap:wrap}.block{border:1px solid #d9e2ec;border-radius:12px;padding:18px;margin-bottom:16px;break-inside:avoid}.cover{text-align:center;padding:42px 24px}.cover h1{font-size:34px;margin:12px 0}.cover h2{font-size:22px;margin:8px 0;color:#334155}.eyebrow{font-size:12px;letter-spacing:.12em;color:#64748b;font-weight:800}.decision{font-size:34px;font-weight:900;margin-top:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left}td:first-child{font-weight:800;color:#334155}@media print{.no-print,nav,header{display:none!important}.print-report{max-width:100%;padding:0}.block{box-shadow:none;border-color:#ddd}.cover{min-height:420px;display:flex;flex-direction:column;justify-content:center}}`}</style>
  </main>;
}
