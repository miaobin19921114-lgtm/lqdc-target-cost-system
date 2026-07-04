import { prisma } from '@/lib/prisma';
import { defaultVersionStage } from '@/lib/version-stage';

type ProjectVersionOwner = {
  id: string;
  activeVersionId?: string | null;
};

export const VERSION_LOCKED_CODE = 'VERSION_LOCKED';
export const VERSION_LOCKED_MESSAGE = '当前版本已锁定，仅支持查看。如需调整数据，请复制为新版本后编辑。';

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

export function isVersionEditable(version: { status?: string | null; isLocked?: boolean | null } | null | undefined) {
  if (!version) return false;
  return !isVersionLocked(version) && !version.isLocked;
}

export function versionLockedJson(status = 423) {
  return Response.json({ success: false, error: { code: VERSION_LOCKED_CODE, message: VERSION_LOCKED_MESSAGE } }, { status });
}

export async function assertVersionEditable(projectId: string, versionId: string) {
  const version = await prisma.projectVersion.findFirst({
    where: { id: versionId, projectId },
    select: { id: true, projectId: true, status: true, isLocked: true }
  });
  if (!version) return { ok: false as const, response: Response.json({ success: false, error: { code: 'VERSION_NOT_FOUND', message: '测算版本不存在。' } }, { status: 404 }) };
  if (!isVersionEditable(version)) return { ok: false as const, response: versionLockedJson() };
  return { ok: true as const, version };
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
