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
            <p className="subtitle">个人/小团队目标成本测算项目统一管理；新建项目先选默认模板，再生成项目测算框架。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/templates" className="btn">后台模板中心</Link>
            <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <section className="card">
            <h2>还没有项目</h2>
            <p className="meta">先到模板中心确认默认模板，再新建项目并选择本项目需要的业态、科目和规则。</p>
            <div className="actions">
              <Link href="/templates" className="btn">后台模板中心</Link>
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
