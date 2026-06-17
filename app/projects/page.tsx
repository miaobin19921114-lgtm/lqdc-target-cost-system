import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, include: { versions: { orderBy: { createdAt: 'asc' } } } });

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">个人项目中心</p>
            <h1 className="title">项目中心</h1>
            <p className="subtitle">这里是个人层级的项目入口，用于新建、选择、管理项目；进入具体项目后再进入“项目测算中心”。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/templates" className="btn">模板中心</Link>
            <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
          </div>
        </div>

        {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目已删除。</div> : null}

        {projects.length === 0 ? (
          <section className="card">
            <h2>还没有项目</h2>
            <p className="meta">先到模板中心确认默认模板，再新建项目并选择本项目需要的业态、科目和规则。</p>
            <div className="actions">
              <Link href="/templates" className="btn">模板中心</Link>
              <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
            </div>
          </section>
        ) : (
          <div className="card-grid">
            {projects.map((project) => {
              const activeVersion = project.versions.find((item) => item.id === project.activeVersionId) || project.versions[0];
              return <article key={project.id} className="card">
                <span className="badge">{activeVersion?.stage || '投拓阶段'}</span>
                <h2 style={{ marginTop: 12 }}>{project.name}</h2>
                <p className="meta">{project.city || '未填城市'} · {project.district || '未填区域'} · 当前：{activeVersion?.name || '初始版本'}</p>
                <div className="stat-grid">
                  <div className="stat"><div className="stat-label">总建面</div><div className="stat-value">{Number(project.totalBuildingArea).toLocaleString()}㎡</div></div>
                  <div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{Number(project.saleableArea).toLocaleString()}㎡</div></div>
                  <div className="stat"><div className="stat-label">版本数</div><div className="stat-value">{project.versions.length}</div></div>
                </div>
                <div className="actions">
                  <Link href={`/projects/${project.id}`} className="btn btn-primary">进入项目测算中心</Link>
                  <Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link>
                  <Link href={`/projects/${project.id}/versions`} className="btn">版本管理</Link>
                  <form action={`/api/projects/${project.id}/delete`} method="post"><button className="btn" style={{ color: '#c92a2a' }}>删除项目</button></form>
                </div>
              </article>;
            })}
          </div>
        )}
      </div>
    </main>
  );
}
