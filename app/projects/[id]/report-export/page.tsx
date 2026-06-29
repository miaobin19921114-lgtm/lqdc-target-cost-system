import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }

export default async function ReportExportPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { costSubject: true, productType: true } }, taxes: true }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceTaxRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.incomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;

  const exportRows = [
    ['老板汇报版', '一页式老板汇报，适合快速看结论、指标和风险。', 'boss-report', '浏览器打印或另存 PDF'],
    ['经营报告', '完整经营测算报告，包含敏感性、核心指标和成本税费摘要。', 'report', '浏览器打印或复制到 Word'],
    ['打印版经营报告', '排版更适合直接打印/另存 PDF。', 'report-print', 'Ctrl/Cmd + P'],
    ['敏感性报告', '售价、成本、土地成本压力测试。', 'sensitivity-report', '打印或另存 PDF'],
    ['税务报告', '增值税、附加、土增税、所得税测算。', 'tax-report', '打印或另存 PDF'],
    ['Excel导入导出', '项目基础、业态、成本、收入等 Excel 工具入口。', 'export', 'Excel 导出/导入']
  ] as const;

  const metrics = [
    ['含税收入', revenue.taxInclusive],
    ['含税成本', cost.taxInclusive],
    ['税后净利', tax.netProfit],
    ['净利率', netMargin]
  ] as const;

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">PDF / Word 导出中心</p><h1 className="title">{project.name}</h1><p className="subtitle">先把报告页面排版稳定，现阶段用浏览器打印/另存 PDF；Word 导出后续再接 docx 模板。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/boss-report`} className="btn btn-primary">老板汇报版</Link><Link href={`/projects/${project.id}/report`} className="btn">经营报告</Link><Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link></div></div>

    <section className="card" style={{ marginBottom: 16 }}><h2>当前导出口径</h2><p className="meta">本页所有报告统一使用：普通销售收入 + 商业专项收入 + 车位收入 + 其他收入；成本统一使用有效末级成本行，已排除父级/非末级历史行。</p><div className="summary-strip" style={{ marginTop: 12 }}>{metrics.map(([label, value]) => <div className="stat" key={label}><div className="stat-label">{label}</div><div className="stat-value">{label.includes('率') ? pct(Number(value)) : fmt(value)}</div></div>)}</div>{effective.ignoredNonLeaf ? <div style={{ marginTop: 12, background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 10, padding: 10, color: '#8a6d00' }}>已排除 {effective.ignoredNonLeaf} 条父级/非末级成本行，导出报告不重复计算土地费或科目汇总行。</div> : null}</section>

    <section className="card"><h2>报告导出入口</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['报告', '用途', '入口', '导出方式'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{exportRows.map(([name, desc, href, method]) => <tr key={name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{desc}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn btn-primary" href={`/projects/${project.id}/${href}`}>打开</Link></td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{method}</td></tr>)}</tbody></table></div></section>

    <section className="card" style={{ marginTop: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><h2>使用方法</h2><ol style={{ lineHeight: 1.9, margin: 0, paddingLeft: 20 }}><li>打开需要的报告页面。</li><li>按 Ctrl/Cmd + P，选择“另存为 PDF”。</li><li>需要 Word 时，先复制经营报告正文到 Word；后续再开发 docx 模板导出。</li></ol></section>
  </div></main>;
}
