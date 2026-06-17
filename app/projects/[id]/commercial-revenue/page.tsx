import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { isChargingProductName, isCommercialRevenueProductName, isOtherRevenueProductName, isParkingProductName } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '-';
}

function readRemark(remark: string | null | undefined, key: string) {
  const text = remark || '';
  const found = text.split('；').find((part) => part.startsWith(`${key}：`));
  return found ? found.replace(`${key}：`, '') : '';
}

function calcAmount(input: { mode: string; area: number; salePrice: number; monthlyRent: number; occupancyRate: number; years: number }) {
  if (input.mode.includes('出租') || input.mode.includes('自持')) return input.area * input.monthlyRent * 12 * input.occupancyRate * input.years;
  return input.area * input.salePrice;
}

function isCommercialProduct(name?: string | null) {
  const value = name || '';
  return !isCommercialRevenueProductName(value) && !isParkingProductName(value) && !isChargingProductName(value) && !isOtherRevenueProductName(value) && ['商业', '底商', '商铺', '集中商业', '沿街'].some((word) => value.includes(word));
}

function safeName(value: string) {
  return value.replace(/[\\/]/g, '-').trim();
}

const subTypes = [
  { name: '一层临街', mode: '出售', desc: '临街展示面强，通常单价最高。' },
  { name: '二层及以上', mode: '出售', desc: '二层及以上商业，单价和去化一般低于一层。' },
  { name: '内铺/次主力店', mode: '出售', desc: '内铺、次主力店或非临街铺位。' },
  { name: '自持出租', mode: '自持出租', desc: '自持部分按租金收益测算。' },
  { name: '租售混合出租', mode: '自持出租', desc: '租售混合中持有或阶段出租部分。' }
];

export default async function CommercialRevenuePage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; rows?: string; locked?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } } }
  });

  const revenueMap = new Map((version?.revenues || []).map((item) => [item.productTypeId, item]));
  const products = version?.products || [];
  const commercialProducts = products.filter((item) => item.isActive && item.isSaleable && isCommercialProduct(item.name));
  const syntheticCommercialProducts = products.filter((item) => item.isActive && isCommercialRevenueProductName(item.name));

  const rows = commercialProducts.flatMap((parent) => subTypes.map((sub) => {
    const syntheticName = `商业收入-${safeName(parent.name)}-${safeName(sub.name)}`;
    const product = syntheticCommercialProducts.find((p) => p.name === syntheticName);
    const revenue = product ? revenueMap.get(product.id) : null;
    const remark = product?.remark || '';
    const mode = readRemark(remark, '模式') || sub.mode;
    const area = Number(readRemark(remark, '面积') || 0);
    const salePrice = Number(readRemark(remark, '销售单价') || 0);
    const monthlyRent = Number(readRemark(remark, '月租金') || 0);
    const occupancyRate = Number(readRemark(remark, '出租率') || (mode.includes('出租') || mode.includes('自持') ? 0.8 : 0));
    const years = Number(readRemark(remark, '测算年限') || 1);
    const amount = Number(product?.salePrice || calcAmount({ mode, area, salePrice, monthlyRent, occupancyRate, years }));
    const taxRate = Number(revenue?.taxRate || 0.09);
    const result = calculateRevenueLine(1, amount, taxRate);
    return { parent, sub, mode, area, salePrice, monthlyRent, occupancyRate, years, amount, taxRate, net: result.taxExclusiveRevenue, fee: result.taxAmount, remark: readRemark(remark, '备注') };
  }));

  const activeRows = rows.filter((row) => row.amount > 0);
  const total = activeRows.reduce((sum, row) => sum + row.amount, 0);
  const net = activeRows.reduce((sum, row) => sum + row.net, 0);
  const fee = activeRows.reduce((sum, row) => sum + row.fee, 0);
  const byParent = commercialProducts.map((product) => {
    const childRows = rows.filter((row) => row.parent.id === product.id);
    const splitArea = childRows.reduce((sum, row) => sum + Number(row.area || 0), 0);
    const income = childRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const productArea = Number(product.saleableArea || 0);
    return { product, splitArea, income, diff: productArea - splitArea };
  });
  const areaRiskCount = byParent.filter((row) => row.splitArea > Number(row.product.saleableArea || 0) + 0.01).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">商业收入测算</h1><p className="subtitle">商业收入先挂接项目概况里的商业业态，再在该业态下拆一层、二层、自持出租等细分口径。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue-summary`} className="btn">收入汇总</Link><Link href={`/projects/${project.id}/revenue`} className="btn">销售收入</Link><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>商业收入已保存并同步。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>当前版本已锁定，不能保存商业收入。</div> : null}

    <section className="card" style={{ marginBottom: 16 }}><div className="summary-strip"><div className="stat"><div className="stat-label">商业业态数</div><div className="stat-value">{commercialProducts.length}</div></div><div className="stat"><div className="stat-label">细分收入项</div><div className="stat-value">{activeRows.length}</div></div><div className="stat"><div className="stat-label">预计含税商业收入</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">预计不含税收入</div><div className="stat-value">{fmt(net)}元</div></div><div className="stat"><div className="stat-label">预计销项税</div><div className="stat-value">{fmt(fee)}元</div></div></div></section>

    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>口径说明</b><p className="meta" style={{ margin: '6px 0 0' }}>项目概况中的“底商/商业/商铺”等是项目业态；本页的一层、二层、内铺、自持出租是商业内部价格分区，不作为新的项目业态。细分面积合计原则上不应超过对应商业业态的可售面积。</p></section>

    {commercialProducts.length === 0 ? <section className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8', background: '#fff9db' }}>当前项目概况未识别到商业类业态。请先在项目概况/业态维护中启用“底商、商业、商铺、集中商业”等业态。</section> : null}

    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>商业细分收入明细</h2><p className="meta">每一行都归属到项目概况里的商业业态；税率可按销售或租赁口径录入。</p></div><button form="commercial-revenue-batch" className="btn btn-primary">保存并同步商业收入</button></div>
      <div style={{ overflowX: 'auto' }}><form id="commercial-revenue-batch" action={`/api/projects/${project.id}/commercial-revenue/batch`} method="post" /><input form="commercial-revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1560 }}><thead><tr>{['归属商业业态', '细分类型', '模式', '面积㎡', '销售单价元/㎡', '月租金元/㎡', '出租率', '年限', '税率', '含税收入', '不含税收入', '销项税', '备注', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.parent.id}-${row.sub.name}`}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><input form="commercial-revenue-batch" type="hidden" name={`parentProductId-${index}`} value={row.parent.id} /><input form="commercial-revenue-batch" type="hidden" name={`parentName-${index}`} value={row.parent.name} />{row.parent.name}<div className="meta">可售{fmt(row.parent.saleableArea)}㎡</div></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><input form="commercial-revenue-batch" type="hidden" name={`subType-${index}`} value={row.sub.name} />{row.sub.name}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><select form="commercial-revenue-batch" name={`mode-${index}`} defaultValue={row.mode} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 100 }}><option>出售</option><option>自持出租</option></select></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`area-${index}`} type="number" step="0.01" defaultValue={row.area || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 110 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.salePrice || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 120 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`monthlyRent-${index}`} type="number" step="0.01" defaultValue={row.monthlyRent || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 120 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`occupancyRate-${index}`} type="number" step="0.0001" defaultValue={row.occupancyRate || 0} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 90 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`years-${index}`} type="number" step="0.01" defaultValue={row.years || 1} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 80 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`taxRate-${index}`} type="number" step="0.0001" defaultValue={row.taxRate || 0.09} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 90 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.amount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`remark-${index}`} defaultValue={row.remark === '-' ? '' : row.remark} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 160 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.sub.desc}</td></tr>)}</tbody></table></div>
    </section>

    <section className="card" style={{ marginTop: 16 }}><h2>商业收入校验</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['商业业态', '概况可售面积', '细分面积合计', '剩余/超出', '专项收入', '状态'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{byParent.map((row) => <tr key={row.product.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.product.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.product.saleableArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.splitArea)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: row.diff >= -0.01 ? '#2f9e44' : '#e03131', fontWeight: 900 }}>{fmt(row.diff)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.income)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.diff >= -0.01 ? '正常' : '细分面积超概况面积'}</td></tr>)}</tbody></table></div>{areaRiskCount ? <p style={{ color: '#e03131', fontWeight: 800 }}>有 {areaRiskCount} 个商业业态细分面积超过概况表可售面积，请复核。</p> : <p className="meta">细分面积未超过项目概况商业业态面积。</p>}</section>
  </div></main>;
}
