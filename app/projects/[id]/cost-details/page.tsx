import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

const detailPages = [
  ['土地费', 'land', '土地价款、土地相关税费、土地交易及中介服务费'],
  ['前期费', 'pre-costs', '政府规费、权籍测绘、专项评价、设计、三通一平、咨询顾问、保险担保'],
  ['土建明细', 'building-details', '主体结构、地下室、土建分项及装配式土建'],
  ['安装明细', 'installation-details', '给排水、强弱电、消防、暖通、采暖安装'],
  ['设备明细', 'equipment-details', '电梯、消防设备、人防设备、弱电设备、充电桩设备'],
  ['精装修明细', 'fitout-details', '住宅公区、户内批量精装、商业公区、配套及示范区'],
  ['室外管网', 'outdoor-pipe-details', '室外给排水、消防、强弱电、燃气、海绵城市'],
  ['景观工程', 'landscape-details', '硬景、软景、水景、儿童活动、架空层、小品照明'],
  ['道路总平', 'road-details', '道路、消防车道、地面停车、交安标识、市政接驳'],
  ['围墙出入口', 'wall-gate-details', '正式围墙、正式出入口、车辆出入口、临时围挡'],
  ['销售费用', 'sales-expense-details', 'V60销售费用：营销设施、推广、渠道佣金、案场运营等'],
  ['管理费用', 'admin-expense-details', 'V60管理费用：人员、办公、后勤、法税审计、物业前介等'],
  ['财务费用', 'finance-expense-details', 'V60财务费用：资金占用、利息、融资手续费、担保保函等']
] as const;

export default async function CostDetailsIndexPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return (
    <main className="page">
      <ProjectTopNav projectId={project.id} projectName={project.name} current="成本明细目录" />
      <section className="card">
        <div style={{ color: '#0f4c5c', fontWeight: 900, fontSize: 12 }}>V60成本明细导航</div>
        <h1 style={{ margin: '6px 0 8px', fontSize: 24 }}>成本明细目录</h1>
        <p className="meta">按已确认顺序排列：土地费 → 前期费 → 土建 → 安装 → 设备 → 精装 → 室外管网 → 景观 → 道路总平 → 围墙出入口 → 销售费用 → 管理费用 → 财务费用。</p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
        {detailPages.map(([name, href, desc], index) => (
          <Link key={href} href={`/projects/${project.id}/${href}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ color: '#0b7285', fontWeight: 900, fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</div>
            <h2 style={{ margin: '6px 0', fontSize: 18 }}>{name}</h2>
            <p className="meta" style={{ margin: 0 }}>{desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
