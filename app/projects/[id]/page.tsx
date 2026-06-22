import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { projectNavGroups } from '@/components/project-navigation';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, n, revenueFromProjectData } from '@/lib/tax-summary';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';

export const dynamic = 'force-dynamic';

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function unitCost(amountWan: number, area: number) {
  return area ? amountWan * 10000 / area : 0;
}

function PlannedBadge() {
  return <span style={{ fontSize: 11, border: '1px solid #d0d5dd', background: '#f2f4f7', color: '#667085', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>规划中</span>;
}

function PlannedNavItem({ name }: { name: string }) {
  return <div title="该模块已预留位置，后续开发接入" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 14, color: '#98a2b3', background: '#f8fafc', border: '1px dashed #d0d5dd', cursor: 'not-allowed' }}><span>{name}</span><PlannedBadge /></div>;
}

function PlannedChip({ name }: { name: string }) {
  return <span style={{ border: '1px dashed #d0d5dd', background: '#f8fafc', borderRadius: 999, padding: '6px 10px', fontSize: 12, color: '#667085', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{name}<PlannedBadge /></span>;
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.templateSaved) return <div style={{ background: '#f0fff4', border: '1px solid #b2f2bb', borderRadius: 10, padding: 12, color: '#2b8a3e' }}>已将当前项目反向沉淀为个人模板，可在模板中心查看和编辑。</div>;
  if (searchParams?.templateMissing) return <div style={{ background: '#fff9db', border: '1px solid #ffe066', borderRadius: 10, padding: 12, color: '#8a6d00' }}>模板沉淀失败：项目版本或登录状态异常。</div>;
  return null;
}

export default async function ProjectMeasureCenter({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { productType: true, costSubject: true } }, costRules: true, taxes: true }
  });
  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const products = version?.products || [];
  const activeProducts = products.filter((item) => item.isActive);
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products, revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const defaultTemplateName = `${project.name}-${version?.stage || '当前阶段'}模板`;
  const sourceTemplateLabel = project.sourceTemplateName ? `${project.sourceTemplateName}（${project.sourceTemplateType || '模板'}）` : '未记录，可能为历史项目或手工创建';
  const plannedItems = projectNavGroups.flatMap((group) => group.items.filter(([, , status]) => status === 'planned').map(([name]) => name));

  const coreActions = [
    ['项目概况', 'overview'],
    ['业态产品', 'product-maintenance'],
    ['目标成本测算', 'costs-batch'],
    ['目标成本汇总', 'summary'],
    ['经营总控', 'dashboard-lite'],
    ['投决评审', 'decision']
  ] as const;
  const flow = [
    ['1 基础数据', 'overview', '从项目概况、业态产品、版本和指标校验开始，先把测算基础做准', 'done'],
    ['2 业态产品', 'product-maintenance', '维护业态面积、销售属性、分摊属性和税务清算对象', 'done'],
    ['3 目标成本测算', 'costs-batch', '录入目标成本并归集到科目和业态', 'done'],
    ['4 成本明细', 'building-details', '录入土建、安装、设备、精装、景观等专业明细', 'done'],
    ['5 目标成本汇总', 'summary', '按一级、二级科目汇总成本、单方和占比', 'done'],
    ['6 经营测算', 'dashboard-lite', '汇总收入、成本、税费、利润和关键经营指标', 'done'],
    ['7 收入测算', 'revenue-summary', '维护住宅、商业、车位和其他收入', 'done'],
    ['8 税费利润', 'tax-details', '检查增值税、土增税、所得税和业态利润', 'done'],
    ['9 汇报输出', 'decision', '输出投决评审、经营报告、Excel和自检成果', 'done'],
    ['10 后期管理', '', '预留合约招采、付款结算、动态成本和成本预警', 'planned'],
    ['11 高级能力', '', '预留财务评价、现金流、AI知识库和地区成本指标库', 'planned'],
    ['12 模板沉淀', '/templates', '把项目规则沉淀为个人模板或系统模板', 'done']
  ] as const;
  const tools = [
    ['Excel导入/导出', 'export'],
    ['导入批次', 'import-batches'],
    ['科目映射', 'cost-mapping'],
    ['汇总校验', 'summary-check'],
    ['模板中心/规则管理', '/templates']
  ] as const;

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', color: '#102033' }}>
      <div style={{ minHeight: 52, background: '#12384b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0b7285', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>项</div>
          <div><b>项目测算中心</b><div style={{ fontSize: 11, opacity: .75 }}>{project.name}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link href="/projects" className="btn" style={{ minHeight: 34, color: '#fff', background: 'transparent', borderColor: 'rgba(255,255,255,.35)' }}>返回项目中心</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>经营总控</Link><Link href={`/projects/${project.id}/decision`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>投决评审</Link></div>
      </div>

      <div className="sys-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: 12 }}>
        <aside style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2ec', background: '#f8fafc' }}><div style={{ fontSize: 12, color: '#667085' }}>当前项目</div><b>{project.name}</b><div style={{ color: '#667085', fontSize: 12 }}>{project.city || '未填城市'} · {project.district || '未填区域'} · {version?.stage || '投拓阶段'}</div><div style={{ marginTop: 8, fontSize: 12, color: '#0b7285' }}>来源：{sourceTemplateLabel}</div></div>
          <div style={{ padding: 10 }}>{projectNavGroups.map((group) => <div key={group.title} style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: '#667085', fontWeight: 800, padding: 8 }}>{group.title}</div>{group.items.map(([name, href]) => href ? <Link key={`${group.title}-${name}`} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, fontSize: 14 }}><span>{name}</span><span style={{ color: '#0b7285' }}>›</span></Link> : <PlannedNavItem key={`${group.title}-${name}`} name={name} />)}</div>)}</div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatusMessage searchParams={searchParams} />
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12 }}>项目测算中心</div><h1 style={{ margin: '6px 0', fontSize: 24 }}>{project.name}</h1><div style={{ color: '#667085', fontSize: 14 }}>当前阶段：{version?.stage || '投拓阶段'}　版本：{version?.name || '初始版本'}　状态：草稿　启用业态：{activeProducts.length} 个　科目规则：{version?.costRules.length || 0} 条</div><div style={{ color: '#0b7285', fontSize: 13, marginTop: 6 }}>项目来源模板：{sourceTemplateLabel}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{coreActions.map(([name, href]) => <Link key={name} href={`/projects/${project.id}/${href}`} className="btn btn-primary" style={{ minHeight: 34 }}>{name}</Link>)}</div></div>
          <div className="sys-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[['含税销售收入', revenue.taxInclusive, '万元'], ['含税目标成本', cost.taxInclusive, '万元'], ['建面单方', unitCost(cost.taxInclusive, buildingArea), '元/㎡'], ['可售单方', unitCost(cost.taxInclusive, saleableArea), '元/㎡']].map(([label, value, unit]) => <div key={String(label)} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#667085', fontSize: 12 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(Number(value))}</div><div className="meta">{unit}</div></div>)}</div>
          {effective.ignoredNonLeaf > 0 ? <div style={{ background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 10, padding: 12, color: '#8a6d00' }}>成本汇总已排除 {effective.ignoredNonLeaf} 条父级/非末级成本行，避免土地费、科目汇总行重复计入。</div> : null}
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>项目全流程</b><p className="meta" style={{ margin: '6px 0 0' }}>中间流程已按当前产品主线整理：基础数据 → 目标成本 → 经营测算 → 汇报输出 → 后期管理 → 高级能力，与左侧导航保持一致。</p><div className="sys-flow" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 10, marginTop: 12 }}>{flow.map(([name, href, desc, status]) => href ? <Link key={name} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#f8fafc' }}><b style={{ display: 'block' }}>{name}</b><div style={{ color: '#667085', fontSize: 12, marginTop: 8 }}>{desc}</div></Link> : <div key={name} style={{ border: '1px dashed #d0d5dd', borderRadius: 10, padding: 12, background: '#f8fafc' }}><b style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><span>{name}</span><PlannedBadge /></b><div style={{ color: '#667085', fontSize: 12, marginTop: 8 }}>{desc}</div></div>)}</div></div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>系统工具</b><div className="actions">{tools.map(([name, href]) => <Link key={name} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} className="btn">{name}</Link>)}</div></div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>已规划但待接入功能</b><p className="meta">预留位置不删除，后续按模块逐步开发；左侧虚线灰色入口代表已规划但未接入。</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{plannedItems.map((name) => <PlannedChip key={name} name={name} />)}</div></div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ background: '#fff', border: '1px solid #ffd8a8', borderRadius: 10, padding: 14 }}><b>报告输出</b><p className="meta">打印版和输出件集中在这里，不放左侧一级目录。</p><div className="actions"><Link className="btn btn-primary" href={`/projects/${project.id}/decision`}>投决评审</Link><Link className="btn" href={`/projects/${project.id}/report-print`}>打印经营报告</Link><Link className="btn" href={`/projects/${project.id}/sensitivity-report`}>打印敏感性报告</Link><Link className="btn" href={`/projects/${project.id}/tax-report`}>税务报告</Link></div></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>版本管理</b><p className="meta">当前阶段：{version?.stage || '投拓阶段'}；当前版本：{version?.name || '初始版本'}；状态：草稿。</p><Link className="btn btn-primary" href={`/projects/${project.id}/versions`}>进入版本管理</Link></div><div style={{ background: '#fff', border: '1px solid #b2f2bb', borderRadius: 10, padding: 14 }}><b>项目规则沉淀</b><p className="meta">把当前项目的启用业态、项目科目规则和税率规则保存为个人模板，后续新项目可复用。</p><form action={`/api/projects/${project.id}/save-template`} method="post" style={{ display: 'grid', gap: 8 }}><input name="name" defaultValue={defaultTemplateName} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="type" defaultValue="项目沉淀模板" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="description" placeholder="模板说明，可不填" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><button className="btn btn-primary">一键保存为模板</button></form></div><div style={{ background: '#fff', border: '1px solid #d0ebff', borderRadius: 10, padding: 14 }}><b>模板来源</b><p className="meta">{sourceTemplateLabel}</p>{project.sourceTemplateId ? <Link className="btn" href="/templates">查看模板中心/规则管理</Link> : null}</div></aside>
      </div>
      <style>{`@media (max-width: 1100px){.sys-shell,.sys-kpis,.sys-flow{grid-template-columns:1fr!important}.sys-shell{padding:8px!important}}`}</style>
    </main>
  );
}
