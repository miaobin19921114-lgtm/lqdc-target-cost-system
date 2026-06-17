import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { projectNavGroups } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function revenueAmount(products: any[]) {
  return products.filter((item) => item.isActive && item.isSaleable).reduce((sum, item) => sum + Number(item.saleableArea || 0) * Number(item.salePrice || 0), 0);
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.templateSaved) return <div style={{ background: '#f0fff4', border: '1px solid #b2f2bb', borderRadius: 10, padding: 12, color: '#2b8a3e' }}>已将当前项目反向沉淀为个人模板，可在模板中心查看和编辑。</div>;
  if (searchParams?.templateMissing) return <div style={{ background: '#fff9db', border: '1px solid #ffe066', borderRadius: 10, padding: 12, color: '#8a6d00' }}>模板沉淀失败：项目版本或登录状态异常。</div>;
  return null;
}

export default async function ProjectMeasureCenter({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = project.activeVersionId
    ? await prisma.projectVersion.findFirst({ where: { id: project.activeVersionId, projectId: params.id }, include: { products: true, costs: { include: { productType: true } }, costRules: true } })
    : await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' }, include: { products: true, costs: { include: { productType: true } }, costRules: true } });

  const products = version?.products || [];
  const activeProducts = products.filter((item) => item.isActive);
  const costs = version?.costs || [];
  const revenue = revenueAmount(products);
  const cost = costs.filter((row) => !row.productTypeId || row.productType?.isActive).reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const defaultTemplateName = `${project.name}-${version?.stage || '当前阶段'}模板`;
  const sourceTemplateLabel = project.sourceTemplateName ? `${project.sourceTemplateName}（${project.sourceTemplateType || '模板'}）` : '未记录，可能为历史项目或手工创建';
  const plannedItems = projectNavGroups.flatMap((group) => group.items.filter(([, , status]) => status === 'planned').map(([name]) => name));

  const coreActions = [
    ['经营总控', 'dashboard-lite'],
    ['投决评审', 'decision'],
    ['经营报告', 'report'],
    ['目标成本编制', 'costs-batch'],
    ['收入明细', 'revenue'],
    ['税务报告', 'tax-report']
  ] as const;
  const flow = [
    ['1 项目概况', 'overview', '维护地块、指标、面积、车位等基础数据'],
    ['2 收入测算', 'revenue', '维护可售面积、销售单价、含税收入'],
    ['3 成本测算', 'costs-batch', '录入目标成本和各专业明细'],
    ['4 税务分摊', 'tax-report', '检查增值税、土增税、所得税和分摊'],
    ['5 投决报告', 'decision', '输出投决评级、经营报告和打印版报告']
  ] as const;
  const tools = [
    ['Excel导入导出', 'export'],
    ['导入批次', 'import-batches'],
    ['科目映射', 'cost-mapping'],
    ['汇总校验', 'summary-check'],
    ['模板中心', '/templates']
  ] as const;

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', color: '#102033' }}>
      <div style={{ minHeight: 52, background: '#12384b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0b7285', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>源</div>
          <div><b>源信达地产目标成本测算系统</b><div style={{ fontSize: 11, opacity: .75 }}>项目测算中心</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link href="/projects" className="btn" style={{ minHeight: 34, color: '#fff', background: 'transparent', borderColor: 'rgba(255,255,255,.35)' }}>返回项目中心</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>经营总控</Link><Link href={`/projects/${project.id}/decision`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>投决评审</Link></div>
      </div>

      <div className="sys-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: 12 }}>
        <aside style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2ec', background: '#f8fafc' }}><div style={{ fontSize: 12, color: '#667085' }}>当前项目</div><b>{project.name}</b><div style={{ color: '#667085', fontSize: 12 }}>{project.city || '未填城市'} · {project.district || '未填区域'} · {version?.stage || '投拓阶段'}</div><div style={{ marginTop: 8, fontSize: 12, color: '#0b7285' }}>来源：{sourceTemplateLabel}</div></div>
          <div style={{ padding: 10 }}>{projectNavGroups.map((group) => <div key={group.title} style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: '#667085', fontWeight: 800, padding: 8 }}>{group.title}</div>{group.items.map(([name, href, status]) => href ? <Link key={`${group.title}-${name}`} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, fontSize: 14 }}><span>{name}</span><span style={{ color: '#0b7285' }}>›</span></Link> : <div key={`${group.title}-${name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 14, color: '#98a2b3', background: status === 'planned' ? '#f8fafc' : undefined }}><span>{name}</span><span style={{ fontSize: 12 }}>待接入</span></div>)}</div>)}</div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatusMessage searchParams={searchParams} />
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12 }}>项目测算中心</div><h1 style={{ margin: '6px 0', fontSize: 24 }}>{project.name}</h1><div style={{ color: '#667085', fontSize: 14 }}>当前阶段：{version?.stage || '投拓阶段'}　版本：{version?.name || '初始版本'}　状态：草稿　启用业态：{activeProducts.length} 个　科目规则：{version?.costRules.length || 0} 条</div><div style={{ color: '#0b7285', fontSize: 13, marginTop: 6 }}>项目来源模板：{sourceTemplateLabel}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{coreActions.map(([name, href]) => <Link key={name} href={`/projects/${project.id}/${href}`} className="btn btn-primary" style={{ minHeight: 34 }}>{name}</Link>)}</div></div>
          <div className="sys-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[['含税销售收入', revenue], ['含税目标成本', cost], ['建面单方', buildingArea ? cost / buildingArea : 0], ['可售单方', saleableArea ? cost / saleableArea : 0]].map(([label, value]) => <div key={String(label)} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#667085', fontSize: 12 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(Number(value))}</div></div>)}</div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>测算主流程</b><div className="sys-flow" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 12 }}>{flow.map(([name, href, desc]) => <Link key={name} href={`/projects/${project.id}/${href}`} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#f8fafc' }}><b style={{ display: 'block' }}>{name}</b><div style={{ color: '#667085', fontSize: 12, marginTop: 8 }}>{desc}</div></Link>)}</div></div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>系统工具</b><div className="actions">{tools.map(([name, href]) => <Link key={name} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} className="btn">{name}</Link>)}</div></div>
          <div style={{ background: '#fff', border: '1px solid #ffd8a8', borderRadius: 10, padding: 14 }}><b>已规划但待接入功能</b><p className="meta">这些功能先落位，后续按模块逐步开发，不再临时乱加入口。</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{plannedItems.map((name) => <span key={name} style={{ border: '1px solid #ffd8a8', background: '#fff9db', borderRadius: 999, padding: '6px 10px', fontSize: 12, color: '#8a6d00' }}>{name}</span>)}</div></div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ background: '#fff', border: '1px solid #ffd8a8', borderRadius: 10, padding: 14 }}><b>常用报告</b><p className="meta">投决、经营、敏感性、税务报告集中在这里，方便打印汇报。</p><div className="actions"><Link className="btn btn-primary" href={`/projects/${project.id}/decision`}>投决评审</Link><Link className="btn" href={`/projects/${project.id}/report-print`}>打印经营报告</Link><Link className="btn" href={`/projects/${project.id}/sensitivity-report`}>敏感性报告</Link><Link className="btn" href={`/projects/${project.id}/tax-report`}>税务报告</Link></div></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>版本控制</b><p className="meta">当前阶段：{version?.stage || '投拓阶段'}；当前版本：{version?.name || '初始版本'}；状态：草稿。</p><Link className="btn btn-primary" href={`/projects/${project.id}/versions`}>进入版本管理</Link></div><div style={{ background: '#fff', border: '1px solid #b2f2bb', borderRadius: 10, padding: 14 }}><b>沉淀为个人模板</b><p className="meta">把当前项目的启用业态、项目科目规则和税率规则保存为个人模板，后续新项目可复用。</p><form action={`/api/projects/${project.id}/save-template`} method="post" style={{ display: 'grid', gap: 8 }}><input name="name" defaultValue={defaultTemplateName} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="type" defaultValue="项目沉淀模板" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="description" placeholder="模板说明，可不填" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><button className="btn btn-primary">一键保存为模板</button></form></div><div style={{ background: '#fff', border: '1px solid #d0ebff', borderRadius: 10, padding: 14 }}><b>模板来源</b><p className="meta">{sourceTemplateLabel}</p>{project.sourceTemplateId ? <Link className="btn" href="/templates">查看模板中心</Link> : null}</div></aside>
      </div>
      <style>{`@media (max-width: 1100px){.sys-shell,.sys-kpis,.sys-flow{grid-template-columns:1fr!important}.sys-shell{padding:8px!important}}`}</style>
    </main>
  );
}
