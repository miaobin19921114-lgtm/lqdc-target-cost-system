import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { effectiveCostRows, isChargingProductName, isCommercialRevenueProductName, isOtherRevenueProductName, isParkingProductName, landVatSummary, n } from '@/lib/tax-summary';
import { getCostSettings } from '@/lib/cost-product-settings';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; }
function includes(text: string | null | undefined, words: string[]) { const value = text || ''; return words.some((word) => value.includes(word)); }
function methodName(method: string | null | undefined) { return method || '按可售面积占比'; }

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

function objectName(product: any) {
  if (product.id === 'other-income') return '项目其他收入';
  if (!product.isSaleable) return '不可售/配套';
  if (includes(product.name, ['车位', '车库', '地库'])) return '车位';
  if (includes(product.name, ['商业', '底商', '商铺'])) return '商业';
  return '住宅';
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

function blankItem(product: any, costGroup = '') {
  return { product, costGroup, revenueInclusive: 0, revenueExclusive: 0, outputVat: 0, costInclusive: 0, costExclusive: 0, inputVat: 0, landCost: 0, devCost: 0, saleManageFinance: 0, directCost: 0, groupCost: 0, sharedCost: 0 };
}

function addRevenue(target: ReturnType<typeof blankItem>, row: { taxInclusiveRevenue: unknown; taxExclusiveRevenue: unknown; taxAmount: unknown }) {
  target.revenueInclusive += n(row.taxInclusiveRevenue);
  target.revenueExclusive += n(row.taxExclusiveRevenue);
  target.outputVat += n(row.taxAmount);
}

export default async function ProfitAnalysisPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: {
      products: { orderBy: { name: 'asc' } },
      costs: { include: { costSubject: true, productType: true } },
      taxes: true,
      revenues: { include: { productType: true } },
      commercialRevenueLines: true,
      otherRevenueLines: true
    }
  });

  const taxParam = version?.taxes;
  const vatRate = n(taxParam?.vatRate || 0.09);
  const surchargeRate = n(taxParam?.urbanMaintenanceRate || 0.07) + n(taxParam?.educationSurchargeRate || 0.03) + n(taxParam?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(taxParam?.corporateIncomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set<string>(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const activeProducts = (version?.products || []).filter((item) => item.isActive);
  const allocationProducts = activeProducts.filter((item) => item.participateAllocation);
  const saleableAllocationProducts = allocationProducts.filter((item) => item.isSaleable);

  const productMap = new Map<string, ReturnType<typeof blankItem>>();
  activeProducts.forEach((product) => productMap.set(product.id, blankItem(product, productCostGroupName(product))));

  const revenueProductIds = new Set<string>((version?.revenues || []).map((row) => row.productTypeId).filter((id): id is string => Boolean(id)));
  activeProducts
    .filter((product) => product.isSaleable && !isParkingProductName(product.name) && !isChargingProductName(product.name) && !isOtherRevenueProductName(product.name) && !isCommercialRevenueProductName(product.name) && !revenueProductIds.has(product.id))
    .forEach((product) => addRevenue(productMap.get(product.id)!, calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate)));
  (version?.revenues || []).forEach((row) => {
    const target = productMap.get(row.productTypeId);
    if (target) addRevenue(target, row);
  });
  (version?.commercialRevenueLines || []).forEach((row) => {
    const target = productMap.get(row.parentProductTypeId);
    if (target) addRevenue(target, row);
  });
  const otherRevenue = blankItem({ id: 'other-income', name: '项目其他收入', isSaleable: false, saleableArea: 0, buildingArea: 0 }, '项目整体共用');
  (version?.otherRevenueLines || []).forEach((row) => addRevenue(otherRevenue, row));

  effective.effective.forEach((row) => {
    const directProduct = row.productTypeId ? allocationProducts.find((product) => product.id === row.productTypeId) : null;
    let pool: any[] = [];
    let type: 'direct' | 'group' | 'shared' = 'shared';
    const region = row.regionOrProductType || '';

    if (directProduct) {
      pool = [directProduct];
      type = 'direct';
    } else {
      const matched = allocationProducts.filter((product) => regionMatchesProduct(region, product));
      if (matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入'])) {
        pool = matched;
        type = 'group';
      } else {
        pool = saleableAllocationProducts.length ? saleableAllocationProducts : allocationProducts;
      }
    }

    const bases = pool.map((product) => ({ product, base: allocationBase(product, methodName(row.allocationMethod)) }));
    const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || pool.length || 1;
    bases.forEach(({ product, base }) => {
      const item = productMap.get(product.id);
      if (!item) return;
      const ratio = totalBase ? base / totalBase : 1 / pool.length;
      const inclusive = n(row.taxInclusiveAmount) * ratio;
      const exclusive = n(row.taxExclusiveAmount || row.taxInclusiveAmount) * ratio;
      const tax = n(row.taxAmount) * ratio;
      item.costInclusive += inclusive;
      item.costExclusive += exclusive;
      item.inputVat += tax;
      if (type === 'direct') item.directCost += inclusive;
      else if (type === 'group') item.groupCost += inclusive;
      else item.sharedCost += inclusive;
      if (row.costSubject.code.startsWith('01')) item.landCost += n(row.taxInclusiveAmount) * ratio;
      else if (row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')) item.devCost += exclusive;
      else if (row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')) item.saleManageFinance += exclusive;
    });
  });

  const rows = [...Array.from(productMap.values()), otherRevenue].filter((item) => item.revenueInclusive || item.costInclusive || item.product.isActive).map((item) => {
    const payableVat = Math.max(item.outputVat - item.inputVat, 0);
    const surcharge = payableVat * surchargeRate;
    const landVat = landVatSummary({ revenueExclusive: item.revenueExclusive, outputVat: payableVat, landCost: item.landCost, devCost: item.devCost, saleManageFinance: item.saleManageFinance, surchargeRate });
    const profitBeforeIncomeTax = item.revenueExclusive - item.costExclusive - surcharge - landVat.landVat;
    const incomeTax = Math.max(profitBeforeIncomeTax * incomeTaxRate, 0);
    const netProfit = profitBeforeIncomeTax - incomeTax;
    return { ...item, payableVat, surcharge, landVat: landVat.landVat, valueAddedRatio: landVat.valueAddedRatio, profitBeforeIncomeTax, incomeTax, netProfit };
  });

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenueInclusive, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.costInclusive, 0);
  const totalPreTax = rows.reduce((sum, row) => sum + row.profitBeforeIncomeTax, 0);
  const totalNet = rows.reduce((sum, row) => sum + row.netProfit, 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1520 }}>
    <div className="page-header"><div><p className="eyebrow">业态经营利润测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">按业态收入与成本归属设置后的分摊成本计算利润；销售业态不等于工程成本对象，地下车位、储藏室、物业社区等按成本分摊页同口径处理。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-allocation`} className="btn btn-primary">成本分摊</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土增税</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税收入</div><div className="stat-value">{fmt(totalRevenue)}</div></div><div className="stat"><div className="stat-label">含税成本</div><div className="stat-value">{fmt(totalCost)}</div></div><div className="stat"><div className="stat-label">税前利润</div><div className="stat-value">{fmt(totalPreTax)}</div></div><div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value">{pct(totalRevenue ? totalNet / totalRevenue : 0)}</div></div></div>
    <section className="card"><h2>业态利润明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1850, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本归属组', '成本对象', '可售面积', '含税收入', '不含税收入', '含税成本', '不含税成本', '直接成本', '归属组成本', '共同分摊', '应缴增值税', '附加税', '土增税', '增值率', '税前利润', '所得税', '税后净利', '净利率', '可售单方成本'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.product.id}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.product.name}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.costGroup}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{objectName(row.product)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.product.saleableArea)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueExclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.costInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.costExclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.directCost)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.groupCost)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.sharedCost)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.payableVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.surcharge)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.landVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.valueAddedRatio)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.profitBeforeIncomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.incomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 900, color: row.netProfit >= 0 ? '#2f9e44' : '#e03131' }}>{fmt(row.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(n(row.product.saleableArea) ? row.costInclusive / n(row.product.saleableArea) : 0)}</td></tr>) : <tr><td colSpan={20} style={{ padding: 12, color: 'var(--muted)' }}>暂无启用业态或可分摊成本。</td></tr>}</tbody></table></div></section>
  </div></main>;
}
