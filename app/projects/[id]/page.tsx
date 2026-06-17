import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const groups = [
  ['项目基础', [
    ['项目概况（含业态/产品构成）', 'overview'],
    ['业态增减维护', 'product-maintenance'],
    ['版本管理', 'versions'],
    ['车位配置表', 'parking'],
    ['测算控制中心', 'dashboard-lite'],
    ['投资决策评审', 'decision'],
    ['经营测算报告', 'report'],
    ['经营报告打印版', 'report-print']
  ]],
  ['收入与成本', [
    ['收入明细表', 'revenue'],
    ['土地费用明细表', 'land'],
    ['前期费用明细表', 'pre-costs'],
    ['土建明细表', 'building-details'],
    ['安装明细表', 'installation-details'],
    ['设备明细表', 'equipment-details'],
    ['精装修明细表', 'fitout-details'],
    ['室外管网明细表', 'outdoor-pipe-details'],
    ['景观工程明细表', 'landscape-details'],
    ['道路总平明细表', 'road-details'],
    ['围墙出入口明细表', 'wall-gate-details'],
    ['销售费用明细表', 'sales-expense-details'],
    ['管理费用明细表', 'admin-expense-details'],
    ['财务费用明细表', 'finance-expense-details'],
    ['目标成本编制', 'costs-batch'],
    ['目标成本汇总表', 'summary']
  ]],
  ['税务与分摊', [
    ['成本分摊测算表', 'cost-allocation'],
    ['土地增值税测算表', 'land-vat'],
    ['税金明细表', 'tax-details'],
    ['业态经营利润测算表', 'profit-analysis'],
    ['敏感性测算表', 'sensitivity'],
    ['敏感性报告打印版', 'sensitivity-report'],
    ['汇总联动校验', 'summary-check']
  ]],
  ['系统资料', [
    ['系统校验', 'check'],
    ['产品库 / 业态配置标准', 'product-library'],
    ['成本科目及测算词典', 'cost-dictionary'],
    ['成本科目映射', 'cost-mapping'],
    ['下拉字典', ''],
    ['Excel导入导出', 'export']
  ]]
] as const;

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

export default async function ProjectWorkBench({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
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
  const quick = [
    ['项目概况', 'overview'],
    ['业态维护', 'product-maintenance'],
    ['版本管理', 'versions'],
    ['测算控制中心', 'dashboard-lite'],
    ['投决评审', 'decision'],
    ['经营报告', 'report'],
    ['打印报告', 'report-print'],
    ['敏感性', 'sensitivity'],
    ['敏感性报告', 'sensitivity-report'],
    ['系统校验', 'check'],
    ['目标成本编制', 'costs-batch'],
    ['汇总联动校验', 'summary-check'],
    ['成本科目映射', 'cost-mapping'],
    ['收入明细', 'revenue'],
    ['土地费用', 'land'],
    ['前期费用', 'pre-costs'],
    ['土建明细', 'building-details'],
    ['安装明细', 'installation-details'],
    ['精装修', 'fitout-details'],
    ['景观工程', 'landscape-details'],
    ['成本分摊', 'cost-allocation'],
    ['土增税', 'land-vat'],
    ['税金明细', 'tax-details'],
    ['业态利润', 'profit-analysis']
  ] as const;

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', color: '#102033' }}>
      <div style={{ height: 52, background: '#12384b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0b7285', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>源</div>
          <div><b>源信达地产目标成本测算系统</b><div style={{ fontSize: 11, opacity: .75 }}>Target Cost Management</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><Link href={`/projects/${project.id}/decision`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>投决评审</Link><Link href={`/projects/${project.id}/sensitivity-report`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>敏感性报告</Link><Link href={`/projects/${project.id}/report-print`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>打印报告</Link><Link href={`/projects/${project.id}/report`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>经营报告</Link><Link href={`/projects/${project.id}/sensitivity`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>敏感性</Link><Link href={`/projects/${project.id}/export`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>导入/导出</Link><Link href="/projects" className="btn" style={{ minHeight: 34, color: '#fff', background: 'transparent', borderColor: 'rgba(255,255,255,.35)' }}>项目列表</Link></div>
      </div>

      <div className="sys-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: 12 }}>
        <aside style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2ec', background: '#f8fafc' }}><div style={{ fontSize: 12, color: '#667085' }}>当前项目</div><b>{project.name}</b><div style={{ color: '#667085', fontSize: 12 }}>{project.city || '未填城市'} · {project.district || '未填区域'} · {version?.stage || '投拓阶段'}</div><div style={{ marginTop: 8, fontSize: 12, color: '#0b7285' }}>来源：{sourceTemplateLabel}</div></div>
          <div style={{ padding: 10 }}>{groups.map(([title, items]) => <div key={title} style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: '#667085', fontWeight: 800, padding: 8 }}>{title}</div>{items.map(([name, href]) => href ? <Link key={name} href={`/projects/${project.id}/${href}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, fontSize: 14 }}><span>{name}</span><span style={{ color: '#0b7285' }}>›</span></Link> : <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', color: '#98a2b3', fontSize: 14 }}><span>{name}</span><span>待接入</span></div>)}</div>)}</div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatusMessage searchParams={searchParams} />
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12 }}>源信达目标成本测算工作台</div><h1 style={{ margin: '6px 0', fontSize: 24 }}>{project.name}</h1><div style={{ color: '#667085', fontSize: 14 }}>当前阶段：{version?.stage || '投拓阶段'}　版本：{version?.name || '初始版本'}　状态：草稿　启用业态：{activeProducts.length} 个　科目规则：{version?.costRules.length || 0} 条</div><div style={{ color: '#0b7285', fontSize: 13, marginTop: 6 }}>项目来源模板：{sourceTemplateLabel}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{quick.map(([name, href]) => <Link key={name} href={`/projects/${project.id}/${href}`} className="btn btn-primary" style={{ minHeight: 34 }}>{name}</Link>)}</div></div>
          <div className="sys-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[['含税销售收入', revenue], ['含税目标成本', cost], ['建面单方', buildingArea ? cost / buildingArea : 0], ['可售单方', saleableArea ? cost / saleableArea : 0]].map(([label, value]) => <div key={String(label)} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#667085', fontSize: 12 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(Number(value))}</div></div>)}</div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>成本测算主流程</b><div className="sys-flow" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>{quick.map(([name, href], index) => <Link key={name} href={`/projects/${project.id}/${href}`} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#f8fafc' }}><div style={{ width: 26, height: 26, borderRadius: 6, background: '#e9f7f8', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{index + 1}</div><b style={{ display: 'block', marginTop: 10 }}>{name}</b><div style={{ color: '#667085', fontSize: 12 }}>进入维护</div></Link>)}</div></div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ background: '#fff', border: '1px solid #ffd8a8', borderRadius: 10, padding: 14 }}><b>投决评审</b><p className="meta">集中查看项目能不能投、为什么、风险在哪里、下一步怎么做。</p><Link className="btn btn-primary" href={`/projects/${project.id}/decision`}>进入投决评审</Link></div><div style={{ background: '#fff', border: '1px solid #ffd8a8', borderRadius: 10, padding: 14 }}><b>敏感性打印报告</b><p className="meta">输出敏感性结论、盈亏平衡、压力情景、二维矩阵和签批区。</p><Link className="btn btn-primary" href={`/projects/${project.id}/sensitivity-report`}>进入敏感性报告</Link></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>版本控制</b><p className="meta">当前阶段：{version?.stage || '投拓阶段'}；当前版本：{version?.name || '初始版本'}；状态：草稿。</p><Link className="btn btn-primary" href={`/projects/${project.id}/versions`}>进入版本管理</Link></div><div style={{ background: '#fff', border: '1px solid #d0ebff', borderRadius: 10, padding: 14 }}><b>模板来源</b><p className="meta">{sourceTemplateLabel}</p>{project.sourceTemplateId ? <Link className="btn" href="/templates">查看模板中心</Link> : null}</div><div style={{ background: '#fff', border: '1px solid #b2f2bb', borderRadius: 10, padding: 14 }}><b>沉淀为个人模板</b><p className="meta">把当前项目的启用业态、项目科目规则和税率规则保存为个人模板，后续新项目可复用。</p><form action={`/api/projects/${project.id}/save-template`} method="post" style={{ display: 'grid', gap: 8 }}><input name="name" defaultValue={defaultTemplateName} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="type" defaultValue="项目沉淀模板" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="description" placeholder="模板说明，可不填" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><button className="btn btn-primary">一键保存为模板</button></form></div><div style={{ background: '#fff', border: '1px solid #ffd8a8', borderRadius: 10, padding: 14 }}><b>敏感性测算</b><p className="meta">测试售价下降、成本上升、土地成本变化对税后利润和净利率的影响。</p><Link className="btn btn-primary" href={`/projects/${project.id}/sensitivity`}>进入敏感性测算</Link></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>经营报告</b><p className="meta">汇总收入、成本、税费、业态利润和风险提示，可直接浏览器打印或另存 PDF。</p><Link className="btn btn-primary" href={`/projects/${project.id}/report`}>进入经营报告</Link></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>汇总联动</b><p className="meta">新增“汇总联动校验”，用于检查明细回写、汇总穿透和税额平衡。</p><Link className="btn btn-primary" href={`/projects/${project.id}/summary-check`}>进入校验</Link></div></aside>
      </div>
      <style>{`@media (max-width: 980px){.sys-shell,.sys-kpis,.sys-flow{grid-template-columns:1fr!important}.sys-shell{padding:8px!important}}`}</style>
    </main>
  );
}
