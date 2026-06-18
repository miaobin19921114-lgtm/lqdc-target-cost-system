import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProfitAnalysisPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return <main className="page"><div className="container" style={{ maxWidth: 980 }}>
    <div className="page-header"><div><p className="eyebrow">业态利润分析</p><h1 className="title">{project.name}</h1><p className="subtitle">页面入口已恢复。先保证线上稳定，下一步再恢复分业态收入、成本分摊、税费和净利明细。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总</Link><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card"><h2>当前状态</h2><p>业态利润页面已恢复入口，完整分析功能将在后续逐步恢复。</p></section>
  </div></main>;
}
