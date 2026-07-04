import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { projectNavGroups } from '@/components/project-navigation';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getProjectVersionRevenueLines } from '@/lib/project-version-revenue-lines';
import { costTotals, effectiveCostRows, n, revenueFromProjectData } from '@/lib/tax-summary';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { NON_V1_SCOPE_MESSAGE } from '@/lib/v1-maintenance-copy';

export const dynamic = 'force-dynamic';

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function versionStatusText(status?: string | null) {
  if (status === 'locked') return '已锁定';
  if (status === 'final') return '已定稿';
  if (status === 'draft') return '草稿';
  return status || '未设置';
}

function unitCost(amountWan: number, area: number) {
  return area ? amountWan * 10000 / area : 0;
}

function PlannedBadge() {
  return <span style={{ fontSize: 11, border: '1px solid #d0d5dd', background: '#f2f4f7', color: '#667085', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>后续版本</span>;
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
    include: { products: true, revenues: { include: { productType: true } }, costs: { include: { productType: true, costSubject: true } }, costRules: true, taxes: true }
  });
  if (version) await normalizeProjectVersionCostLineAmounts(version.id);
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(version?.id);

  const products = version?.products || [];
  const activeProducts = products.filter((item) => item.isActive);
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products, revenues: version?.revenues || [], commercialRevenueLines, otherRevenueLines, vatRate });
  const cost = costTotals(effective.effective);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const sourceTemplateLabel = project.sourceTemplateName ? `${project.sourceTemplateName}（${project.sourceTemplateType || '模板'}）` : '未记录，可能为历史项目或手工创建';

  const coreActions = [
    ['项目概况', 'overview'],
    ['业态产品', 'product-maintenance'],
    ['版本管理', 'versions'],
    ['测算控制中心', 'control-center'],
    ['目标成本测算', 'costs-batch'],
    ['目标成本汇总', 'summary'],
    ['成本分摊', 'allocation'],
    ['收入明细', 'revenue'],
    ['税金测算', 'tax-details'],
    ['业态利润分析', 'profit-analysis']
  ] as const;
  const flow = [
    ['1 基础数据', 'overview', '从项目概况、业态产品和版本管理开始，先把测算基础做准', 'done'],
    ['2 业态产品', 'product-maintenance', '维护业态面积、销售属性、分摊属性和税务清算对象', 'done'],
    ['3 测算控制', 'control-center', '核对收入、成本和版本口径', 'done'],
    ['4 目标成本测算', 'costs-batch', '录入目标成本并归集到科目和业态', 'done'],
    ['5 成本明细', 'building-details', '录入土建、安装、设备、精装、景观等专业明细', 'done'],
    ['6 成本分摊', 'allocation', '按业态和归属规则完成成本分摊测算', 'done'],
    ['7 收入测算', 'revenue', '维护住宅、商业、车位和其他收入', 'done'],
    ['8 税费利润', 'tax-details', '检查增值税、土增税、所得税和业态利润', 'done'],
    ['9 Excel 工作台', 'excel', '完成模板下载、导入预览、确认导入和版本级工作台', 'done']
  ] as const;
  const tools = [
    ['Excel工作台', 'excel'],
    ['成本科目及测算词典', 'cost-dictionary'],
    ['土地增值税', 'land-vat']
  ] as const;

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', color: '#102033' }}>
      <div style={{ minHeight: 52, background: '#12384b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0b7285', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>项</div>
          <div><b>项目测算中心</b><div style={{ fontSize: 11, opacity: .75 }}>{project.name}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link href="/projects" className="btn" style={{ minHeight: 34, color: '#fff', background: 'transparent', borderColor: 'rgba(255,255,255,.35)' }}>返回项目中心</Link><Link href={`/projects/${project.id}/excel`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>Excel 工作台</Link></div>
      </div>

      <div className="sys-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: 12 }}>
        <aside style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2ec', background: '#f8fafc' }}><div style={{ fontSize: 12, color: '#667085' }}>当前项目</div><b>{project.name}</b><div style={{ color: '#667085', fontSize: 12 }}>{project.city || '未填城市'} · {project.district || '未填区域'} · {version?.stage || '投拓阶段'}</div><div style={{ marginTop: 8, fontSize: 12, color: '#0b7285' }}>来源：{sourceTemplateLabel}</div></div>
          <div style={{ padding: 10 }}>{projectNavGroups.map((group) => <div key={group.title} style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: '#667085', fontWeight: 800, padding: 8 }}>{group.title}</div>{group.items.map(([name, href]) => <Link key={`${group.title}-${name}`} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, fontSize: 14 }}><span>{name}</span><span style={{ color: '#0b7285' }}>›</span></Link>)}</div>)}</div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatusMessage searchParams={searchParams} />
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12 }}>项目测算中心</div><h1 style={{ margin: '6px 0', fontSize: 24 }}>{project.name}</h1><div style={{ color: '#667085', fontSize: 14 }}>当前阶段：{version?.stage || '投拓阶段'}　版本：{version?.name || '初始版本'}　状态：{versionStatusText(version?.status)}　启用业态：{activeProducts.length} 个　科目规则：{version?.costRules.length || 0} 条</div><div style={{ color: '#0b7285', fontSize: 13, marginTop: 6 }}>项目来源模板：{sourceTemplateLabel}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{coreActions.map(([name, href]) => <Link key={name} href={`/projects/${project.id}/${href}`} className="btn btn-primary" style={{ minHeight: 34 }}>{name}</Link>)}</div></div>
          <div className="sys-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[['含税销售收入', revenue.taxInclusive, '万元'], ['含税目标成本', cost.taxInclusive, '万元'], ['建面单方', unitCost(cost.taxInclusive, buildingArea), '元/㎡'], ['可售单方', unitCost(cost.taxInclusive, saleableArea), '元/㎡']].map(([label, value, unit]) => <div key={String(label)} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#667085', fontSize: 12 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(Number(value))}</div><div className="meta">{unit}</div></div>)}</div>
          {effective.ignoredNonLeaf > 0 ? <div style={{ background: '#fff9db', border: '1px solid #ffd8a8', borderRadius: 10, padding: 12, color: '#8a6d00' }}>成本汇总已排除 {effective.ignoredNonLeaf} 条父级/非末级成本行，避免土地费、科目汇总行重复计入。</div> : null}
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>项目全流程</b><p className="meta" style={{ margin: '6px 0 0' }}>V1.0.0 主线已收敛为：基础数据 → 测算控制 → 收入成本明细 → 税费利润 → Excel 与自检。</p><div className="sys-flow" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 10, marginTop: 12 }}>{flow.map(([name, href, desc]) => <Link key={name} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#f8fafc' }}><b style={{ display: 'block' }}>{name}</b><div style={{ color: '#667085', fontSize: 12, marginTop: 8 }}>{desc}</div></Link>)}</div></div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>系统工具</b><div className="actions">{tools.map(([name, href]) => <Link key={name} href={href.startsWith('/') ? href : `/projects/${project.id}/${href}`} className="btn">{name}</Link>)}</div></div>
          <div style={{ background: '#fff', border: '1px dashed #d0d5dd', borderRadius: 10, padding: 14 }}><b style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>后续版本能力<PlannedBadge /></b><p className="meta">{NON_V1_SCOPE_MESSAGE}</p></div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>版本管理</b><p className="meta">当前阶段：{version?.stage || '投拓阶段'}；当前版本：{version?.name || '初始版本'}；状态：{versionStatusText(version?.status)}。</p><Link className="btn btn-primary" href={`/projects/${project.id}/versions`}>进入版本管理</Link></div><div style={{ background: '#fff', border: '1px solid #c5eef3', borderRadius: 10, padding: 14 }}><b>Excel</b><p className="meta">模板下载、上传预览、确认导入和版本级工作台统一从 Excel 工作台进入。</p><div className="actions"><Link className="btn btn-primary" href={`/projects/${project.id}/excel`}>Excel 工作台</Link></div></div><div style={{ background: '#fff', border: '1px dashed #d0d5dd', borderRadius: 10, padding: 14 }}><b>后续能力</b><p className="meta">{NON_V1_SCOPE_MESSAGE}</p><PlannedBadge /></div></aside>
      </div>
      <style>{`@media (max-width: 1100px){.sys-shell,.sys-kpis,.sys-flow{grid-template-columns:1fr!important}.sys-shell{padding:8px!important}}`}</style>
    </main>
  );
}
