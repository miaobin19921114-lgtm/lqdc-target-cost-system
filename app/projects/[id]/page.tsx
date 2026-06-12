import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const navGroups = [
  {
    title: '项目基础',
    items: [
      { name: '项目概况', href: 'overview' },
      { name: '业态面积 / 产品构成', href: 'products' },
      { name: '测算控制中心', href: null }
    ]
  },
  {
    title: '收入与成本',
    items: [
      { name: '收入明细表', href: 'revenue' },
      { name: '目标成本测算', href: 'costs' },
      { name: '目标成本汇总表', href: 'summary' },
      { name: '土地费用明细表', href: null },
      { name: '前期费用明细表', href: null },
      { name: '各专业明细表', href: null }
    ]
  },
  {
    title: '税务与分摊',
    items: [
      { name: '成本分摊测算表', href: null },
      { name: '土地增值税测算表', href: null },
      { name: '税金明细表', href: null }
    ]
  },
  {
    title: '系统资料',
    items: [
      { name: '成本科目及测算词典', href: null },
      { name: '下拉字典', href: null },
      { name: 'Excel导入导出', href: 'export' }
    ]
  }
];

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function calcRevenue(saleableArea: number, salePrice: number) {
  const inclusive = saleableArea * salePrice;
  const exclusive = inclusive / 1.09;
  return { inclusive, exclusive };
}

function SystemPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #d9e2ec', background: '#f8fafc', fontWeight: 800 }}>{title}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </section>
  );
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
  const revenueRows = products.filter((item) => item.isSaleable).map((item) => calcRevenue(Number(item.saleableArea || 0), Number(item.salePrice || 0)));
  const revenueInclusive = revenueRows.reduce((sum, row) => sum + row.inclusive, 0);
  const revenueExclusive = revenueRows.reduce((sum, row) => sum + row.exclusive, 0);
  const costInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const costExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const taxBeforeProfit = revenueExclusive - costExclusive;
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);
  const buildingUnitCost = buildingArea ? costInclusive / buildingArea : 0;
  const saleableUnitCost = saleableArea ? costInclusive / saleableArea : 0;

  const quickActions = [
    { name: '录入项目概况', href: 'overview' },
    { name: '维护业态面积', href: 'products' },
    { name: '查看收入明细', href: 'revenue' },
    { name: '录入目标成本', href: 'costs' },
    { name: '查看汇总表', href: 'summary' }
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#eef3f8', color: '#102033' }}>
      <div style={{ height: 52, background: '#12384b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid #0b2635' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0b7285', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>九</div>
          <div>
            <div style={{ fontWeight: 900, lineHeight: 1 }}>九坤地产成本管理平台</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Target Cost Management</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/projects/${project.id}/export`} className="btn" style={{ minHeight: 34, background: '#fff', color: '#12384b' }}>导入/导出</Link>
          <Link href="/projects" className="btn" style={{ minHeight: 34, background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}>项目列表</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: 12 }} className="sys-shell">
        <aside style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, minHeight: 'calc(100vh - 76px)', overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2ec', background: '#f8fafc' }}>
            <div style={{ fontSize: 12, color: '#667085' }}>当前项目</div>
            <div style={{ fontWeight: 900, marginTop: 4 }}>{project.name}</div>
            <div style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>{project.city || '未填城市'} · {project.district || '未填区域'}</div>
          </div>

          <div style={{ padding: 10 }}>
            {navGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#667085', fontWeight: 800, padding: '8px 8px 6px' }}>{group.title}</div>
                {group.items.map((item) => item.href ? (
                  <Link key={item.name} href={`/projects/${project.id}/${item.href}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', borderRadius: 8, color: '#102033', fontSize: 14 }}>
                    <span>{item.name}</span><span style={{ color: '#0b7285' }}>›</span>
                  </Link>
                ) : (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', borderRadius: 8, color: '#98a2b3', fontSize: 14 }}>
                    <span>{item.name}</span><span style={{ fontSize: 12 }}>待接入</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12, letterSpacing: '.08em' }}>目标成本测算工作台</div>
                <h1 style={{ margin: '6px 0 6px', fontSize: 24 }}>{project.name}</h1>
                <div style={{ color: '#667085', fontSize: 14 }}>版本：{version?.name || '初始版本'}　状态：草稿　口径：含税金额录入，系统自动拆税</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {quickActions.map((action) => (
                  <Link key={action.name} href={`/projects/${project.id}/${action.href}`} className="btn btn-primary" style={{ minHeight: 34 }}>{action.name}</Link>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }} className="sys-kpis">
            {[
              ['含税销售收入', `${fmt(revenueInclusive)} 元`],
              ['含税目标成本', `${fmt(costInclusive)} 元`],
              ['税前利润', `${fmt(taxBeforeProfit)} 元`],
              ['建面/可售单方', `${fmt(buildingUnitCost)} / ${fmt(saleableUnitCost)}`]
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#667085', fontSize: 12 }}>{label}</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>

          <SystemPanel title="成本测算主流程">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }} className="sys-flow">
              {quickActions.map((action, index) => (
                <Link key={action.name} href={`/projects/${project.id}/${action.href}`} style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#e9f7f8', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{index + 1}</div>
                  <div style={{ fontWeight: 800, marginTop: 10 }}>{action.name}</div>
                  <div style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>进入维护</div>
                </Link>
              ))}
            </div>
          </SystemPanel>

          <SystemPanel title="基础指标">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }} className="sys-base">
              {[
                ['土地面积', `${fmt(Number(project.landArea || 0))}㎡`],
                ['总建筑面积', `${fmt(Number(project.totalBuildingArea || 0))}㎡`],
                ['可售面积', `${fmt(Number(project.saleableArea || 0))}㎡`],
                ['车位数量', `${project.parkingCount || 0}`],
                ['业态数量', `${products.length}`],
                ['成本明细', `${costs.length}`],
                ['容积率', `${fmt(Number(project.plotRatio || 0))}`],
                ['版本数量', `${version ? 1 : 0}`]
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#f8fafc', border: '1px solid #e6edf3', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#667085', fontSize: 12 }}>{label}</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
          </SystemPanel>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SystemPanel title="版本控制">
            <div style={{ display: 'grid', gap: 10, color: '#667085', fontSize: 14 }}>
              <div>当前版本：<b style={{ color: '#102033' }}>{version?.name || '初始版本'}</b></div>
              <div>状态：<span className="badge">草稿</span></div>
              <div>后续接入：锁定版、定稿版、版本对比。</div>
            </div>
          </SystemPanel>

          <SystemPanel title="测算口径提示">
            <div style={{ color: '#667085', fontSize: 14, lineHeight: 1.8 }}>
              <div>1. 收入按含税售价录入，系统自动拆不含税收入和销项税。</div>
              <div>2. 成本按含税单价录入，系统自动拆不含税成本和进项税。</div>
              <div>3. 单方同时显示建面单方和可售单方。</div>
              <div>4. 可直接归集的成本归集到业态，不能归集的后续进入分摊表。</div>
            </div>
          </SystemPanel>

          <SystemPanel title="待接入模块">
            <div style={{ display: 'grid', gap: 8 }}>
              {['土地费用明细表', '前期费用明细表', '各专业明细表', '成本分摊测算表', '土地增值税测算表'].map((name) => (
                <div key={name} style={{ padding: '8px 10px', background: '#fff4e6', color: '#ad6800', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{name}</div>
              ))}
            </div>
          </SystemPanel>
        </aside>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .sys-shell { grid-template-columns: 1fr !important; padding: 8px !important; }
          .sys-shell > aside:first-child { min-height: auto !important; }
          .sys-kpis, .sys-flow, .sys-base { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
