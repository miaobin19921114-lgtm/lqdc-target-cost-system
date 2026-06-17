import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

function valueOf(searchParams: Search | undefined, key: string, fallback: number) {
  const raw = searchParams?.[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function fmt(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default async function SalesSchedulePage({ params, searchParams }: { params: { id: string }, searchParams?: Search }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, taxes: true, revenues: { include: { productType: true } } }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], vatRate });
  const salesBase = revenue.ordinary.taxInclusive + revenue.commercial.taxInclusive + revenue.parking.taxInclusive;
  const policyIncome = revenue.other.taxInclusive;

  const months = clamp(Math.round(valueOf(searchParams, 'months', 12)), 1, 36);
  const downPaymentRate = valueOf(searchParams, 'downPaymentRate', 30) / 100;
  const mortgageRate = valueOf(searchParams, 'mortgageRate', 65) / 100;
  const tailRate = valueOf(searchParams, 'tailRate', 5) / 100;
  const mortgageDelay = clamp(Math.round(valueOf(searchParams, 'mortgageDelay', 2)), 0, 36);
  const tailDelay = clamp(Math.round(valueOf(searchParams, 'tailDelay', 6)), 0, 36);
  const defaultRate = months ? 100 / months : 0;
  const ratios = Array.from({ length: months }, (_, index) => valueOf(searchParams, `p${index + 1}`, defaultRate));
  const ratioTotal = ratios.reduce((sum, item) => sum + item, 0);
  const contractAmounts = ratios.map((ratio) => salesBase * ratio / 100);

  const rows = contractAmounts.map((contract, index) => {
    const downPayment = contract * downPaymentRate;
    const mortgage = index - mortgageDelay >= 0 ? contractAmounts[index - mortgageDelay] * mortgageRate : 0;
    const tail = index - tailDelay >= 0 ? contractAmounts[index - tailDelay] * tailRate : 0;
    const collection = downPayment + mortgage + tail;
    const cumulativeContract = contractAmounts.slice(0, index + 1).reduce((sum, item) => sum + item, 0);
    return { month: index + 1, ratio: ratios[index], contract, downPayment, mortgage, tail, collection, cumulativeContract };
  });

  const cumulativeCollections: number[] = [];
  rows.forEach((row, index) => {
    cumulativeCollections[index] = (cumulativeCollections[index - 1] || 0) + row.collection;
  });
  const totalContract = rows.reduce((sum, row) => sum + row.contract, 0);
  const totalCollectionInPeriod = rows.reduce((sum, row) => sum + row.collection, 0);
  const endingBalance = totalContract - totalCollectionInPeriod;
  const maxBalance = Math.max(...rows.map((row, index) => row.cumulativeContract - cumulativeCollections[index]), 0);
  const collectionRate = salesBase ? totalCollectionInPeriod / salesBase : 0;
  const payRateTotal = downPaymentRate + mortgageRate + tailRate;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">收入测算</p><h1 className="title">去化节奏测算</h1><p className="subtitle">把销售收入、商业专项收入、车位收入转换成月度签约和回款节奏；其他政策性收入单独提示，不默认按销售去化分摊。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/revenue-summary`} className="btn">收入汇总</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn btn-primary">经营总控</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>

    <section className="card" style={{ marginBottom: 16 }}><div className="summary-strip"><div className="stat"><div className="stat-label">去化基数</div><div className="stat-value">{fmt(salesBase)}元</div></div><div className="stat"><div className="stat-label">周期内签约</div><div className="stat-value">{fmt(totalContract)}元</div></div><div className="stat"><div className="stat-label">周期内回款</div><div className="stat-value">{fmt(totalCollectionInPeriod)}元</div></div><div className="stat"><div className="stat-label">期末未回款</div><div className="stat-value" style={{ color: endingBalance > 0 ? '#f08c00' : '#2f9e44' }}>{fmt(endingBalance)}元</div></div><div className="stat"><div className="stat-label">最大回款缺口</div><div className="stat-value">{fmt(maxBalance)}元</div></div></div></section>

    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>收入基数说明</b><p className="meta" style={{ margin: '6px 0 0' }}>去化基数 = 销售收入 {fmt(revenue.ordinary.taxInclusive)} + 商业专项收入 {fmt(revenue.commercial.taxInclusive)} + 车位收入 {fmt(revenue.parking.taxInclusive)}。其他收入 {fmt(policyIncome)} 元属于政策性/财政性收入，后续现金流模块建议单独设置兑现月份。</p></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>去化与回款参数</h2><form method="get" style={{ display: 'grid', gap: 12 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}><label>测算月数<input name="months" type="number" min="1" max="36" defaultValue={months} style={{ width: '100%', height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label><label>首付比例%<input name="downPaymentRate" type="number" step="0.01" defaultValue={downPaymentRate * 100} style={{ width: '100%', height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label><label>按揭比例%<input name="mortgageRate" type="number" step="0.01" defaultValue={mortgageRate * 100} style={{ width: '100%', height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label><label>尾款/分期比例%<input name="tailRate" type="number" step="0.01" defaultValue={tailRate * 100} style={{ width: '100%', height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label><label>按揭回款滞后月<input name="mortgageDelay" type="number" min="0" max="36" defaultValue={mortgageDelay} style={{ width: '100%', height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label><label>尾款回款滞后月<input name="tailDelay" type="number" min="0" max="36" defaultValue={tailDelay} style={{ width: '100%', height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label></div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['月份', '去化比例%'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{ratios.map((ratio, index) => <tr key={index}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>第{index + 1}月</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input name={`p${index + 1}`} type="number" step="0.01" defaultValue={ratio} style={{ width: 120, height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></td></tr>)}</tbody></table></div><div className="actions"><button className="btn btn-primary" type="submit">重新测算</button><Link className="btn" href={`/projects/${project.id}/sales-schedule`}>恢复默认</Link></div></form></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>月度签约与回款测算</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1320, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['月份', '去化比例', '签约金额', '首付款回款', '按揭回款', '尾款/分期回款', '当月回款', '累计签约', '累计回款', '未回款余额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => { const cumulativeCollection = cumulativeCollections[index]; const balance = row.cumulativeContract - cumulativeCollection; return <tr key={row.month}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>第{row.month}月</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{pct(row.ratio)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.contract)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.downPayment)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.mortgage)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.tail)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{fmt(row.collection)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.cumulativeContract)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(cumulativeCollection)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: balance > 0 ? '#f08c00' : '#2f9e44', fontWeight: 800 }}>{fmt(balance)}</td></tr>; })}</tbody></table></div></section>

    <section className="card" style={{ borderColor: Math.abs(ratioTotal - 100) <= 0.01 && Math.abs(payRateTotal - 1) <= 0.0001 ? '#b2f2bb' : '#ffd8a8', background: Math.abs(ratioTotal - 100) <= 0.01 && Math.abs(payRateTotal - 1) <= 0.0001 ? '#f0fff4' : '#fff9db' }}><h2>去化校验</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}><div><b>去化比例合计</b><p className="meta">当前合计 {pct(ratioTotal)}。建议等于 100%。</p></div><div><b>回款比例合计</b><p className="meta">首付+按揭+尾款 = {pct(payRateTotal * 100)}。建议等于 100%。</p></div><div><b>周期回款率</b><p className="meta">周期内回款 / 去化基数 = {pct(collectionRate * 100)}。滞后回款会导致周期末仍有未回款余额。</p></div></div></section>
  </div></main>;
}
