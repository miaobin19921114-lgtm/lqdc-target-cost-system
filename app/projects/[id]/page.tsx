import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const groups = [
  ['项目基础', [
    ['项目概况', 'overview'],
    ['业态面积 / 产品构成', 'products'],
    ['车位配置表', 'parking'],
    ['测算控制中心', '']
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
    ['目标成本测算', 'costs'],
    ['目标成本汇总表', 'summary']
  ]],
  ['税务与分摊', [
    ['成本分摊测算表', 'cost-allocation'],
    ['土地增值税测算表', 'land-vat'],
    ['税金明细表', 'tax-details']
  ]],
  ['系统资料', [
    ['产品库 / 业态配置标准', 'product-library'],
    ['成本科目及测算词典', 'cost-dictionary'],
    ['下拉字典', ''],
    ['Excel导入导出', 'export']
  ]]
] as const;

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function revenueAmount(products: any[]) {
  return products.filter((item) => item.isSaleable).reduce((sum, item) => sum + Number(item.saleableArea || 0) * Number(item.salePrice || 0), 0);
}

export default async function ProjectWorkBench({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, costs: true }
  });

  const products = version?.products || [];
  const costs = version?.costs || [];
  const revenue = revenueAmount(products);
  const cost = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const quick = [
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
    ['目标成本', 'costs']
  ] as const;

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', color: '#102033' }}>
      <div style={{ height: 52, background: '#12384b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0b7285', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>九</div>
          <div><b>九坤地产成本管理平台</b><div style={{ fontSize: 11, opacity: .75 }}>Target Cost Management</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><Link href={`/projects/${project.id}/export`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>导入/导出</Link><Link href="/projects" className="btn" style={{ minHeight: 34, color: '#fff', background: 'transparent', borderColor: 'rgba(255,255,255,.35)' }}>项目列表</Link></div>
      </div>

      <div className="sys-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: 12 }}>
        <aside style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2ec', background: '#f8fafc' }}><div style={{ fontSize: 12, color: '#667085' }}>当前项目</div><b>{project.name}</b><div style={{ color: '#667085', fontSize: 12 }}>{project.city || '未填城市'} · {project.district || '未填区域'}</div></div>
          <div style={{ padding: 10 }}>
            {groups.map(([title, items]) => <div key={title} style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: '#667085', fontWeight: 800, padding: 8 }}>{title}</div>{items.map(([name, href]) => href ? <Link key={name} href={`/projects/${project.id}/${href}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, fontSize: 14 }}><span>{name}</span><span style={{ color: '#0b7285' }}>›</span></Link> : <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', color: '#98a2b3', fontSize: 14 }}><span>{name}</span><span>待接入</span></div>)}</div>)}
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12 }}>目标成本测算工作台</div><h1 style={{ margin: '6px 0', fontSize: 24 }}>{project.name}</h1><div style={{ color: '#667085', fontSize: 14 }}>版本：{version?.name || '初始版本'}　状态：草稿　口径：含税金额录入，系统自动拆税</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{quick.map(([name, href]) => <Link key={name} href={`/projects/${project.id}/${href}`} className="btn btn-primary" style={{ minHeight: 34 }}>{name}</Link>)}</div></div>
          <div className="sys-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[['含税销售收入', revenue], ['含税目标成本', cost], ['建面单方', buildingArea ? cost / buildingArea : 0], ['可售单方', saleableArea ? cost / saleableArea : 0]].map(([label, value]) => <div key={String(label)} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><div style={{ color: '#667085', fontSize: 12 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{fmt(Number(value))}</div></div>)}</div>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>成本测算主流程</b><div className="sys-flow" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>{quick.map(([name, href], index) => <Link key={name} href={`/projects/${project.id}/${href}`} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#f8fafc' }}><div style={{ width: 26, height: 26, borderRadius: 6, background: '#e9f7f8', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{index + 1}</div><b style={{ display: 'block', marginTop: 10 }}>{name}</b><div style={{ color: '#667085', fontSize: 12 }}>进入维护</div></Link>)}</div></div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>版本控制</b><p className="meta">当前版本：{version?.name || '初始版本'}；状态：草稿。</p></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>测算口径</b><p className="meta">各明细表均从成本科目词典预设科目、业态、税率、测算依据、分摊口径、土增税和所得税口径。</p></div><div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}><b>税务测算</b><p className="meta">成本分摊、土增税、税金明细已接入自动汇总测算。</p></div></aside>
      </div>
      <style>{`@media (max-width: 980px){.sys-shell,.sys-kpis,.sys-flow{grid-template-columns:1fr!important;padding:8px!important}}`}</style>
    </main>
  );
}
