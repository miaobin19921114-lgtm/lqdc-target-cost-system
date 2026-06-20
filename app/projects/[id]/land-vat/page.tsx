import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, landVatSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { getCostSettings } from '@/lib/cost-product-settings';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';

export const dynamic = 'force-dynamic';

type ProcessRow = [string, number, string];

const cell = { padding: 9, borderBottom: '1px solid var(--border)' };
const moneyCell = { ...cell, textAlign: 'right' as const };

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

function liquidationObjectName(product: any) {
  if (!product.isSaleable) return '不可售/配套';
  if (includes(product.name, ['车位', '车库', '地下'])) return '非住宅-车位';
  if (includes(product.name, ['商业', '底商', '商铺', '办公', '公寓'])) return '非住宅';
  if (includes(product.name, ['140', '大户型', '改善'])) return '非普通住宅＞140㎡';
  return '普通住宅≤140㎡';
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

  const costLines = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id },
    include: { costSubject: true, productType: true }
  }) : [];

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    select: { costCode: true }
  });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(costLines, leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const disabledProducts = (version?.products || []).filter((item) => !item.isActive).length;
  const activeProducts = (version?.products || []).filter((item) => item.isActive && item.participateAllocation);
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
    const lv = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    const surcharge = payableVat * surchargeRate;
    const taxableIncome = item.revenueExclusive - item.costExclusive - surcharge - lv.landVat;
    const incomeTax = Math.max(taxableIncome * incomeTaxRate, 0);
    const netProfit = taxableIncome - incomeTax;
    return { ...item, payableVat, landVat: lv, surcharge, taxableIncome, incomeTax, netProfit, liquidationObject: liquidationObjectName(item.product) };
  });

  const processRows: ProcessRow[] = [
    ['含税总收入', revenue.taxInclusive, '销售收入+商业专项收入+车位收入+其他收入'],
    ['不含税总收入', revenue.taxExclusive, '销售收入剔除销项税'],
    ['土地成本', cost.landCost, '土地成本，暂按含税金额进入土增税扣除'],
    ['开发成本', cost.devCost, '前期+建安，按不含税成本进入土增税扣除'],
    ['销售/管理/财务费用', cost.saleManageFinance, '期间费用，清算口径后续可继续细化'],
    ['税金及附加', tax.landVat.taxAndSurcharge, '按应缴增值税×附加税率测算'],
    ['加计扣除', tax.landVat.additionalDeduction, '土地成本+开发成本的20%'],
    ['扣除项目合计', tax.landVat.deductionTotal, '自动汇总'],
    ['增值额', tax.landVat.valueAdded, '不含税收入-扣除项目'],
    ['增值率', tax.landVat.valueAddedRatio * 100, '增值额/扣除项目合计'],
    ['适用税率', tax.landVat.ladder.rate * 100, '四级超率累进'],
    ['速算扣除系数', tax.landVat.ladder.deduction * 100, '四级超率累进'],
    ['土地增值税', tax.landVat.landVat, '增值额×税率-扣除项目×速算扣除系数']
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1400 }}>
    <div className="page-header"><div><p className="eyebrow">土地增值税清算测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">金额单位统一为万元；按普通住宅≤140㎡、非普通住宅＞140㎡、非住宅、车位等清算对象展示。当前先按业态名称自动归类，后续可增加手动清算对象字段。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-allocation`} className="btn btn-primary">成本分摊</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税费测算总表</Link><Link href={`/projects/${project.id}/profit-analysis`} className="btn">业态利润</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {disabledProducts || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProducts} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">不含税收入（万元）</div><div className="stat-value">{fmt(revenue.taxExclusive)}</div></div><div className="stat"><div className="stat-label">扣除项目（万元）</div><div className="stat-value">{fmt(tax.landVat.deductionTotal)}</div></div><div className="stat"><div className="stat-label">增值率</div><div className="stat-value">{fmt(tax.landVat.valueAddedRatio * 100)}%</div></div><div className="stat"><div className="stat-label">土增税（万元）</div><div className="stat-value">{fmt(tax.landVat.landVat)}</div></div></div>
    <section className="card" style={{ marginBottom: 18 }}><h2>按清算对象/业态测算</h2><p className="meta">按成本分摊表结果拆分，金额单位均为万元。住宅清算对象当前按业态名称暂估归类，后续可在业态维护中增加“清算对象类型”。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1640, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本归属组', '清算对象', '含税收入(万元)', '不含税收入(万元)', '分摊不含税成本(万元)', '扣除项目(万元)', '增值率', '土增税(万元)', '所得税应税所得(万元)', '所得税(万元)', '税后净利(万元)', '净利率'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{objectRows.length ? objectRows.map((row) => <tr key={row.product.id}><td style={{ ...cell, fontWeight: 800 }}>{row.product.name}</td><td style={cell}>{row.costGroup}</td><td style={cell}>{row.liquidationObject}</td><td style={moneyCell}>{fmt(row.revenueInclusive)}</td><td style={moneyCell}>{fmt(row.revenueExclusive)}</td><td style={moneyCell}>{fmt(row.costExclusive)}</td><td style={moneyCell}>{fmt(row.landVat.deductionTotal)}</td><td style={moneyCell}>{pct(row.landVat.valueAddedRatio)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.landVat.landVat)}</td><td style={moneyCell}>{fmt(row.taxableIncome)}</td><td style={moneyCell}>{fmt(row.incomeTax)}</td><td style={{ ...moneyCell, fontWeight: 800 }}>{fmt(row.netProfit)}</td><td style={cell}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td></tr>) : <tr><td colSpan={13} style={{ padding: 12, color: 'var(--muted)' }}>暂无可售业态，先维护业态指标。</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>项目整体土增税过程</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr>{['项目', '金额(万元)/比例', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{processRows.map(([name, value, remark]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{name.includes('率') || name.includes('系数') ? `${fmt(value)}%` : fmt(value)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{remark}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
