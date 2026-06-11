import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const fieldGroups = [
  {
    title: '基础信息',
    fields: [
      ['name', '项目名称', 'text'],
      ['city', '城市', 'text'],
      ['district', '区域', 'text']
    ]
  },
  {
    title: '面积指标',
    fields: [
      ['landArea', '土地面积㎡', 'number'],
      ['plotRatio', '容积率', 'number'],
      ['totalBuildingArea', '总建筑面积㎡', 'number'],
      ['capacityBuildingArea', '计容建筑面积㎡', 'number'],
      ['aboveGroundArea', '地上建筑面积㎡', 'number'],
      ['undergroundArea', '地下建筑面积㎡', 'number'],
      ['saleableArea', '可售面积㎡', 'number'],
      ['nonSaleableArea', '不可售面积㎡', 'number']
    ]
  },
  {
    title: '楼栋与车位',
    fields: [
      ['buildingCount', '楼栋数量', 'number'],
      ['unitCount', '单元数量', 'number'],
      ['aboveGroundFloors', '地上层数', 'number'],
      ['basementFloors', '地下层数', 'number'],
      ['parkingCount', '车位数量', 'number'],
      ['standardFloorArea', '标准层面积㎡', 'number']
    ]
  },
  {
    title: '总平与景观指标',
    fields: [
      ['sitePerimeter', '周界长度m', 'number'],
      ['landscapeArea', '景观面积㎡', 'number'],
      ['hardscapeArea', '硬景面积㎡', 'number'],
      ['softscapeArea', '软景面积㎡', 'number'],
      ['greenArea', '绿地面积㎡', 'number'],
      ['roadArea', '道路面积㎡', 'number']
    ]
  },
  {
    title: '地下室与公区',
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

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">项目概况</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">本页对应 V57 第一张表“项目概况”，后续收入、成本、分摊、税金均引用这里的基础工程量。</p>
          </div>
          <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>保存成功。</div> : null}

        <form action={`/api/projects/${project.id}/overview`} method="post" className="form-card" style={{ maxWidth: '100%' }}>
          {fieldGroups.map((group) => (
            <section key={group.title} style={{ marginBottom: 24 }}>
              <h2>{group.title}</h2>
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
