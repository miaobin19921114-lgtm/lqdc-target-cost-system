import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function n(value: unknown) {
  return Number(value || 0);
}

function fmt(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
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

export default async function CostAllocationPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: { orderBy: { name: 'asc' } },
      costs: { include: { costSubject: true, productType: true } }
    }
  });

  const allProducts = version?.products || [];
  const disabledProductCount = allProducts.filter((item) => !item.isActive).length;
  const products = allProducts.filter((item) => item.isActive && item.participateAllocation);
  const rawCosts = version?.costs || [];
  const costs = rawCosts.filter((row) => !row.productTypeId || row.productType?.isActive);
  const ignoredDisabledCostRows = rawCosts.length - costs.length;
  const saleableProducts = products.filter((item) => item.isSaleable);
  const totalCost = costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);

  const productTotals = new Map<string, { product: any; amount: number; buildingArea: number; saleableArea: number }>();
  products.forEach((product) => productTotals.set(product.id, { product, amount: 0, buildingArea: n(product.buildingArea), saleableArea: n(product.saleableArea) }));

  const rows: Array<{ code: string; subject: string; detail: string; method: string; amount: number; allocations: Record<string, number> }> = [];

  costs.forEach((cost) => {
    const method = allocationMethodName(cost.allocationMethod);
    const matched = products.filter((product) => {
      const region = cost.regionOrProductType || '';
      if (!region || region.includes('全项目') || region.includes('项目整体')) return true;
      return region.includes(product.name) || product.name.includes(region) || (region.includes('地下') && product.name.includes('地下')) || (region.includes('车位') && product.name.includes('车位'));
    });
    const pool = matched.length ? matched : (saleableProducts.length ? saleableProducts : products);
    const bases = pool.map((product) => ({ product, base: allocationBase(product, method) }));
    const totalBase = bases.reduce((sum, item) => sum + item.base, 0) || pool.length || 1;
    const amount = n(cost.taxInclusiveAmount);
    const allocations: Record<string, number> = {};
    bases.forEach(({ product, base }) => {
      const ratio = totalBase ? base / totalBase : 1 / pool.length;
      const value = amount * ratio;
      allocations[product.id] = value;
      const item = productTotals.get(product.id);
      if (item) item.amount += value;
    });
    rows.push({
      code: cost.costSubject.code,
      subject: cost.description || cost.costSubject.fullPath || cost.costSubject.name,
      detail: cost.detailName,
      method,
      amount,
      allocations
    });
  });

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1500 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">成本分摊测算表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">只对启用且参与分摊的业态进行分摊；停用业态和停用业态关联成本不再参与经营测算和税务测算接口。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本编制</Link>
            <Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {disabledProductCount || ignoredDisabledCostRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已排除 {disabledProductCount} 个停用业态、{ignoredDisabledCostRows} 条停用业态关联成本行。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">参与分摊业态</div><div className="stat-value">{products.length}</div></div>
          <div className="stat"><div className="stat-label">成本明细行</div><div className="stat-value">{costs.length}</div></div>
          <div className="stat"><div className="stat-label">含税成本合计</div><div className="stat-value">{fmt(totalCost)}</div></div>
          <div className="stat"><div className="stat-label">分摊后合计</div><div className="stat-value">{fmt(Array.from(productTotals.values()).reduce((sum, item) => sum + item.amount, 0))}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>业态分摊结果</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['业态', '建筑面积', '可售面积', '分摊成本', '建面单方', '可售单方'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {Array.from(productTotals.values()).map(({ product, amount, buildingArea, saleableArea }) => (
                  <tr key={product.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{product.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(buildingArea)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(saleableArea)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(amount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(buildingArea ? amount / buildingArea : 0)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(saleableArea ? amount / saleableArea : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>成本行分摊明细</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: Math.max(1200, 640 + products.length * 150), borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['编码', '科目路径', '明细', '分摊方式', '含税金额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}
                  {products.map((product) => <th key={product.id} style={{ textAlign: 'right', padding: 9, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{product.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={5 + products.length} style={{ padding: 12, color: 'var(--muted)' }}>暂无成本明细，先录入目标成本或各专业明细。</td></tr> : rows.map((row, index) => (
                  <tr key={`${row.code}-${index}`}>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.code}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.subject}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.detail}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{row.method}</td>
                    <td style={{ padding: 9, borderBottom: '1px solid var(--border)' }}>{fmt(row.amount)}</td>
                    {products.map((product) => <td key={product.id} style={{ padding: 9, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.allocations[product.id] || 0)}</td>)}
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
