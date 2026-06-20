import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { effectiveCostRows, n } from '@/lib/tax-summary';
import { getTaxLiquidationObject } from '@/lib/tax-liquidation-object';
import { getProductTaxLiquidationObjectMap } from '@/lib/product-tax-liquidation-object-values';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import {
  allocationBase,
  incomeTaxCostObjectName,
  includes,
  productCostGroupName,
  regionMatchesProduct,
  resolveAllocationRule,
  rowAttributionType,
  type AllocationDictionaryRow
} from '@/lib/cost-allocation-rules';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function taxObjectName(product: any, taxObjectMap: Map<string, string | null>) {
  return getTaxLiquidationObject({
    name: product.name,
    isSaleable: product.isSaleable,
    taxLiquidationObject: taxObjectMap.get(product.id)
  });
}

type ProductTotal = {
  product: any;
  costGroup: string;
  taxObject: string;
  incomeTaxObject: string;
  inclusive: number;
  exclusive: number;
  tax: number;
  directInclusive: number;
  groupInclusive: number;
  sharedInclusive: number;
  buildingArea: number;
  saleableArea: number;
};

function blankAggregate(name: string) {
  return { name, count: 0, inclusive: 0, exclusive: 0, tax: 0, directInclusive: 0, groupInclusive: 0, sharedInclusive: 0 };
}

export default async function CostAllocationPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: {
      products: { orderBy: { name: 'asc' } },
      costs: { include: { costSubject: true, productType: true } }
    }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);
  const costsForVersion = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { costSubject: true, productType: true } }) : [];
  const taxObjectMap = version ? await getProductTaxLiquidationObjectMap(version.id) : new Map<string, string | null>();

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    select: { costCode: true, targetAllocationMethod: true, landVatAllocationMethod: true, costAttributionMethod: true, incomeTaxDeductionCategory: true }
  });
  const leafCodes = new Set<string>(dictionaryRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const dictionaryByCode = new Map<string, AllocationDictionaryRow>(dictionaryRows.filter((row) => row.costCode).map((row) => [row.costCode!, row]));
  const allProducts = version?.products || [];
  const disabledProductCount = allProducts.filter((item) => !item.isActive).length;
  const products = allProducts.filter((item) => item.isActive && item.participateAllocation);
  const activeProducts = allProducts.filter((item) => item.isActive);
  const effective = effectiveCostRows(costsForVersion, leafCodes);
  const costs = effective.effective;
  const saleableProducts = products.filter((item) => item.isSaleable);
  const totalInclusiveCost = costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const totalExclusiveCost = costs.reduce((sum, row) => sum + n(row.taxExclusiveAmount), 0);
  const totalTax = costs.reduce((sum, row) => sum + n(row.taxAmount), 0);

  const productTotals = new Map<string, ProductTotal>();
  products.forEach((product) => productTotals.set(product.id, {
    product,
    costGroup: productCostGroupName(product),
    taxObject: taxObjectName(product, taxObjectMap),
    incomeTaxObject: incomeTaxCostObjectName(product),
    inclusive: 0,
    exclusive: 0,
    tax: 0,
    directInclusive: 0,
    groupInclusive: 0,
    sharedInclusive: 0,
    buildingArea: n(product.buildingArea),
    saleableArea: n(product.saleableArea)
  }));

  const rows: Array<{ code: string; subject: string; detail: string; region: string; type: string; operatingMethod: string; landVatMethod: string; incomeTaxMethod: string; ruleSource: string; inclusive: number; exclusive: number; tax: number; allocations: Record<string, { inclusive: number; exclusive: number; tax: number }> }> = [];
  let directRows = 0;
  let groupRows = 0;
  let sharedRows = 0;
  let fallbackRows = 0;

  costs.forEach((cost) => {
    const operatingRule = resolveAllocationRule(cost, dictionaryByCode, 'operating');
    const landVatRule = resolveAllocationRule(cost, dictionaryByCode, 'landVat');
    const incomeTaxRule = resolveAllocationRule(cost, dictionaryByCode, 'incomeTax');
    const directProduct = cost.productTypeId ? products.find((product) => product.id === cost.productTypeId) : null;
    const region = cost.regionOrProductType || '项目整体共用';
    let pool: any[] = [];

    if (directProduct) {
      pool = [directProduct];
    } else {
      const matched = products.filter((product) => regionMatchesProduct(region, product));
      if (matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入'])) {
        pool = matched;
      } else {
        pool = saleableProducts.length ? saleableProducts : products;
        if (!matched.length && !includes(region, ['全项目', '项目整体', 'Excel导入'])) fallbackRows += 1;
      }
    }

    const type = rowAttributionType(cost, pool.length, Boolean(directProduct));
    if (type === '直接归属业态') directRows += 1;
    else if (type === '成本归属分组') groupRows += 1;
    else sharedRows += 1;

    const bases = pool.map((product) => ({ product, base: allocationBase(product, operatingRule.method) }));
    const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || pool.length || 1;
    const inclusive = n(cost.taxInclusiveAmount);
    const exclusive = n(cost.taxExclusiveAmount);
    const tax = n(cost.taxAmount);
    const allocations: Record<string, { inclusive: number; exclusive: number; tax: number }> = {};

    bases.forEach(({ product, base }) => {
      const ratio = totalBase ? base / totalBase : 1 / pool.length;
      const value = { inclusive: inclusive * ratio, exclusive: exclusive * ratio, tax: tax * ratio };
      allocations[product.id] = value;
      const item = productTotals.get(product.id);
      if (item) {
        item.inclusive += value.inclusive;
        item.exclusive += value.exclusive;
        item.tax += value.tax;
        if (type === '直接归属业态') item.directInclusive += value.inclusive;
        else if (type === '成本归属分组') item.groupInclusive += value.inclusive;
        else item.sharedInclusive += value.inclusive;
      }
    });

    rows.push({
      code: cost.costSubject.code,
      subject: cost.description || cost.costSubject.fullPath || cost.costSubject.name,
      detail: cost.detailName,
      region,
      type,
      operatingMethod: operatingRule.method,
      landVatMethod: landVatRule.method,
      incomeTaxMethod: incomeTaxRule.method,
      ruleSource: operatingRule.source,
      inclusive,
      exclusive,
      tax,
      allocations
    });
  });

  const allocatedInclusive = Array.from(productTotals.values()).reduce((sum, item) => sum + item.inclusive, 0);
  const diff = totalInclusiveCost - allocatedInclusive;
  const costGroupCount = new Set(Array.from(productTotals.values()).map((item) => item.costGroup)).size;
  const ruleSourceTotals = new Map<string, number>();
  rows.forEach((row) => ruleSourceTotals.set(row.ruleSource, (ruleSourceTotals.get(row.ruleSource) || 0) + 1));
  const taxObjectTotals = new Map<string, ReturnType<typeof blankAggregate>>();
  const incomeTaxObjectTotals = new Map<string, ReturnType<typeof blankAggregate>>();
  Array.from(productTotals.values()).forEach((item) => {
    const targets = [
      [taxObjectTotals, item.taxObject],
      [incomeTaxObjectTotals, item.incomeTaxObject]
    ] as const;
    targets.forEach(([map, name]) => {
      const current = map.get(name) || blankAggregate(name);
      current.count += 1;
      current.inclusive += item.inclusive;
      current.exclusive += item.exclusive;
      current.tax += item.tax;
      current.directInclusive += item.directInclusive;
      current.groupInclusive += item.groupInclusive;
      current.sharedInclusive += item.sharedInclusive;
      map.set(name, current);
    });
  });

  const aggregateTable = (items: Array<ReturnType<typeof blankAggregate>>, firstTitle: string) => <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{[firstTitle, '业态数', '含税分摊成本', '不含税分摊成本', '进项税额', '直接归属', '归属组分摊', '共同分摊', '占比'].map((head) => <th key={head} style={{ textAlign: head === firstTitle ? 'left' : 'right', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{item.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{item.count}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800 }}>{fmt(item.inclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(item.exclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(item.tax)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(item.directInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(item.groupInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(item.sharedInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{pct(totalInclusiveCost ? item.inclusive / totalInclusiveCost : 0)}</td></tr>)}</tbody></table></div>;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1520 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">成本分摊测算表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">前端只展示结果；分摊方法优先读取项目调整，其次读取 V60/模板词典规则，再回退到标准科目或系统默认。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/product-maintenance`} className="btn btn-primary">业态维护</Link>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本编制</Link>
            <Link href={`/projects/${project.id}/land-vat`} className="btn">土地增值税</Link>
            <Link href={`/projects/${project.id}/tax-details`} className="btn">税费测算总表</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {disabledProductCount || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProductCount} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
        {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目，建议通过“导入科目映射”归入标准科目。</div> : null}
        {fallbackRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>有 {fallbackRows} 行成本未匹配到明确成本归属分组，已暂按共同成本分摊。建议回到业态维护或专业明细页检查“成本归属/区域”。</div> : null}
        {Math.abs(diff) > 1 ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffc9c9', background: '#fff5f5' }}>分摊差异 {fmt(diff)} 万元，请检查是否没有参与分摊的启用业态或分摊基数为 0。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">参与分摊业态</div><div className="stat-value">{products.length}/{activeProducts.length}</div></div>
          <div className="stat"><div className="stat-label">成本归属分组</div><div className="stat-value">{costGroupCount}</div></div>
          <div className="stat"><div className="stat-label">清算对象</div><div className="stat-value">{taxObjectTotals.size}</div></div>
          <div className="stat"><div className="stat-label">所得税对象</div><div className="stat-value">{incomeTaxObjectTotals.size}</div></div>
          <div className="stat"><div className="stat-label">模板规则行</div><div className="stat-value">{dictionaryRows.length}</div></div>
          <div className="stat"><div className="stat-label">分摊差异</div><div className="stat-value">{fmt(diff)}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>三套分摊视图</h2>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['视图', '主要用途', '优先读取规则', '下游引用'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody><tr><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>经营视角分摊</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>分业态目标成本、经营利润、单方成本</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>项目调整 → 模板经营规则 → 标准科目默认</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>目标成本分业态、业态利润</td></tr><tr><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>土增税清算分摊</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>按税务清算对象归集可扣除成本</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>项目调整 → 模板土增税规则 → 模板经营规则</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>土地增值税清算测算表</td></tr><tr><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>所得税成本对象分摊</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>按可售开发产品/成本对象归集税前成本</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>项目调整 → 模板所得税规则 → 成本归属规则</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>所得税、税后净利、业态利润</td></tr></tbody></table></div>
        </section>

        <section className="card" style={{ marginBottom: 18 }}><h2>一、经营视角分摊（分业态目标成本）</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1320, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['业态', '成本归属组', '税务清算对象', '所得税成本对象', '建筑面积', '可售面积', '含税分摊成本', '不含税分摊成本', '进项税额', '直接归属', '归属组分摊', '共同分摊', '建面单方', '可售单方', '占比'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{Array.from(productTotals.values()).map(({ product, costGroup, taxObject, incomeTaxObject, inclusive, exclusive, tax, directInclusive, groupInclusive, sharedInclusive, buildingArea, saleableArea }) => <tr key={product.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{product.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{costGroup}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{taxObject}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{incomeTaxObject}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(buildingArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(saleableArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(inclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(exclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(tax)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(directInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(groupInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(sharedInclusive)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(buildingArea ? inclusive / buildingArea : 0)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(saleableArea ? inclusive / saleableArea : 0)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(totalInclusiveCost ? inclusive / totalInclusiveCost : 0)}</td></tr>)}</tbody></table></div></section>

        <section className="card" style={{ marginBottom: 18 }}><h2>二、土增税清算分摊视图</h2><p className="meta">用于复核土增税扣除项目的上游成本口径。税务清算对象优先读取业态维护。</p>{aggregateTable(Array.from(taxObjectTotals.values()), '税务清算对象')}</section>

        <section className="card" style={{ marginBottom: 18 }}><h2>三、所得税成本对象分摊视图</h2><p className="meta">用于企业所得税和税后利润分析。可售产品按成本对象归集，不可售配套先归入公共成本对象。</p>{aggregateTable(Array.from(incomeTaxObjectTotals.values()), '所得税成本对象')}</section>

        <section className="card" style={{ marginBottom: 18 }}><h2>四、规则来源统计</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>{Array.from(ruleSourceTotals.entries()).map(([name, count]) => <div key={name}><span className="meta">{name}</span><div style={{ fontSize: 22, fontWeight: 900 }}>{count}</div></div>)}<div><span className="meta">直接归属成本行</span><div style={{ fontSize: 22, fontWeight: 900 }}>{directRows}</div></div><div><span className="meta">归属组成本行</span><div style={{ fontSize: 22, fontWeight: 900 }}>{groupRows}</div></div><div><span className="meta">共同分摊成本行</span><div style={{ fontSize: 22, fontWeight: 900 }}>{sharedRows}</div></div><div><span className="meta">未匹配暂分摊行</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fallbackRows}</div></div><div><span className="meta">进项税额</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalTax)}</div></div><div><span className="meta">用于所得税成本</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalExclusiveCost)}</div></div></div></section>

        <section className="card"><h2>五、成本行分摊明细</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: Math.max(1700, 1080 + products.length * 150), borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['编码', '科目路径', '明细', '成本归属/区域', '归属类型', '经营分摊方法', '土增税方法', '所得税方法', '规则来源', '含税金额', '不含税金额', '税额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}{products.map((product) => <th key={product.id} style={{ textAlign: 'right', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{product.name}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={12 + products.length} style={{ padding: 12, color: 'var(--muted)' }}>暂无成本明细，先录入目标成本或各专业明细。</td></tr> : rows.map((row, index) => <tr key={`${row.code}-${index}`}><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.code}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.subject}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.detail}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.region}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.type}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.operatingMethod}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.landVatMethod}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.incomeTaxMethod}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.ruleSource}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.inclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.exclusive)}</td><td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.tax)}</td>{products.map((product) => <td key={product.id} style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.allocations[product.id]?.inclusive || 0)}</td>)}</tr>)}</tbody></table></div></section>
      </div>
    </main>
  );
}
