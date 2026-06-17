import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
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

const definitions = [
  { name: '一层临街商业', mode: '出售', desc: '临街展示面强，通常单价最高，可单独测算。' },
  { name: '二层及以上商业', mode: '出售', desc: '二层及以上商业单价、去化通常弱于一层。' },
  { name: '社区商业', mode: '出售', desc: '底商、社区配套商业，适合按面积×单价测算。' },
  { name: '自持商业租金', mode: '自持出租', desc: '自持或阶段性出租，按面积×月租金×出租率×年限测算。' },
  { name: '租售混合商业', mode: '自持出租', desc: '用于暂估商业持有部分租金收益，出售部分可单独拆行。' }
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
  const rows = definitions.map((item) => {
    const product = products.find((p) => p.name === `商业收入-${item.name}`);
    const revenue = product ? revenueMap.get(product.id) : null;
    const remark = product?.remark || '';
    const mode = readRemark(remark, '模式') || item.mode;
    const area = Number(readRemark(remark, '面积') || 0);
    const salePrice = Number(readRemark(remark, '销售单价') || 0);
    const monthlyRent = Number(readRemark(remark, '月租金') || 0);
    const occupancyRate = Number(readRemark(remark, '出租率') || (mode.includes('出租') || mode.includes('自持') ? 0.8 : 0));
    const years = Number(readRemark(remark, '测算年限') || 1);
    const amount = Number(product?.salePrice || calcAmount({ mode, area, salePrice, monthlyRent, occupancyRate, years }));
    const taxRate = Number(revenue?.taxRate || 0.09);
    const result = calculateRevenueLine(1, amount, taxRate);
    return { ...item, mode, area, salePrice, monthlyRent, occupancyRate, years, amount, taxRate, net: result.taxExclusiveRevenue, fee: result.taxAmount, remark: readRemark(remark, '备注') };
  });

  const activeRows = rows.filter((row) => row.amount > 0);
  const total = activeRows.reduce((sum, row) => sum + row.amount, 0);
  const net = activeRows.reduce((sum, row) => sum + row.net, 0);
  const fee = activeRows.reduce((sum, row) => sum + row.fee, 0);
  const zeroAreaRows = rows.filter((row) => row.amount > 0 && row.area <= 0).length;
  const zeroPriceRows = rows.filter((row) => row.area > 0 && row.amount <= 0).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">商业收入测算</h1><p className="subtitle">商业涉及分层售价、自持出租、租售混合时在本页专项测算；简单出售商业也可以继续走销售收入测算。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue-summary`} className="btn">收入汇总</Link><Link href={`/projects/${project.id}/revenue`} className="btn">销售收入</Link><Link href={`/projects/${project.id}/other-revenue`} className="btn">其他收入</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>商业收入已保存并同步。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>当前版本已锁定，不能保存商业收入。</div> : null}

    <section className="card" style={{ marginBottom: 16 }}><div className="summary-strip"><div className="stat"><div className="stat-label">商业收入项</div><div className="stat-value">{activeRows.length}</div></div><div className="stat"><div className="stat-label">预计含税商业收入</div><div className="stat-value">{fmt(total)}元</div></div><div className="stat"><div className="stat-label">预计不含税收入</div><div className="stat-value">{fmt(net)}元</div></div><div className="stat"><div className="stat-label">预计销项税</div><div className="stat-value">{fmt(fee)}元</div></div></div></section>

    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>口径说明</b><p className="meta" style={{ margin: '6px 0 0' }}>出售商业按面积×含税销售单价；自持出租按面积×月租金×12×出租率×测算年限。商业专项收入单独进入收入汇总，避免和住宅普通销售收入混算。</p></section>

    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>商业收入明细</h2><p className="meta">税率可按销售或租赁口径录入；不确定时先按经营测算假设填列，后续由税务报告复核。</p></div><button form="commercial-revenue-batch" className="btn btn-primary">保存并同步商业收入</button></div>
      <div style={{ overflowX: 'auto' }}><form id="commercial-revenue-batch" action={`/api/projects/${project.id}/commercial-revenue/batch`} method="post" /><input form="commercial-revenue-batch" type="hidden" name="rowCount" value={rows.length} /><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1460 }}><thead><tr>{['商业类型', '模式', '面积㎡', '销售单价元/㎡', '月租金元/㎡', '出租率', '年限', '税率', '含税收入', '不含税收入', '销项税', '备注', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}><input form="commercial-revenue-batch" type="hidden" name={`type-${index}`} value={row.name} />{row.name}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><select form="commercial-revenue-batch" name={`mode-${index}`} defaultValue={row.mode} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 100 }}><option>出售</option><option>自持出租</option></select></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`area-${index}`} type="number" step="0.01" defaultValue={row.area || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 110 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`salePrice-${index}`} type="number" step="0.01" defaultValue={row.salePrice || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 120 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`monthlyRent-${index}`} type="number" step="0.01" defaultValue={row.monthlyRent || ''} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 120 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`occupancyRate-${index}`} type="number" step="0.0001" defaultValue={row.occupancyRate || 0} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 90 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`years-${index}`} type="number" step="0.01" defaultValue={row.years || 1} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 80 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`taxRate-${index}`} type="number" step="0.0001" defaultValue={row.taxRate || 0.09} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 90 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.amount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.net)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.fee)}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form="commercial-revenue-batch" name={`remark-${index}`} defaultValue={row.remark === '-' ? '' : row.remark} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 160 }} /></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.desc}</td></tr>)}</tbody></table></div>
    </section>

    <section className="card" style={{ marginTop: 16 }}><h2>商业收入校验</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}><div><b>面积完整性</b><p className="meta">已有收入但面积为0：{zeroAreaRows} 行。</p></div><div><b>收入完整性</b><p className="meta">有面积但未形成收入：{zeroPriceRows} 行。</p></div><div><b>收入汇总</b><p className="meta">商业专项收入会进入“收入汇总”和经营总控。</p></div></div></section>
  </div></main>;
}
