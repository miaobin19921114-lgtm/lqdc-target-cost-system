import { prisma } from '@/lib/prisma';

export const PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND';
export const PROJECT_DELETED = 'PROJECT_DELETED';
export const PROJECT_ALREADY_DELETED = 'PROJECT_ALREADY_DELETED';
export const PROJECT_NOT_DELETED = 'PROJECT_NOT_DELETED';
export const PROJECT_RESTORE_FAILED = 'PROJECT_RESTORE_FAILED';
export const PROJECT_TRASH_FAILED = 'PROJECT_TRASH_FAILED';
export const VALIDATION_FAILED = 'VALIDATION_FAILED';

export const PROJECT_DELETED_MESSAGE = '该项目已移入回收站，请先恢复后再查看或编辑。';

export const normalProjectsEmptyState = {
  reason: '暂无正常项目',
  nextAction: '请先新建项目。'
};

export const trashedProjectsEmptyState = {
  reason: '回收站暂无项目',
  nextAction: '删除项目后会在这里显示，可在此恢复。'
};

type ProjectClient = {
  project: {
    count: (args: any) => Promise<number>;
    findMany: (args: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
  };
};

type ListProjectsParams = {
  search?: string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
};

function parsePositiveInt(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function searchWhere(search?: string | null) {
  const keyword = String(search || '').trim();
  if (!keyword) return {};
  return {
    OR: [
      { name: { contains: keyword, mode: 'insensitive' } },
      { city: { contains: keyword, mode: 'insensitive' } },
      { district: { contains: keyword, mode: 'insensitive' } }
    ]
  };
}

export function jsonError(code: string, message: string, status = 400) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export async function listProjects(params: ListProjectsParams = {}, db: ProjectClient = prisma) {
  const page = parsePositiveInt(params.page, 1);
  const pageSize = parsePositiveInt(params.pageSize, 50);
  const where = { deletedAt: null, ...searchWhere(params.search) };
  const [total, projects] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { versions: { orderBy: { createdAt: 'asc' } } }
    })
  ]);

  return {
    projects,
    meta: { total, count: projects.length, page, pageSize },
    emptyState: projects.length === 0 ? normalProjectsEmptyState : null
  };
}

export async function getProject(projectId: string, db: ProjectClient = prisma) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false as const, code: PROJECT_NOT_FOUND, message: '项目不存在。', status: 404 };
  if (project.deletedAt) return { ok: false as const, code: PROJECT_DELETED, message: PROJECT_DELETED_MESSAGE, status: 404 };
  return { ok: true as const, project };
}

export async function trashProject(projectId: string, options: { deletedBy?: string | null; deleteReason?: string | null } = {}, db: ProjectClient = prisma) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true, deletedBy: true, deleteReason: true, purgeAfter: true }
  });

  if (!project) return { ok: false as const, code: PROJECT_NOT_FOUND, message: '项目不存在。', status: 404 };
  if (project.deletedAt) {
    return {
      ok: true as const,
      alreadyDeleted: true,
      code: PROJECT_ALREADY_DELETED,
      result: {
        projectId: project.id,
        deletedAt: project.deletedAt,
        deletedBy: project.deletedBy,
        deleteReason: project.deleteReason,
        purgeAfter: project.purgeAfter,
        status: 'trashed'
      }
    };
  }

  try {
    const deletedAt = new Date();
    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        deletedAt,
        deletedBy: options.deletedBy ?? null,
        deleteReason: options.deleteReason?.trim() || null,
        purgeAfter: null
      },
      select: { id: true, deletedAt: true, deletedBy: true, deleteReason: true, purgeAfter: true }
    });

    return {
      ok: true as const,
      alreadyDeleted: false,
      result: {
        projectId: updated.id,
        deletedAt: updated.deletedAt,
        deletedBy: updated.deletedBy,
        deleteReason: updated.deleteReason,
        purgeAfter: updated.purgeAfter,
        status: 'trashed'
      }
    };
  } catch {
    return { ok: false as const, code: PROJECT_TRASH_FAILED, message: '项目移入回收站失败。', status: 500 };
  }
}

export async function listTrashedProjects(params: ListProjectsParams = {}, db: ProjectClient = prisma) {
  const page = parsePositiveInt(params.page, 1);
  const pageSize = parsePositiveInt(params.pageSize, 50);
  const where = { deletedAt: { not: null }, ...searchWhere(params.search) };
  const [total, rows] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy: { deletedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedBy: true,
        deleteReason: true,
        purgeAfter: true,
        _count: { select: { versions: true } }
      }
    })
  ]);
  const projects = rows.map((project) => ({
    id: project.id,
    name: project.name,
    code: null,
    status: 'trashed',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    deletedAt: project.deletedAt,
    deletedBy: project.deletedBy,
    deleteReason: project.deleteReason,
    purgeAfter: project.purgeAfter,
    versionCount: project._count?.versions || 0,
    versionsCount: project._count?.versions || 0
  }));

  return {
    projects,
    meta: { total, count: projects.length, page, pageSize },
    emptyState: projects.length === 0 ? trashedProjectsEmptyState : null
  };
}

export async function restoreProject(projectId: string, db: ProjectClient = prisma) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true }
  });

  if (!project) return { ok: false as const, code: PROJECT_NOT_FOUND, message: '项目不存在。', status: 404 };
  if (!project.deletedAt) {
    return {
      ok: true as const,
      alreadyActive: true,
      code: PROJECT_NOT_DELETED,
      result: { projectId: project.id, status: 'active', restoredAt: new Date() }
    };
  }

  try {
    const restoredAt = new Date();
    await db.project.update({
      where: { id: projectId },
      data: { deletedAt: null, deletedBy: null, deleteReason: null, purgeAfter: null },
      select: { id: true }
    });
    return {
      ok: true as const,
      alreadyActive: false,
      result: { projectId: project.id, status: 'active', restoredAt }
    };
  } catch {
    return { ok: false as const, code: PROJECT_RESTORE_FAILED, message: '项目恢复失败。', status: 500 };
  }
}
