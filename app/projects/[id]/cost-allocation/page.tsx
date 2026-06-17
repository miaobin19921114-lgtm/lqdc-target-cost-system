import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { effectiveCostRows, n } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

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
  const name = product.name || '';
  const methodText = method || '';
  if (includes(methodText, ['建筑面积', '建面'])) return n(product.buildingArea) * weight;
  if (includes(methodText, ['计容'])) return n(product.capacityArea) * weight;
  if (includes(methodText, ['不可售'])) return n(product.nonSaleableArea) * weight;
  if (includes(methodText, ['车位', '地库', '地下车位']) || includes(name, ['车位', '地库', '地下'])) return (n(product.saleableArea) || n(product.buildingArea)) * weight;
  if (includes(methodText, ['销售收入', '收入'])) return n(product.saleableArea) * n(product.salePrice) * weight;
  return (n(product.saleableArea) || n(product.buildingArea) || n(product.capacityArea)) * weight;
}

function allocationMethodName(method: string | null | undefined) {
  return method || '按可售面积占比';
}

function taxObjectName(product: any) {
  if (!product.isSaleable) return '不可售/配套成本对象';
  if (includes(product.name, ['车位', '车库', '地下'])) return '车位成本对象';
  if (includes(product.name, ['商业', '底商', '商铺'])) return '商业成本对象';
  return '住宅/可售成本对象';
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

  const dictRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    select: { costCode: true }
  });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter(Boolean));
  const allProducts = version?.products || [];
  const disabledProductCount = allProducts.filter((item) => !item.isActive).length;
  const products = allProducts.filter((item) => item.isActive && item.participateAllocation);
  const activeProducts = allProducts.filter((item) => item.isActive);
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const costs = effective.effective;
  const saleableProducts = products.filter((item) => item.isSaleable);
  const totalInclusiveCost = costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const totalExclusiveCost = costs.reduce((sum, row) => sum + n(row.taxExclusiveAmount), 0);
  const totalTax = costs.reduce((sum, row) => sum + n(row.taxAmount), 0);

  const productTotals = new Map<string, { product: any; inclusive: number; exclusive: number; tax: number; directInclusive: number; sharedInclusive: number; buildingArea: number; saleableArea: number }>();
  products.forEach((product) => productTotals.set(product.id, {
    product,
    inclusive: 0,
    exclusive: 0,
    tax: 0,
    directInclusive: 0,
    sharedInclusive: 0,
    buildingArea: n(product.buildingArea),
    saleableArea: n(product.saleableArea)
  }));

  const rows: Array<{ code: string; subject: string; detail: string; method: string; type: string; inclusive: number; exclusive: number; tax: number; allocations: Record<string, { inclusive: number; exclusive: number; tax: number }> }> = [];
  let directRows = 0;
  let sharedRows = 0;

  costs.forEach((cost) => {
    const method = allocationMethodName(cost.allocationMethod);
    const directProduct = cost.productTypeId ? products.find((product) => product.id === cost.productTypeId) : null;
    let pool: any[] = [];
    let type = '共同分摊';

    if (directProduct) {
      pool = [directProduct];
      type = '直接归属';
      directRows += 1;
    } else {
      const matched = products.filter((product) => {
        const region = cost.regionOrProductType || '';
        if (!region || region.includes('全项目') || region.includes('项目整体') || region.includes('Excel导入')) return true;
        return region.includes(product.name) || product.name.includes(region) || (region.includes('地下') && product.name.includes('地下')) || (region.includes('车位') && product.name.includes('车位'));
      });
      pool = matched.length ? matched : (saleableProducts.length ? saleableProducts : products);
      sharedRows += 1;
    }

    const bases = pool.map((product) => ({ product, base: allocationBase(product, method) }));
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
        if (type === '直接归属') item.directInclusive += value.inclusive;
        else item.sharedInclusive += value.inclusive;
      }
    });

    rows.push({
      code: cost.costSubject.code,
      subject: cost.description || cost.costSubject.fullPath || cost.costSubject.name,
      detail: cost.detailName,
      method,
      type,
      inclusive,
      exclusive,
      tax,
      allocations
    });
  });

  const allocatedInclusive = Array.from(productTotals.values()).reduce((sum, item) => sum + item.inclusive, 0);
  const diff = totalInclusiveCost - allocatedInclusive;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1500 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">成本分摊测算表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">与目标成本汇总表、税金明细表同口径：只统计启用业态、末级成本行和 Excel 导入四级科目；按直接归属或共同分摊形成计税成本对象。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本编制</Link>
            <Link href={`/projects/${project.id}/land-vat`} className="btn">土地增值税</Link>
            <Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link>
            <Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {disabledProductCount || effective.ignoredDisabled || effective.ignoredNonLeaf ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除停用业态 {disabledProductCount} 个、停用业态成本行 {effective.ignoredDisabled} 行、非末级历史成本行 {effective.ignoredNonLeaf} 行。</div> : null}
        {effective.importedLeafRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb', background: '#f0fff4' }}>已计入 {effective.importedLeafRows} 条 Excel 导入/临时四级成本科目，建议通过“成本科目映射”归入标准科目。</div> : null}
        {Math.abs(diff) > 1 ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffc9c9', background: '#fff5f5' }}>分摊差异 {fmt(diff)} 元，请检查是否没有参与分摊的启用业态或分摊基数为 0。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">参与分摊业态</div><div className="stat-value">{products.length}/{activeProducts.length}</div></div>
          <div className="stat"><div className="stat-label">有效成本行</div><div className="stat-value">{costs.length}</div></div>
          <div className="stat"><div className="stat-label">含税/不含税成本</div><div className="stat-value">{fmt(totalInclusiveCost)} / {fmt(totalExclusiveCost)}</div></div>
          <div className="stat"><div className="stat-label">分摊差异</div><div className="stat-value">{fmt(diff)}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>业态计税成本对象</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['业态', '成本对象', '建筑面积', '可售面积', '含税分摊成本', '不含税分摊成本', '进项税额', '直接归属', '共同分摊', '建面单方', '可售单方', '占比'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {Array.from(productTotals.values()).map(({ product, inclusive, exclusive, tax, directInclusive, sharedInclusive, buildingArea, saleableArea }) => (
                  <tr key={product.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{product.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{taxObjectName(product)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(buildingArea)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(saleableArea)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(inclusive)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(exclusive)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(tax)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(directInclusive)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(sharedInclusive)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(buildingArea ? inclusive / buildingArea : 0)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(saleableArea ? inclusive / saleableArea : 0)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(totalInclusiveCost ? inclusive / totalInclusiveCost : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>分摊口径统计</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div><span className="meta">直接归属成本行</span><div style={{ fontSize: 22, fontWeight: 900 }}>{directRows}</div></div>
            <div><span className="meta">共同分摊成本行</span><div style={{ fontSize: 22, fontWeight: 900 }}>{sharedRows}</div></div>
            <div><span className="meta">进项税额</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalTax)}</div></div>
            <div><span className="meta">用于所得税成本</span><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalExclusiveCost)}</div></div>
          </div>
        </section>

        <section className="card">
          <h2>成本行分摊明细</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: Math.max(1320, 760 + products.length * 150), borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['编码', '科目路径', '明细', '归属类型', '分摊方式', '含税金额', '不含税金额', '税额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}
                  {products.map((product) => <th key={product.id} style={{ textAlign: 'right', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{product.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={8 + products.length} style={{ padding: 12, color: 'var(--muted)' }}>暂无成本明细，先录入目标成本或各专业明细。</td></tr> : rows.map((row, index) => (
                  <tr key={`${row.code}-${index}`}>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.code}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.subject}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.detail}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.type}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.method}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.inclusive)}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.exclusive)}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.tax)}</td>
                    {products.map((product) => <td key={product.id} style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.allocations[product.id]?.inclusive || 0)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
