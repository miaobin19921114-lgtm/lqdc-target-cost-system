import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const fields = [
  ['name', '项目名称', 'text'],
  ['city', '城市', 'text'],
  ['district', '区域', 'text'],
  ['landArea', '土地面积㎡', 'number'],
  ['plotRatio', '容积率', 'number'],
  ['totalBuildingArea', '总建筑面积㎡', 'number'],
  ['capacityBuildingArea', '计容建筑面积㎡', 'number'],
  ['aboveGroundArea', '地上建筑面积㎡', 'number'],
  ['undergroundArea', '地下建筑面积㎡', 'number'],
  ['saleableArea', '可售面积㎡', 'number'],
  ['nonSaleableArea', '不可售面积㎡', 'number'],
  ['parkingCount', '车位数量', 'number']
] as const;

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <p className="eyebrow">项目概况</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">本页对应 V57 第一张表“项目概况”，先固化基础经济技术指标，后续成本、税金、分摊均引用这里。</p>
          </div>
          <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
        </div>

        {searchParams.saved ? <div className="card" style={{ marginBottom: 16, borderColor: '#8ce99a' }}>已保存项目概况。</div> : null}

        <form action={`/api/projects/${project.id}`} method="post" className="form-card" style={{ maxWidth: 'none' }}>
          <h2>基础指标</h2>
          <div className="form-grid">
            {fields.map(([key, label, type]) => (
              <label key={key}>{label}
                <input
                  name={key}
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  defaultValue={String((project as any)[key] ?? '')}
                />
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <label>备注
              <textarea name="remark" defaultValue={project.remark || ''} placeholder="填写项目定位、测算边界、面积口径、取数说明等" />
            </label>
          </div>
          <div className="actions">
            <button className="btn btn-primary">保存项目概况</button>
            <Link href={`/projects/${project.id}`} className="btn">取消</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
