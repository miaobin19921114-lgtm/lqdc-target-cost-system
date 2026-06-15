import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(v: number) { return v.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

export default async function DashboardLite({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' }, include: { products: true, costs: { include: { costSubject: true } } } });
  const leafRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null }, detailSubject: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(leafRows.map((r) => r.costCode).filter(Boolean));
  const products = version?.products || [];
  const costs = version?.costs || [];
  const validCosts = costs.filter((row) => leafCodes.has(row.costSubject.code));
  const revenue = products.filter((row) => row.isSaleable).reduce((sum, row) => sum + Number(row.saleableArea || 0) * Number(row.salePrice || 0), 0);
  const targetCost = validCosts.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const profit = revenue - targetCost;
  const profitRate = revenue ? profit / revenue * 100 : 0;
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  return <main className="page"><div className="container"><div className="page-header"><div><p className="eyebrow">控制台数据校验</p><h1 className="title">{project.name}</h1><p className="subtitle">收入取可售业态；成本只统计末级有效成本行。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">汇总表</Link></div></div><div className="summary-strip"><div className="stat"><div className="stat-label">销售收入</div><div className="stat-value">{fmt(revenue)}</div></div><div className="stat"><div className="stat-label">目标成本</div><div className="stat-value">{fmt(targetCost)}</div></div><div className="stat"><div className="stat-label">毛利</div><div className="stat-value">{fmt(profit)}</div></div><div className="stat"><div className="stat-label">毛利率</div><div className="stat-value">{fmt(profitRate)}%</div></div><div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(buildingArea ? targetCost / buildingArea : 0)}</div></div><div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(saleableArea ? targetCost / saleableArea : 0)}</div></div></div><section className="card"><h2>数据提示</h2><p className="meta">有效成本行：{validCosts.length}/{leafRows.length}；历史非末级成本行：{costs.length - validCosts.length}。</p><div className="actions"><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">项目概况</Link><Link href={`/projects/${project.id}/revenue`} className="btn">收入明细</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本编制</Link><Link href={`/projects/${project.id}/summary-check`} className="btn">汇总校验</Link></div></section></div></main>;
}
