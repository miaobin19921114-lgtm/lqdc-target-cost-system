import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const presetGroups = [
  { category: '住宅类', names: ['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'] },
  { category: '商业商办', names: ['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'] },
  { category: '车位储藏', names: ['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'] },
  { category: '配套用房', names: ['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'] },
  { category: '地下空间', names: ['高层主楼地下室', '洋房主楼地下室', '别墅地下室', '商业地下室', '非主楼纯地库', '人防地下室'] },
  { category: '专项区域', names: ['示范区', '售楼部', '样板间', '私家庭院', '下沉庭院', '水系', '游泳池'] }
];

const presetMeta = new Map<string, { category: string; rank: number }>();
presetGroups.forEach((group, groupIndex) => {
  group.names.forEach((name, itemIndex) => presetMeta.set(name, { category: group.category, rank: groupIndex * 100 + itemIndex }));
});

const basicFields = [
  ['name', '项目名称', 'text'],
  ['city', '城市', 'text'],
  ['district', '区域/板块', 'text'],
  ['landArea', '土地面积㎡', 'number'],
  ['plotRatio', '容积率', 'number'],
  ['totalBuildingArea', '总建筑面积㎡', 'number'],
  ['capacityBuildingArea', '计容建筑面积㎡', 'number'],
  ['aboveGroundArea', '地上建筑面积㎡', 'number'],
  ['undergroundArea', '地下建筑面积㎡', 'number'],
  ['saleableArea', '可售面积㎡', 'number'],
  ['nonSaleableArea', '不可售面积㎡', 'number']
] as const;

const indicatorFields = [
  ['buildingCount', '楼栋数量', 'number'],
  ['unitCount', '单元数量', 'number'],
  ['aboveGroundFloors', '典型地上层数', 'number'],
  ['basementFloors', '地下层数', 'number'],
  ['standardFloorArea', '标准层面积㎡', 'number'],
  ['parkingCount', '总车位数', 'number'],
  ['undergroundPropertyParkingCount', '地下产权车位', 'number'],
  ['undergroundUseRightParkingCount', '地下使用权车位', 'number'],
  ['civilDefenseParkingCount', '人防车位', 'number'],
  ['aboveGroundParkingCount', '地上车位', 'number'],
  ['chargingPileCount', '充电桩总数', 'number'],
  ['fastChargingPileCount', '快充数量', 'number'],
  ['slowChargingPileCount', '慢充数量', 'number'],
  ['reservedChargingPileCount', '预留充电条件', 'number'],
  ['chargingPileRatio', '充电桩配置比例', 'number'],
  ['parkingPowerCapacity', '充电桩用电容量kVA', 'number']
] as const;

const engineeringFields = [
  ['sitePerimeter', '周界长度m', 'number'],
  ['landscapeArea', '景观面积㎡', 'number'],
  ['hardscapeArea', '硬景面积㎡', 'number'],
  ['softscapeArea', '软景面积㎡', 'number'],
  ['greenArea', '绿地面积㎡', 'number'],
  ['roadArea', '道路面积㎡', 'number'],
  ['basementParkingArea', '地下车库面积㎡', 'number'],
  ['mainBuildingUndergroundArea', '主楼地下室面积㎡', 'number'],
  ['publicArea', '地上/地下公区面积㎡', 'number'],
  ['lobbyArea', '一楼入户大堂面积㎡', 'number']
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

function getCategory(name: string, remark?: string | null) {
  if (presetMeta.has(name)) return presetMeta.get(name)?.category || '其他';
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1] || '其他';
  return '其他';
}

function getRank(name: string) {
  return presetMeta.get(name)?.rank ?? 9999;
}

function inputFor(project: any, [name, label, type]: readonly [string, string, string], formId = 'overview-form') {
  return (
    <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>
      {label}
      <input form={formId} name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={valueOf(project, name)} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} />
    </label>
  );
}

function productInput(name: string, label: string, type = 'number') {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>
      {label}
      <input name={name} type={type} step={type === 'number' ? '0.01' : undefined} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} />
    </label>
  );
}

function Block({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec' }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
        <p className="meta" style={{ margin: '5px 0 0' }}>{note}</p>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </section>
  );
}

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; productSaved?: string; preset?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const version = await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' }, include: { products: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const products = [...(version?.products || [])].sort((a, b) => getRank(a.name) - getRank(b.name) || a.name.localeCompare(b.name));
  const productBuildingArea = products.reduce((sum, row) => sum + Number(row.buildingArea || 0), 0);
  const productSaleableArea = products.reduce((sum, row) => sum + Number(row.saleableArea || 0), 0);
  const productCapacityArea = products.reduce((sum, row) => sum + Number(row.capacityArea || 0), 0);
  const productRevenue = products.reduce((sum, row) => sum + Number(row.saleableArea || 0) * Number(row.salePrice || 0), 0);
  const saleableProducts = products.filter((row) => row.isSaleable);
  const nonSaleableProducts = products.filter((row) => !row.isSaleable);

  return (
    <main className="page" style={{ background: '#eef3f8' }}>
      <div className="container" style={{ maxWidth: 1500 }}>
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="eyebrow">项目概况表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">按你的模板重做为三段式：基础数据、主要经济技术指标、工程量指标。业态/产品构成已并入概况表第二部分，概况表作为全系统总控输入表。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/parking`} className="btn btn-primary">车位配置表</Link>
            <Link href={`/projects/${project.id}/land`} className="btn">土地费用明细</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目概况已保存。</div> : null}
        {searchParams?.productSaved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>业态/产品构成已保存。</div> : null}
        {searchParams?.preset === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>模板业态已生成。</div> : null}

        <div className="summary-strip" style={{ marginBottom: 14 }}>
          <div className="stat"><div className="stat-label">总建筑面积</div><div className="stat-value">{fmt(project.totalBuildingArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">计容建筑面积</div><div className="stat-value">{fmt(project.capacityBuildingArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{fmt(project.saleableArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">业态货值估算</div><div className="stat-value">{fmt(productRevenue)}元</div></div>
          <div className="stat"><div className="stat-label">车位 / 充电桩</div><div className="stat-value">{fmt(project.parkingCount)} / {fmt(project.chargingPileCount)}</div></div>
        </div>

        <form id="overview-form" action={`/api/projects/${project.id}/overview`} method="post" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Block title="一、基础数据" note="对应模板第一部分：项目、地块、规划总控指标。只放总控数据，不拆土地费用。">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              {basicFields.map((field) => inputFor(project, field))}
            </div>
          </Block>

          <Block title="二、主要经济技术指标 - 2.1 业态/产品构成" note="原“业态面积 / 产品构成”已并入概况表。这里是收入、成本分摊、可售面积校验的源头。">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <div><b>业态汇总校验</b><p className="meta" style={{ margin: '4px 0 0' }}>可售业态 {saleableProducts.length} 个；不可售/配套/地下空间 {nonSaleableProducts.length} 个。</p></div>
                  <form action={`/api/projects/${project.id}/products/presets`} method="post"><button className="btn btn-primary">生成模板业态</button></form>
                </div>
                <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontSize: 13 }}>
                    <thead><tr>{['口径', '概况表总控', '业态表合计', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #d9e2ec', color: '#667085' }}>{head}</th>)}</tr></thead>
                    <tbody>
                      {[
                        ['建筑面积', Number(project.totalBuildingArea || 0), productBuildingArea],
                        ['计容面积', Number(project.capacityBuildingArea || 0), productCapacityArea],
                        ['可售面积', Number(project.saleableArea || 0), productSaleableArea]
                      ].map(([name, overview, product]) => (
                        <tr key={String(name)}>
                          <td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{name}</td>
                          <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(overview)}㎡</td>
                          <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(product)}㎡</td>
                          <td style={{ padding: 9, borderBottom: '1px solid #eef2f6', color: Math.abs(Number(overview) - Number(product)) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(Number(overview) - Number(product))}㎡</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100, fontSize: 12 }}>
                    <thead><tr>{['分类', '业态', '建筑面积', '计容面积', '可售面积', '不可售面积', '销售单价', '货值', '销售', '分摊'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d9e2ec', color: '#667085' }}>{head}</th>)}</tr></thead>
                    <tbody>{products.length === 0 ? <tr><td colSpan={10} style={{ padding: 14, color: '#667085' }}>暂无业态。可先点击“生成模板业态”，再录入面积和售价。</td></tr> : products.map((item) => {
                      const revenue = Number(item.saleableArea || 0) * Number(item.salePrice || 0);
                      return <tr key={item.id}><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{getCategory(item.name, item.remark)}</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{item.name}</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{fmt(item.buildingArea)}㎡</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{fmt(item.capacityArea)}㎡</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{fmt(item.saleableArea)}㎡</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{fmt(item.nonSaleableArea)}㎡</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{fmt(item.salePrice)}</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{fmt(revenue)}</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{item.isSaleable ? '参与' : '不参与'}</td><td style={{ padding: 8, borderBottom: '1px solid #eef2f6' }}>{item.participateAllocation ? '参与' : '不参与'}</td></tr>;
                    })}</tbody>
                  </table>
                </div>
              </div>

              <form action={`/api/projects/${project.id}/products`} method="post" style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12, background: '#fcfdff', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="hidden" name="returnPath" value="overview" />
                <b>新增 / 更新业态</b>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>业态名称<select name="name" required defaultValue="" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }}><option value="" disabled>请选择固定业态</option>{presetGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.names.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}</select></label>
                {productInput('buildingArea', '建筑面积㎡')}
                {productInput('capacityArea', '计容面积㎡')}
                {productInput('saleableArea', '可售面积㎡')}
                {productInput('nonSaleableArea', '不可售面积㎡')}
                {productInput('salePrice', '销售单价 元/㎡')}
                {productInput('allocationWeight', '分摊权重')}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>备注<input name="remark" placeholder="面积口径、售价依据" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input name="isSaleable" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与销售</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input name="participateAllocation" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与成本分摊</label>
                <button className="btn btn-primary">保存业态</button>
              </form>
            </div>
          </Block>

          <Block title="二、主要经济技术指标 - 2.2 楼栋、车位与充电桩" note="充电桩在主要经济技术指标中维护，不作为业态；车位收入和成本可继续到车位配置表专项维护。">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {indicatorFields.map((field) => inputFor(project, field))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input form="overview-form" name="chargingIncludedInParkingPrice" type="checkbox" defaultChecked={project.chargingIncludedInParkingPrice} style={{ width: 'auto' }} />充电桩并入车位售价</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input form="overview-form" name="chargingSeparateCostMeasure" type="checkbox" defaultChecked={project.chargingSeparateCostMeasure} style={{ width: 'auto' }} />充电桩单独测算成本</label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', gridColumn: '1 / -1' }}>车位/充电桩备注<textarea form="overview-form" name="parkingRemark" defaultValue={project.parkingRemark || ''} placeholder="产权车位、人防车位、快慢充配置口径" style={{ minHeight: 66, border: '1px solid #d9e2ec', borderRadius: 6, padding: 8 }} /></label>
            </div>
          </Block>

          <Block title="三、工程量指标" note="对应模板第三部分：各专业测算自动引用的工程量基础。围墙、景观、道路、地下室、公区、大堂都从这里取数。">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              {engineeringFields.map((field) => inputFor(project, field))}
            </div>
            <div style={{ marginTop: 12, border: '1px solid #eef2f6', borderRadius: 10, padding: 12, background: '#fcfdff' }}>
              <b>自动引用关系</b>
              <p className="meta" style={{ margin: '6px 0 0' }}>周界长度 → 围墙；出入口数量/车位配置 → 围墙出入口/设备；景观面积 → 综合管网和景观；硬景/软景 → 景观明细；道路面积 → 道路总平；主楼地下室/地下车库面积 → 土建、安装、设备分摊。</p>
            </div>
          </Block>

          <Block title="四、备注与口径说明" note="保留项目定位、面积口径、取数来源、特殊假设等，不参与计算。">
            <textarea form="overview-form" name="remark" defaultValue={project.remark || ''} placeholder="填写项目定位、测算边界、面积口径、取数说明等" style={{ width: '100%', minHeight: 90, border: '1px solid #d9e2ec', borderRadius: 8, padding: 10 }} />
          </Block>

          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <Link href={`/projects/${project.id}`} className="btn">取消</Link>
            <button form="overview-form" className="btn btn-primary">保存项目概况</button>
          </div>
        </div>
      </div>
    </main>
  );
}
