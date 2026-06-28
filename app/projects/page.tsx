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

const systemTemplateGroups = [
  {
    title: '项目测算模板',
    items: ['住宅开发测算模板', '商业开发测算模板', '产业园测算模板', '旧改/代建测算模板'],
    note: '系统默认项目模板，用于新建项目时快速套用业态、税率、科目和基础规则。'
  },
  {
    title: '目标成本模板',
    items: ['目标成本科目模板', '业态成本模板', '地区成本模板', '档次成本模板'],
    note: '系统默认成本科目、层级、编码和测算逻辑。'
  },
  {
    title: '合约招采模板',
    items: ['合同台账模板', '招采计划模板', '付款计划模板', '清标分析模板'],
    note: '系统默认合约、招采、付款和清标表单模板。'
  },
  {
    title: '审批流程模板',
    items: ['投决审批模板', '目标成本审批模板', '招采审批模板', '合同审批模板'],
    note: '系统默认审批表、审批节点和风控检查项。'
  },
  {
    title: '报告输出模板',
    items: ['经营报告模板', '投决报告模板', '敏感性报告模板', '税务报告模板'],
    note: '系统默认汇报模板，后续用于导出 Word、PDF 或老板汇报版。'
  },
  {
    title: 'AI提示词模板',
    items: ['成本复核提示词', '招标文件审查提示词', '合同风险审查提示词', '报告生成提示词'],
    note: '系统内置 AI 工作流提示词模板，后续可和个人知识库联动。'
  }
] as const;

export default async function ProjectsPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, include: { versions: { orderBy: { createdAt: 'asc' } } } });

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">地产成本智算平台</p>
            <h1 className="title">个人工作台</h1>
            <p className="subtitle">先管理项目，再沉淀个人知识库和系统模板；项目测算、知识沉淀、模板复用分层管理。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/knowledge" className="btn">个人知识库</Link>
            <Link href="/templates" className="btn">系统模板</Link>
            <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
          </div>
        </div>

        {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目已删除。</div> : null}

        <section className="card" style={{ marginBottom: 18, borderColor: '#c5eef3' }}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div>
              <p className="eyebrow">项目中心</p>
              <h2 style={{ margin: 0 }}>我的项目</h2>
              <p className="meta">优先进入项目测算中心，完成项目概况、收入、成本、税费、投决和报告。</p>
            </div>
            <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 18, background: '#f8fafc' }}>
              <h2 style={{ marginTop: 0 }}>还没有项目</h2>
              <p className="meta">先到模板中心确认默认模板，再新建项目并选择本项目需要的业态、科目和规则。</p>
              <div className="actions">
                <Link href="/templates" className="btn">模板中心</Link>
                <Link href="/projects/new" className="btn btn-primary">新建项目</Link>
              </div>
            </div>
          ) : (
            <div className="card-grid">
              {projects.map((project) => {
                const activeVersion = project.versions.find((item) => item.id === project.activeVersionId) || project.versions[0];
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
                    <Link href={`/projects/${project.id}`} className="btn btn-primary">进入项目测算中心</Link>
                    <Link href={`/projects/${project.id}/versions`} className="btn">版本管理</Link>
                    <form action={`/api/projects/${project.id}/delete`} method="post"><button className="btn" style={{ color: '#c92a2a' }}>删除项目</button></form>
                  </div>
                </article>;
              })}
            </div>
          )}
        </section>

        <section className="card" style={{ marginBottom: 18 }}>
          <div className="page-header" style={{ marginBottom: 10 }}>
            <div>
              <p className="eyebrow">个人知识库</p>
              <h2 style={{ margin: 0 }}>成本 / 招采 / 合约知识库</h2>
              <p className="meta">这些是跨项目复用的个人资产，先落位，后续按模块接入上传、标签、检索、AI问答。</p>
            </div>
            <div className="actions" style={{ marginTop: 0 }}><Link href="/knowledge" className="btn">进入知识库中心</Link><span className="badge">待接入</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {knowledgeGroups.map((group) => <div key={group.title} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b>{group.title}</b><span style={{ fontSize: 12, color: '#8a6d00', background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 999, padding: '3px 8px' }}>待接入</span></div>
              <p className="meta" style={{ minHeight: 42 }}>{group.note}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{group.items.map((item) => <span key={item} style={{ fontSize: 12, color: '#0f4c5c', background: '#e9f7f8', border: '1px solid #c5eef3', borderRadius: 999, padding: '5px 8px' }}>{item}</span>)}</div>
            </div>)}
          </div>
        </section>

        <section className="card" style={{ marginBottom: 18 }}>
          <div className="page-header" style={{ marginBottom: 10 }}>
            <div>
              <p className="eyebrow">系统模板</p>
              <h2 style={{ margin: 0 }}>系统模板中心</h2>
              <p className="meta">系统默认模板是底座，个人知识库是你的沉淀；后续新建项目优先选择系统模板，再叠加个人规则。</p>
            </div>
            <div className="actions" style={{ marginTop: 0 }}><Link href="/templates" className="btn">进入模板中心</Link><span className="badge">部分已接入</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {systemTemplateGroups.map((group) => <div key={group.title} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b>{group.title}</b><span style={{ fontSize: 12, color: '#8a6d00', background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 999, padding: '3px 8px' }}>待完善</span></div>
              <p className="meta" style={{ minHeight: 42 }}>{group.note}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{group.items.map((item) => <span key={item} style={{ fontSize: 12, color: '#344054', background: '#f2f4f7', border: '1px solid #e4e7ec', borderRadius: 999, padding: '5px 8px' }}>{item}</span>)}</div>
            </div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
