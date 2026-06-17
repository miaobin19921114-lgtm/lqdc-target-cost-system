import type { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { ProjectRouteNav } from '@/components/project-route-nav';

export const dynamic = 'force-dynamic';

export default async function ProjectLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });

  return <>
    <style>{`.global-account-bar{display:none}`}</style>
    {project ? <ProjectRouteNav projectId={project.id} projectName={project.name} /> : null}
    {children}
  </>;
}
