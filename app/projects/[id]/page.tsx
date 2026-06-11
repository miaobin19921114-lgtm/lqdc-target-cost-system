import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const modules = [
  '项目概况',
  '测算控制中心',
  '目标成本汇总表',
  '目标成本测算',
  '收入明细表',
  '土地费用明细表',
  '前期费用明细表',
  '各专业明细表',
  '成本分摊测算表',
  '土地增值税测算表',
  '税金明细表',
  '成本科目及测算词典',
  '下拉字典',
  'Excel导入导出'
];

export default async function ProjectWorkBench({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, include: { versions: true } });
  if (!project) return <main className="page">项目不存在</main>;

  return (
    <main className="page">
      <div className="workbench">
        <aside className="sidebar">
          <p className="eyebrow">目标成本测算</p>
          <h2>{project.name}</h2>
          <p className="meta">{project.city} · {project.district}</p>
          <div className="nav-list">
            {modules.slice(0, 8).map((name, index) => (
              <a key={name} href={`#module-${index}`} className={`nav-item ${index === 0 ? 'active' : ''}`}>{name}</a>
            ))}
          </div>
          <div className="actions">
            <Link href="/projects" className="btn">返回项目列表</Link>
          </div>
        </aside>

        <section>
          <div className="page-header">
            <div>
              <p className="eyebrow">龙泉地产</p>
              <h1 className="title">{project.name}</h1>
              <p className="subtitle">按 V57 页面顺序搭建模块入口，后续接入最终 Excel 模板公式和明细底稿。</p>
            </div>
            <Link href={`/projects/${project.id}/export`} className="btn btn-primary">Excel 导入导出</Link>
          </div>

          <div className="summary-strip">
            <div className="stat"><div className="stat-label">总建筑面积</div><div className="stat-value">{Number(project.totalBuildingArea).toLocaleString()}㎡</div></div>
            <div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{Number(project.saleableArea).toLocaleString()}㎡</div></div>
            <div className="stat"><div className="stat-label">土地面积</div><div className="stat-value">{Number(project.landArea).toLocaleString()}㎡</div></div>
            <div className="stat"><div className="stat-label">版本数量</div><div className="stat-value">{project.versions.length}</div></div>
          </div>

          <div className="module-grid">
            {modules.map((name, index) => (
              <div id={`module-${index}`} key={name} className="module-card">
                <div className="module-no">{index + 1}</div>
                <h3>{name}</h3>
                <p className="meta">入口已预留，下一阶段接入定稿模板数据结构、公式和导出。</p>
                <span className="badge">V57 对应页面</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
