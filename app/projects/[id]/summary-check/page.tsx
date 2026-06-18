import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SummaryCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return <main className="page"><div className="container" style={{ maxWidth: 980 }}>
    <div className="page-header"><div><p className="eyebrow">汇总联动校验</p><h1 className="title">{project.name}</h1><p className="subtitle">该页面已临时简化，先保证系统部署通过。后续再恢复完整的收入、成本、分摊、税金联动校验。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary" href={`/projects/${project.id}/summary`}>目标成本汇总表</Link><Link className="btn" href={`/projects/${project.id}`}>返回工作台</Link></div></div>
    <section className="card"><h2>当前状态</h2><p>系统主流程优先部署。完整校验功能稍后恢复。</p></section>
  </div></main>;
}
