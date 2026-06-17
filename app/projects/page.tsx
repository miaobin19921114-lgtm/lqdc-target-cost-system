import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const knowledgeGroups = [
  {
    title: '成本指标库',
    items: ['单价指标库', '成本科目库', '建安指标库', '目标成本模板库'],
    note: '沉淀不同业态、地区、档次的成本单方和科目口径。'
  },
  {
    title: '工程量知识库',
    items: ['工程量指标库', '清单做法库', '含量指标库', '图纸测算规则库'],
    note: '沉淀基底面积、景观面积、周界、单元数、电梯数等测算依据。'
  },
  {
    title: '招采知识库',
    items: ['招标文件库', '清标问题库', '评标办法库', '供应商/分包库'],
    note: '沉淀招标文件、清标问题、询价记录和供应商资料。'
  },
  {
    title: '合约知识库',
    items: ['合同模板库', '合同条款库', '付款条件库', '变更签证案例库'],
    note: '沉淀总包、分包、材料设备、咨询合同及关键条款。'
  },
  {
    title: '审批表知识库',
    items: ['立项审批表', '招采审批表', '合同审批表', '付款审批表'],
    note: '沉淀成本、招采、合约、付款审批模板。'
  },
  {
    title: 'AI资料库',
    items: ['项目资料库', '市场资料库', '政策税务库', '个人经验库'],
    note: '后续可作为个人AI成本助手的投喂资料。'
  }
] as const;

export default async function ProjectsPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, include: { versions: { orderBy: { createdAt: 'asc' } } } });

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">个人工作台</p>
            <h1 className="title">项目中心与个人知识库</h1>
            <p className="subtitle">个人层级用于管理项目、模板和跨项目复用的成本招采合约知识库；进入具体项目后再进入“项目测算中心”。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/templates" className="btn">模板中心</Link>
            <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
          </div>
        </div>

        {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目已删除。</div> : null}

        <section className="card" style={{ marginBottom: 18 }}>
          <div className="page-header" style={{ marginBottom: 10 }}>
            <div>
              <p className="eyebrow">个人知识库</p>
              <h2 style={{ margin: 0 }}>成本 / 招采 / 合约知识库</h2>
              <p className="meta">这些是跨项目复用的个人资产，先落位，后续按模块接入上传、标签、检索、AI问答。</p>
            </div>
            <span className="badge">待接入</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {knowledgeGroups.map((group) => <div key={group.title} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b>{group.title}</b><span style={{ fontSize: 12, color: '#8a6d00', background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 999, padding: '3px 8px' }}>待接入</span></div>
              <p className="meta" style={{ minHeight: 42 }}>{group.note}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{group.items.map((item) => <span key={item} style={{ fontSize: 12, color: '#0f4c5c', background: '#e9f7f8', border: '1px solid #c5eef3', borderRadius: 999, padding: '5px 8px' }}>{item}</span>)}</div>
            </div>)}
          </div>
        </section>

        <div className="page-header" style={{ marginBottom: 12 }}>
          <div>
            <p className="eyebrow">项目中心</p>
            <h2 style={{ margin: 0 }}>我的项目</h2>
          </div>
          <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
        </div>

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
