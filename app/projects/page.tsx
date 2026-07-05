import Link from 'next/link';
import { listProjects } from '@/lib/project-service';
import { NON_V1_SCOPE_MESSAGE } from '@/lib/v1-maintenance-copy';
import { MoveProjectToTrashButton, ProjectTrashPanel } from '@/components/project-recycle-actions';

export const dynamic = 'force-dynamic';

const laterVersionCards = [
  '个人知识库',
  '系统模板',
  'AI 资料库',
  '招采知识库',
  '合约知识库',
  '审批表知识库',
  'AI 深度测算',
  '动态成本',
  '合约规划',
  '招采管理',
  '现金流',
  '审批流',
  '多租户 SaaS',
  'CAD 图纸识别',
  '移动端 App',
  '复杂权限',
  '指标库大平台',
  '量价指标库',
  '市场价格库',
  '历史项目库',
  '高级老板看板'
] as const;

export default async function ProjectsPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const { projects } = await listProjects();

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">项目中心</p>
            <h1 className="title">项目中心</h1>
            <p className="subtitle">管理地产目标成本测算项目，进入测算中心维护概况、收入、成本、税费、版本和 Excel 交付。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
          </div>
        </div>

        {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目已移入回收站。</div> : null}

        <section className="card" style={{ marginBottom: 18, borderColor: '#c5eef3' }}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div>
              <p className="eyebrow">项目中心</p>
              <h2 style={{ margin: 0 }}>我的项目</h2>
              <p className="meta">优先进入项目测算中心，完成目标成本测算、Excel 导入导出、成本汇总分析、税费利润分析和版本管理。</p>
            </div>
            <ProjectTrashPanel />
          </div>

          {projects.length === 0 ? (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 18, background: '#f8fafc' }}>
              <h2 style={{ marginTop: 0 }}>还没有项目</h2>
              <p className="meta">请先新建项目，再进入项目测算中心维护基础数据、收入、成本、税费和 Excel 数据。</p>
              <div className="actions">
                <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
              </div>
            </div>
          ) : (
            <div className="card-grid">
              {projects.map((project) => {
                const activeVersion = project.versions.find((item: { id: string }) => item.id === project.activeVersionId) || project.versions[0];
                return <article key={project.id} className="card" style={{ background: '#fff' }}>
                  <span className="badge">{activeVersion?.stage || '投拓阶段'}</span>
                  <h2 style={{ marginTop: 12 }}>{project.name}</h2>
                  <p className="meta">{project.city || '未填城市'} · {project.district || '未填区域'} · 当前：{activeVersion?.name || '初始版本'}</p>
                  <div className="stat-grid">
                    <div className="stat"><div className="stat-label">总建面</div><div className="stat-value">{Number(project.totalBuildingArea).toLocaleString()}㎡</div></div>
                    <div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{Number(project.saleableArea).toLocaleString()}㎡</div></div>
                    <div className="stat"><div className="stat-label">版本数</div><div className="stat-value">{project.versions.length}</div></div>
                  </div>
                  <div className="actions">
                    <Link href={`/projects/${project.id}`} className="btn btn-primary">进入测算</Link>
                    <Link href={`/projects/${project.id}/versions`} className="btn">版本管理</Link>
                    <MoveProjectToTrashButton projectId={project.id} projectName={project.name} />
                  </div>
                </article>;
              })}
            </div>
          )}
        </section>

        <section className="card" style={{ marginBottom: 18 }}>
          <div className="page-header" style={{ marginBottom: 10 }}>
            <div>
              <p className="eyebrow">暂未开放</p>
              <h2 style={{ margin: 0 }}>知识库与模板能力</h2>
              <p className="meta">{NON_V1_SCOPE_MESSAGE}</p>
            </div>
            <span className="badge">建设中</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {laterVersionCards.map((name) => <div key={name} style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b>{name}</b><span style={{ fontSize: 12, color: '#8a6d00', background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 999, padding: '3px 8px' }}>后续版本</span></div>
              <p className="meta">{NON_V1_SCOPE_MESSAGE}</p>
            </div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
