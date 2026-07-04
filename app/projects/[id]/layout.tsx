import type { ReactNode } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProjectRouteNav } from '@/components/project-route-nav';
import { PROJECT_DELETED_MESSAGE } from '@/lib/project-service';

export const dynamic = 'force-dynamic';

export default async function ProjectLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true, deletedAt: true } });

  if (project?.deletedAt) {
    return <>
      <style>{`.global-account-bar{display:none}`}</style>
      <main className="page">
        <div className="container">
          <section className="card" style={{ maxWidth: 720 }}>
            <p className="eyebrow">项目回收站</p>
            <h1 className="title" style={{ marginTop: 0 }}>无法进入项目测算中心</h1>
            <p className="subtitle">{PROJECT_DELETED_MESSAGE}</p>
            <div className="actions">
              <Link href="/projects" className="btn btn-primary">返回项目中心</Link>
              <Link href="/projects" className="btn">打开回收站恢复</Link>
            </div>
          </section>
        </div>
      </main>
    </>;
  }

  return <>
    <style>{`.global-account-bar{display:none}`}</style>
    {project ? <ProjectRouteNav projectId={project.id} projectName={project.name} /> : null}
    {children}
  </>;
}
