import { describe, expect, it, vi } from 'vitest';
import {
  PROJECT_DELETED,
  listProjects,
  listTrashedProjects,
  getProject,
  restoreProject,
  trashProject
} from '../lib/project-service';

function mockProjectClient(project: Record<string, any>) {
  return { project } as any;
}

describe('project soft delete service', () => {
  it('lists only active projects by default', async () => {
    const db = mockProjectClient({
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([{ id: 'active-project', deletedAt: null }])
    });

    const result = await listProjects({}, db);

    expect(db.project.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deletedAt: null } }));
    expect(result.projects).toEqual([{ id: 'active-project', deletedAt: null }]);
    expect(result.meta.total).toBe(1);
  });

  it('lists only trashed projects ordered by deletedAt desc', async () => {
    const deletedAt = new Date('2026-07-04T12:00:00.000Z');
    const db = mockProjectClient({
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([{
        id: 'trashed-project',
        name: '已删除项目',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: deletedAt,
        deletedAt,
        deletedBy: null,
        deleteReason: '测试',
        purgeAfter: null,
        _count: { versions: 2 }
      }])
    });

    const result = await listTrashedProjects({}, db);

    expect(db.project.count).toHaveBeenCalledWith({ where: { deletedAt: { not: null } } });
    expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' }
    }));
    expect(result.projects[0]).toMatchObject({ id: 'trashed-project', status: 'trashed', versionCount: 2, versionsCount: 2 });
  });

  it('soft deletes a project without deleting related business data', async () => {
    const db = mockProjectClient({
      findUnique: vi.fn().mockResolvedValue({ id: 'project-1', deletedAt: null }),
      update: vi.fn().mockResolvedValue({
        id: 'project-1',
        deletedAt: new Date('2026-07-04T12:00:00.000Z'),
        deletedBy: null,
        deleteReason: '误建',
        purgeAfter: null
      })
    });

    const result = await trashProject('project-1', { deleteReason: '误建' }, db);

    expect(db.project.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'project-1' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        deletedBy: null,
        deleteReason: '误建',
        purgeAfter: null
      })
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.result.status).toBe('trashed');
  });

  it('blocks deleted projects from normal detail reads', async () => {
    const db = mockProjectClient({
      findUnique: vi.fn().mockResolvedValue({ id: 'project-1', deletedAt: new Date('2026-07-04T12:00:00.000Z') })
    });

    const result = await getProject('project-1', db);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(PROJECT_DELETED);
  });

  it('restores a trashed project by clearing soft delete fields', async () => {
    const db = mockProjectClient({
      findUnique: vi.fn().mockResolvedValue({ id: 'project-1', deletedAt: new Date('2026-07-04T12:00:00.000Z') }),
      update: vi.fn().mockResolvedValue({ id: 'project-1' })
    });

    const result = await restoreProject('project-1', db);

    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { deletedAt: null, deletedBy: null, deleteReason: null, purgeAfter: null },
      select: { id: true }
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.result.status).toBe('active');
  });
});
