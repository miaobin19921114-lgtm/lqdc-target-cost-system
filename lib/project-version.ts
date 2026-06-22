import { prisma } from '@/lib/prisma';
import { defaultVersionStage } from '@/lib/version-stage';

type ProjectVersionOwner = {
  id: string;
  activeVersionId?: string | null;
};

export function activeVersionWhere(project: ProjectVersionOwner) {
  return project.activeVersionId
    ? { id: project.activeVersionId, projectId: project.id }
    : { projectId: project.id };
}

export function activeVersionOrder(project: ProjectVersionOwner) {
  return project.activeVersionId ? undefined : ({ createdAt: 'asc' } as const);
}

export function isVersionLocked(version: { status?: string | null }) {
  return version.status === 'locked' || version.status === 'final';
}

export async function getOrCreateActiveVersion(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, activeVersionId: true }
  });

  if (!project) return null;

  if (project.activeVersionId) {
    const active = await prisma.projectVersion.findFirst({
      where: { id: project.activeVersionId, projectId }
    });
    if (active) return active;
  }

  const first = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });

  if (first) {
    if (!project.activeVersionId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { activeVersionId: first.id }
      });
    }
    return first;
  }

  const created = await prisma.projectVersion.create({
    data: { projectId, name: '初始版本', stage: defaultVersionStage, status: 'draft' }
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { activeVersionId: created.id }
  });

  return created;
}

export async function getEditableActiveVersion(projectId: string) {
  const version = await getOrCreateActiveVersion(projectId);
  if (!version) return { version: null, locked: false };
  return { version, locked: isVersionLocked(version) };
}
