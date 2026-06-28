import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function ControlCenterPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, costs: { include: { costSubject: true } } }
  });

  const leafRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null }, detailSubject: { not: null } },
    select: { costCode: true }
  });
  const leafCodes = new Set(leafRows.map((row) => row.costCode).filter(Boolean));
  const allCosts = version?.costs || [];
  const costs = allCosts.filter((item) => leafCodes.has(item.costSubject.code));
  const revenue = (version?.products || []).filter((item) => item.isSaleable).reduce((sum, item) => sum + Number(item.saleableArea || 0) * Number(item.salePrice || 0), 0);
  const targetCost = costs.reduce((sum, item) => sum + Number(item.taxInclusiveAmount || 0), 0);
  const profit = revenue - targetCost;
  const ignoredCount = allCosts.length - costs.length;

  return <main className="page"><div className="container">
    <div className="page-header"><div><p className="eyebrow">测算控制中心</p><h1 className="title">{project.name}</h1><p className="subtitle">用于核对控制台数据口径：收入取可售业态，成本只取末级有效成本行。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">汇总表</Link></div></div>
    {ignoredCount ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8' }}>已发现 {ignoredCount} 条历史非末级成本行，控制中心不计入这些金额。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税销售收入</div><div className="stat-value">{fmt(revenue)}</div></div><div className="stat"><div className="stat-label">末级目标成本</div><div className="stat-value">{fmt(targetCost)}</div></div><div className="stat"><div className="stat-label">毛利</div><div className="stat-value">{fmt(profit)}</div></div><div className="stat"><div className="stat-label">毛利率</div><div className="stat-value">{revenue ? fmt(profit / revenue * 100) : '0'}%</div></div></div>
    <section className="card"><h2>填报进度</h2><p className="meta">末级成本行：{costs.length}/{leafRows.length}</p><div className="actions"><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">项目概况</Link><Link href={`/projects/${project.id}/revenue`} className="btn">收入明细表</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本编制</Link><Link href={`/projects/${project.id}/summary-check`} className="btn">汇总联动校验</Link></div></section>
  </div></main>;
}
