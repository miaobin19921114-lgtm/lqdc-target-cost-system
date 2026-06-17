import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { effectiveCostRows, landVatSummary, n } from '@/lib/tax-summary';

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

function objectName(product: any) {
  if (!product.isSaleable) return '不可售/配套';
  if (includes(product.name, ['车位', '车库', '地下'])) return '车位';
  if (includes(product.name, ['商业', '底商', '商铺'])) return '商业';
  return '住宅';
}

function methodName(method: string | null | undefined) { return method || '按可售面积占比'; }

export default async function ProfitAnalysisPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: { orderBy: { name: 'asc' } }, costs: { include: { costSubject: true, productType: true } }, taxes: true }
  });

  const taxParam = version?.taxes;
  const vatRate = n(taxParam?.vatRate || 0.09);
  const surchargeRate = n(taxParam?.urbanMaintenanceRate || 0.07) + n(taxParam?.educationSurchargeRate || 0.03) + n(taxParam?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(taxParam?.corporateIncomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter(Boolean));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const products = (version?.products || []).filter((item) => item.isActive && item.participateAllocation);
  const saleableProducts = products.filter((item) => item.isSaleable);

  const productMap = new Map<string, { product: any; revenueInclusive: number; revenueExclusive: number; outputVat: number; costInclusive: number; costExclusive: number; inputVat: number; landCost: number; devCost: number; saleManageFinance: number; directCost: number; sharedCost: number }>();
  products.forEach((product) => {
    const revenue = product.isSaleable ? calculateRevenueLine(n(product.saleableArea), n(product.salePrice), vatRate) : { taxInclusiveRevenue: 0, taxExclusiveRevenue: 0, taxAmount: 0 };
    productMap.set(product.id, {
      product,
      revenueInclusive: revenue.taxInclusiveRevenue,
      revenueExclusive: revenue.taxExclusiveRevenue,
      outputVat: revenue.taxAmount,
      costInclusive: 0,
      costExclusive: 0,
      inputVat: 0,
      landCost: 0,
      devCost: 0,
      saleManageFinance: 0,
      directCost: 0,
      sharedCost: 0
    });
  });

  effective.effective.forEach((row) => {
    const directProduct = row.productTypeId ? products.find((product) => product.id === row.productTypeId) : null;
    const isDirect = Boolean(directProduct);
    let pool: any[] = [];
    if (directProduct) {
      pool = [directProduct];
    } else {
      const matched = products.filter((product) => {
        const region = row.regionOrProductType || '';
        if (!region || region.includes('全项目') || region.includes('项目整体') || region.includes('Excel导入')) return true;
        return region.includes(product.name) || product.name.includes(region) || (region.includes('地下') && product.name.includes('地下')) || (region.includes('车位') && product.name.includes('车位'));
      });
      pool = matched.length ? matched : (saleableProducts.length ? saleableProducts : products);
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
      if (isDirect) item.directCost += inclusive;
      else item.sharedCost += inclusive;
      if (row.costSubject.code.startsWith('01')) item.landCost += n(row.taxInclusiveAmount) * ratio;
      else if (row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')) item.devCost += exclusive;
      else if (row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')) item.saleManageFinance += exclusive;
    });
  });

  const rows = Array.from(productMap.values()).map((item) => {
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

  return <main className="page"><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">业态经营利润测算表</p><h1 className="title">{project.name}</h1><p className="subtitle">按业态/成本对象汇总收入、分摊成本、税金、税前利润、所得税和税后净利；与成本分摊、土增税、税金明细同口径。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/cost-allocation`} className="btn btn-primary">成本分摊</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土增税</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
    {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税收入</div><div className="stat-value">{fmt(totalRevenue)}</div></div><div className="stat"><div className="stat-label">含税成本</div><div className="stat-value">{fmt(totalCost)}</div></div><div className="stat"><div className="stat-label">税前利润</div><div className="stat-value">{fmt(totalPreTax)}</div></div><div className="stat"><div className="stat-label">税后净利率</div><div className="stat-value">{pct(totalRevenue ? totalNet / totalRevenue : 0)}</div></div></div>
    <section className="card"><h2>业态利润明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1700, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['业态', '成本对象', '可售面积', '含税收入', '不含税收入', '含税成本', '不含税成本', '直接成本', '共同分摊', '应缴增值税', '附加税', '土增税', '增值率', '税前利润', '所得税', '税后净利', '净利率', '可售单方成本'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.product.id}><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.product.name}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{objectName(row.product)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.product.saleableArea)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.revenueInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.revenueExclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.costInclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.costExclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.directCost)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.sharedCost)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.payableVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.surcharge)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.landVat)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.valueAddedRatio)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.profitBeforeIncomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.incomeTax)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 900, color: row.netProfit >= 0 ? '#2f9e44' : '#e03131' }}>{fmt(row.netProfit)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{pct(row.revenueInclusive ? row.netProfit / row.revenueInclusive : 0)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(n(row.product.saleableArea) ? row.costInclusive / n(row.product.saleableArea) : 0)}</td></tr>) : <tr><td colSpan={18} style={{ padding: 12, color: 'var(--muted)' }}>暂无启用业态或可分摊成本。</td></tr>}</tbody></table></div></section>
  </div></main>;
}
