import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const fieldGroups = [
  {
    title: '基础信息',
    note: '只填项目名称、城市、区域等基本信息。',
    fields: [
      ['name', '项目名称', 'text'],
      ['city', '城市', 'text'],
      ['district', '区域/板块', 'text']
    ]
  },
  {
    title: '地块与规划总控',
    note: '这里放总控指标，不放产品业态明细。土地费用在“土地费用明细表”单独维护。',
    fields: [
      ['landArea', '土地面积㎡', 'number'],
      ['plotRatio', '容积率', 'number'],
      ['sitePerimeter', '周界长度m', 'number']
    ]
  },
  {
    title: '建筑面积总控',
    note: '用于校验业态面积表和后续单方指标。业态拆分在“业态面积 / 产品构成表”维护。',
    fields: [
      ['totalBuildingArea', '总建筑面积㎡', 'number'],
      ['capacityBuildingArea', '计容建筑面积㎡', 'number'],
      ['aboveGroundArea', '地上建筑面积㎡', 'number'],
      ['undergroundArea', '地下建筑面积㎡', 'number'],
      ['saleableArea', '可售面积㎡', 'number'],
      ['nonSaleableArea', '不可售面积㎡', 'number']
    ]
  },
  {
    title: '楼栋与层数总控',
    note: '这里只放楼栋、单元、层数等总量。各业态楼栋拆分后续可在楼栋表单独维护。',
    fields: [
      ['buildingCount', '楼栋数量', 'number'],
      ['unitCount', '单元数量', 'number'],
      ['aboveGroundFloors', '典型地上层数', 'number'],
      ['basementFloors', '地下层数', 'number'],
      ['standardFloorArea', '标准层面积㎡', 'number']
    ]
  },
  {
    title: '总平与景观测算口径',
    note: '用于围墙、道路、景观、硬景、软景、绿化等成本测算。',
    fields: [
      ['landscapeArea', '景观面积㎡', 'number'],
      ['hardscapeArea', '硬景面积㎡', 'number'],
      ['softscapeArea', '软景面积㎡', 'number'],
      ['greenArea', '绿地面积㎡', 'number'],
      ['roadArea', '道路面积㎡', 'number']
    ]
  },
  {
    title: '地下室与公区测算口径',
    note: '用于地下室、主楼地下室、公区、大堂等专业测算。车位数量和充电桩在“车位配置表”维护。',
    fields: [
      ['basementParkingArea', '地下车库面积㎡', 'number'],
      ['mainBuildingUndergroundArea', '主楼地下室面积㎡', 'number'],
      ['publicArea', '地上/地下公区面积㎡', 'number'],
      ['lobbyArea', '一楼入户大堂面积㎡', 'number']
    ]
  }
] as const;

function valueOf(project: any, name: string) {
  const value = project[name];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return String(value);
}

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">项目概况</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">本页只维护项目总控指标；业态、车位、土地费用分别进入对应明细表，避免口径混在一起。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/products`} className="btn btn-primary">业态面积表</Link>
            <Link href={`/projects/${project.id}/parking`} className="btn btn-primary">车位配置表</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目概况已保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">总建筑面积</div><div className="stat-value">{fmt(project.totalBuildingArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">计容建筑面积</div><div className="stat-value">{fmt(project.capacityBuildingArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{fmt(project.saleableArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">总车位数</div><div className="stat-value">{fmt(project.parkingCount)}</div></div>
        </div>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>口径边界</h2>
          <p className="meta">项目概况表是总控表：只放规划和测算基础工程量。产品名称、销售面积拆分、售价进入业态表；产权车位、人防车位、充电桩进入车位配置表；土地款、契税等进入土地费用明细表。</p>
        </section>

        <form action={`/api/projects/${project.id}/overview`} method="post" className="form-card" style={{ maxWidth: '100%' }}>
          {fieldGroups.map((group) => (
            <section key={group.title} style={{ marginBottom: 24 }}>
              <h2>{group.title}</h2>
              <p className="meta" style={{ marginTop: -6, marginBottom: 12 }}>{group.note}</p>
              <div className="form-grid">
                {group.fields.map(([name, label, type]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      type={type}
                      step={type === 'number' ? '0.01' : undefined}
                      defaultValue={valueOf(project, name)}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}

          <label>
            备注
            <textarea name="remark" defaultValue={project.remark || ''} placeholder="填写项目定位、测算边界、面积口径、取数说明等" />
          </label>

          <div className="actions">
            <button className="btn btn-primary">保存项目概况</button>
            <Link href={`/projects/${project.id}`} className="btn">取消</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
