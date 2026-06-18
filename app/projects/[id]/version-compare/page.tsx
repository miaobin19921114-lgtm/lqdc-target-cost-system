import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function VersionComparePage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return <main className="page"><div className="container" style={{ maxWidth: 980 }}>
    <div className="page-header"><div><p className="eyebrow">版本对比</p><h1 className="title">{project.name}</h1><p className="subtitle">版本对比页已临时简化，先保证线上部署通过。后续再恢复完整对比功能。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/versions`} className="btn btn-primary">返回版本中心</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card"><h2>当前状态</h2><p>完整版本对比功能稍后恢复。</p></section>
  </div></main>;
}
