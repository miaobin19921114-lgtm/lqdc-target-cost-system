import Link from 'next/link';
import { EmptyState, StatusNotice, VersionContextBar } from '@/components/commercial-status';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function num(value: unknown) {
  return Number(value || 0);
}

function fmt(value: unknown) {
  return num(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function percent(value: number) {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function allocationBasis(method?: string | null) {
  const text = method || '';
  if (text.includes('销售收入')) return 'salesRevenue';
  if (text.includes('可售')) return 'saleableArea';
  if (text.includes('建面') || text.includes('建筑')) return 'buildingArea';
  if (text.includes('计容')) return 'capacityArea';
  if (text.includes('不可售')) return 'nonSaleableArea';
  if (text.includes('权重')) return 'weight';
  return 'saleableArea';
}

function basisValue(product: any, basis: string) {
  if (basis === 'buildingArea') return num(product.buildingArea);
  if (basis === 'capacityArea') return num(product.capacityArea);
  if (basis === 'nonSaleableArea') return num(product.nonSaleableArea);
  if (basis === 'salesRevenue') return num(product.saleableArea) * num(product.salePrice);
  if (basis === 'weight') return num(product.allocationWeight || 1);
  return num(product.saleableArea);
}

function basisLabel(basis: string) {
  const map: Record<string, string> = {
    saleableArea: '可售面积',
    buildingArea: '建筑面积',
    capacityArea: '计容面积',
    nonSaleableArea: '不可售面积',
    salesRevenue: '销售收入',
    weight: '分摊权重'
  };
  return map[basis] || '可售面积';
}

export default async function AllocationPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, costs: { include: { costSubject: true, productType: true } } }
  });
  const locked = version ? isVersionLocked(version) : false;

  const products = (version?.products || []).filter((item) => item.isActive && item.participateAllocation !== false);
  const disabledProductCount = (version?.products || []).filter((item) => !item.isActive).length;
  const costs = (version?.costs || []).filter((item) => !item.productTypeId || item.productType?.isActive);
  const productTotals = new Map<string, { product: any; direct: number; allocated: number; total: number }>();
  for (const product of products) productTotals.set(product.id, { product, direct: 0, allocated: 0, total: 0 });

  const allocationLines = costs.map((cost) => {
    const amount = num(cost.taxInclusiveAmount);
    const region = cost.regionOrProductType || '';
    const directProduct = products.find((product) => cost.productTypeId === product.id || region.includes(product.name));
    const basis = allocationBasis(cost.allocationMethod);
    const eligible = directProduct ? [directProduct] : products.filter((product) => basisValue(product, basis) > 0);
    const denominator = eligible.reduce((sum, product) => sum + basisValue(product, basis), 0) || 1;
    const shares = eligible.map((product) => {
      const ratio = directProduct ? 1 : basisValue(product, basis) / denominator;
      const allocatedAmount = amount * ratio;
      const current = productTotals.get(product.id);
      if (current) {
        if (directProduct) current.direct += allocatedAmount;
        else current.allocated += allocatedAmount;
        current.total += allocatedAmount;
      }
      return { productName: product.name, ratio, amount: allocatedAmount };
    });
    return { cost, amount, basis, directProductName: directProduct?.name || '', shares };
  });

  const totalCost = Array.from(productTotals.values()).reduce((sum, row) => sum + row.total, 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1380 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">成本分摊测算表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">按成本明细的分摊方式，将含税目标成本自动分摊到参与分摊的业态。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本测算</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
          </div>
        </div>

        <VersionContextBar projectName={project.name} versionName={version?.name} versionStatus={version?.status} editable={!locked} extra={[['参与分摊业态', products.length], ['成本明细条数', costs.length]]} />
        <div className="summary-strip">
          <div className="stat"><div className="stat-label">分摊总成本</div><div className="stat-value">{fmt(totalCost)}</div></div>
          <div className="stat"><div className="stat-label">成本明细条数</div><div className="stat-value">{costs.length}</div></div>
          <div className="stat"><div className="stat-label">参与分摊业态</div><div className="stat-value">{products.length}</div></div>
          <div className="stat"><div className="stat-label">当前版本</div><div className="stat-value">{version?.name || '暂无版本'}</div><div className="meta">{locked ? '已锁定' : '可编辑'}</div></div>
        </div>
        {disabledProductCount ? <StatusNotice title="已按启用业态口径展示" tone="warning">停用业态 {disabledProductCount} 个及其直接关联成本行不参与当前分摊展示。</StatusNotice> : null}

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>业态分摊结果</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['业态', '建筑面积', '可售面积', '直接归属成本', '分摊成本', '成本合计', '建面单方', '可售单方', '成本占比'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {Array.from(productTotals.values()).length === 0 ? <tr><td colSpan={9} style={{ padding: 12 }}><EmptyState title="暂无可分摊业态">请先在项目概况维护启用业态，并确认业态参与成本分摊。</EmptyState></td></tr> : Array.from(productTotals.values()).map(({ product, direct, allocated, total }) => (
                  <tr key={product.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{product.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(product.buildingArea)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(product.saleableArea)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(direct)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(allocated)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{fmt(total)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(num(product.buildingArea) ? total / num(product.buildingArea) : 0)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(num(product.saleableArea) ? total / num(product.saleableArea) : 0)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{percent(totalCost ? total / totalCost : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>成本明细分摊过程</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['成本编码', '成本科目', '明细名称', '含税金额', '分摊方式', '识别口径', '直接归属', '分摊结果'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {allocationLines.length === 0 ? <tr><td colSpan={8} style={{ padding: 12 }}><EmptyState title="暂无可分摊成本明细">请先录入专业明细或刷新目标成本测算结果；停用业态关联成本行不会进入本页展示。</EmptyState></td></tr> : allocationLines.map(({ cost, amount, basis, directProductName, shares }) => (
                  <tr key={cost.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{cost.costSubject.code}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{cost.costSubject.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{cost.detailName}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(amount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{cost.allocationMethod || '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{basisLabel(basis)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{directProductName || '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{shares.map((item) => `${item.productName}：${fmt(item.amount)}（${percent(item.ratio)}）`).join('；')}</td>
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
