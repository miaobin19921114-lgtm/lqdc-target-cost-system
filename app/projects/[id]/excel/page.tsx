import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getVersionStageLabel } from '@/lib/version-stage';
import { ExcelWorkspace } from './workspace';

export const dynamic = 'force-dynamic';

function statusText(status?: string | null) {
  if (status === 'locked') return '已锁定';
  if (status === 'final') return '定稿';
  return '草稿';
}

export default async function ProjectExcelPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const versionWhere = searchParams?.versionId
    ? { id: searchParams.versionId, projectId: project.id }
    : activeVersionWhere(project);
  const version = await prisma.projectVersion.findFirst({
    where: versionWhere,
    orderBy: searchParams?.versionId ? undefined : activeVersionOrder(project),
    select: { id: true, name: true, stage: true, status: true }
  });

  if (!version) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: 1180 }}>
          <section className="card">
            <h1 className="title">Excel 导入导出</h1>
            <p className="subtitle">当前项目还没有测算版本，请先创建版本后再使用 Excel 导入导出。</p>
            <Link href={`/projects/${project.id}/versions`} className="btn btn-primary">进入版本管理</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page" style={{ background: '#eef3f8' }}>
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Excel 导入导出</p>
            <h1 className="title">标准 V60 模板导入预览与完整导出</h1>
            <p className="subtitle">第一批仅支持标准 V60 母版：模板下载、上传解析预览、问题展示和当前项目版本完整 Excel 导出，不写入真实业务数据。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/versions`} className="btn">版本管理</Link>
            <Link href={`/projects/${project.id}`} className="btn btn-primary">返回项目测算中心</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 16 }}>
          <div className="summary-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="stat"><div className="stat-label">项目名称</div><div className="stat-value">{project.name}</div></div>
            <div className="stat"><div className="stat-label">当前版本</div><div className="stat-value">{version.name}</div></div>
            <div className="stat"><div className="stat-label">版本阶段</div><div className="stat-value">{getVersionStageLabel(version.stage)}</div></div>
            <div className="stat"><div className="stat-label">版本状态</div><div className="stat-value">{statusText(version.status)}</div></div>
          </div>
        </section>

        <ExcelWorkspace
          projectId={project.id}
          versionId={version.id}
          projectName={project.name}
          versionName={version.name}
          versionStatus={statusText(version.status)}
        />
      </div>
    </main>
  );
}
