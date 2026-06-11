import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, include: { versions: true } });

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">项目管理</p>
            <h1 className="title">项目列表</h1>
            <p className="subtitle">所有目标成本测算项目统一在这里管理。当前已接入 Railway + PostgreSQL 线上环境。</p>
          </div>
          <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
        </div>

        {projects.length === 0 ? (
          <section className="card">
            <h2>还没有项目</h2>
            <p className="meta">先新建一个项目，后续在项目工作台中录入概况、业态、收入、目标成本和税金。</p>
            <div className="actions">
              <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
            </div>
          </section>
        ) : (
          <div className="card-grid">
            {projects.map((project) => (
              <article key={project.id} className="card">
                <span className="badge">目标成本测算</span>
                <h2 style={{ marginTop: 12 }}>{project.name}</h2>
                <p className="meta">{project.city || '未填城市'} · {project.district || '未填区域'}</p>
                <div className="stat-grid">
                  <div className="stat"><div className="stat-label">总建面</div><div className="stat-value">{Number(project.totalBuildingArea).toLocaleString()}㎡</div></div>
                  <div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{Number(project.saleableArea).toLocaleString()}㎡</div></div>
                  <div className="stat"><div className="stat-label">版本数</div><div className="stat-value">{project.versions.length}</div></div>
                </div>
                <div className="actions">
                  <Link href={`/projects/${project.id}`} className="btn btn-primary">进入工作台</Link>
                  <Link href={`/projects/${project.id}/export`} className="btn">Excel 导出</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
