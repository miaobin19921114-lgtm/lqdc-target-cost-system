import Link from 'next/link';
import type { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

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
presetGroups.forEach((group, groupIndex) => group.names.forEach((name, itemIndex) => presetMeta.set(name, { category: group.category, rank: groupIndex * 100 + itemIndex })));

const basicFields = [
  ['name', '项目名称', 'text'], ['city', '城市', 'text'], ['district', '区域/板块', 'text'], ['landArea', '土地面积㎡', 'number'], ['landAreaMu', '土地面积亩', 'number'], ['redLineArea', '用地红线面积㎡', 'number'], ['plotRatio', '容积率', 'number'], ['totalBuildingArea', '总建筑面积㎡', 'number'], ['capacityBuildingArea', '计容建筑面积㎡', 'number'], ['aboveGroundArea', '地上建筑面积㎡', 'number'], ['undergroundArea', '地下建筑面积㎡', 'number'], ['saleableArea', '可售面积㎡', 'number'], ['nonSaleableArea', '不可售面积㎡', 'number']
] as const;
const buildingIndicatorFields = [
  ['buildingCount', '楼栋数量', 'number'], ['unitCount', '单元数量', 'number'], ['householdCount', '户数/套数', 'number'], ['elevatorCount', '电梯数量', 'number'], ['aboveGroundFloors', '典型地上层数', 'number'], ['basementFloors', '地下层数', 'number'], ['standardFloorArea', '标准层面积㎡', 'number'], ['standardFloorHeight', '标准层层高m', 'number'], ['basementFloorHeight', '地下室层高m', 'number']
] as const;
const parkingIndicatorFields = [
  ['parkingCount', '总车位数', 'number'], ['undergroundPropertyParkingCount', '地下产权车位', 'number'], ['undergroundUseRightParkingCount', '地下使用权车位', 'number'], ['civilDefenseParkingCount', '人防车位', 'number'], ['aboveGroundParkingCount', '地上车位', 'number'], ['chargingPileCount', '充电桩总数', 'number'], ['fastChargingPileCount', '快充数量', 'number'], ['slowChargingPileCount', '慢充数量', 'number'], ['reservedChargingPileCount', '预留充电条件', 'number'], ['chargingPileRatio', '充电桩配置比例', 'number'], ['parkingPowerCapacity', '充电桩用电容量kVA', 'number']
] as const;
const siteEngineeringFields = [
  ['sitePerimeter', '周界长度m', 'number'], ['gateCount', '出入口数量', 'number'], ['formalGateCount', '正式出入口数量', 'number'], ['temporaryGateCount', '临时出入口数量', 'number'], ['temporaryFacilityArea', '临设面积㎡', 'number'], ['siteLevelingArea', '场平面积㎡', 'number'], ['landscapeArea', '景观总面积㎡', 'number'], ['hardscapeArea', '硬景面积㎡', 'number'], ['softscapeArea', '软景面积㎡', 'number'], ['greenArea', '绿地面积㎡', 'number'], ['waterFeatureArea', '水景面积㎡', 'number'], ['childrenActivityArea', '儿童活动场地㎡', 'number'], ['elevatedFloorLandscapeArea', '架空层景观面积㎡', 'number'], ['roadArea', '道路总面积㎡', 'number'], ['fireRoadArea', '消防道路面积㎡', 'number'], ['asphaltRoadArea', '沥青路面面积㎡', 'number']
] as const;
const basementPublicFields = [
  ['basementParkingArea', '地下车库面积㎡', 'number'], ['mainBuildingUndergroundArea', '主楼地下室面积㎡', 'number'], ['civilDefenseArea', '人防面积㎡', 'number'], ['nonCivilDefenseArea', '非人防面积㎡', 'number'], ['publicArea', '地上/地下公区面积㎡', 'number'], ['lobbyArea', '一楼入户大堂面积㎡', 'number'], ['salesOfficeArea', '售楼部面积㎡', 'number'], ['showFlatArea', '样板间面积㎡', 'number'], ['propertyManagementArea', '物业用房面积㎡', 'number'], ['communityServiceArea', '社区用房面积㎡', 'number']
] as const;
const civilEngineeringFields = [
  ['baseArea', '基底/占地面积㎡', 'number'], ['pileFoundationArea', '桩基面积㎡', 'number'], ['earthworkVolume', '土方量m³', 'number'], ['waterproofArea', '防水面积㎡', 'number'], ['roofArea', '屋面面积㎡', 'number'], ['insulationArea', '保温面积㎡', 'number'], ['facadeArea', '外墙面积㎡', 'number'], ['windowArea', '门窗面积㎡', 'number'], ['railingLength', '栏杆长度m', 'number']
] as const;
const mepEquipmentFields = [['powerRoomCount', '配电房数量', 'number'], ['pumpRoomCount', '水泵房数量', 'number'], ['firePoolVolume', '消防水池容积m³', 'number']] as const;

function valueOf(project: any, name: string) {
  const value = project[name];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return String(value);
}
function fmt(value: unknown) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function getCategory(name: string, remark?: string | null) { if (presetMeta.has(name)) return presetMeta.get(name)?.category || '其他'; if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1] || '其他'; return '其他'; }
function getRank(name: string) { return presetMeta.get(name)?.rank ?? 9999; }
const tableInput = { width: '100%', minWidth: 82, height: 30, border: '1px solid #d9e2ec', borderRadius: 5, padding: '3px 6px' };
const cell = { padding: 7, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };

function inputFor(project: any, [name, label, type]: readonly [string, string, string], formId = 'overview-form') {
  return <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input form={formId} name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={valueOf(project, name)} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label>;
}
function FieldGrid({ project, fields }: { project: any; fields: readonly (readonly [string, string, string])[] }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>{fields.map((field) => inputFor(project, field))}</div>;
}
function addInput(name: string, label: string) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input name={name} type="number" step="0.01" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label>;
}
function Block({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, background: '#fff', overflow: 'hidden' }}><div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec' }}><h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2><p className="meta" style={{ margin: '5px 0 0' }}>{note}</p></div><div style={{ padding: 14 }}>{children}</div></section>;
}

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; productSaved?: string; preset?: string; rows?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({ where: activeVersionWhere(project), orderBy: activeVersionOrder(project), include: { products: true } });

  const allProducts = [...(version?.products || [])].sort((a, b) => getRank(a.name) - getRank(b.name) || a.name.localeCompare(b.name));
  const products = allProducts.filter((item) => item.isActive);
  const disabledCount = allProducts.length - products.length;
  const productNames = new Set(allProducts.map((item) => item.name));
  const missingPresets = presetGroups.map((group) => ({ ...group, names: group.names.filter((name) => !productNames.has(name)) })).filter((group) => group.names.length > 0);
  const productBuildingArea = products.reduce((sum, row) => sum + Number(row.buildingArea || 0), 0);
  const productSaleableArea = products.reduce((sum, row) => sum + Number(row.saleableArea || 0), 0);
  const productCapacityArea = products.reduce((sum, row) => sum + Number(row.capacityArea || 0), 0);
  const saleableProducts = products.filter((row) => row.isSaleable);
  const nonSaleableProducts = products.filter((row) => !row.isSaleable);

  return (
    <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
      <div className="page-header" style={{ alignItems: 'flex-start' }}><div><p className="eyebrow">项目基础</p><h1 className="title">项目概况</h1><p className="subtitle">项目概况是全系统基础资料入口，分为基础信息、规划指标、车位指标、工程量指标四大口径；金额类数据进入对应明细表。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/indicator-check`} className="btn btn-primary">指标校验</Link><Link href={`/projects/${project.id}/parking`} className="btn">车位配置</Link><Link href={`/projects/${project.id}/parking-revenue`} className="btn">车位收入</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
      {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目概况已保存。</div> : null}
      {searchParams?.productSaved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>业态/产品构成已保存。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
      {searchParams?.productSaved === 'duplicate' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>该业态已在本项目中，不能重复添加；如已停用，请到业态维护页恢复。</div> : null}
      {disabledCount ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8' }}>本项目有 {disabledCount} 个停用业态，已从概况表和收入测算中隐藏。<Link href={`/projects/${project.id}/product-maintenance`} style={{ color: '#0b7285', fontWeight: 900, marginLeft: 8 }}>查看业态维护</Link></div> : null}
      <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">总建筑面积</div><div className="stat-value">{fmt(project.totalBuildingArea)}㎡</div></div><div className="stat"><div className="stat-label">可售面积</div><div className="stat-value">{fmt(project.saleableArea)}㎡</div></div><div className="stat"><div className="stat-label">启用业态</div><div className="stat-value">{products.length}</div></div><div className="stat"><div className="stat-label">车位 / 充电桩</div><div className="stat-value">{fmt(project.parkingCount)} / {fmt(project.chargingPileCount)}</div></div></div>
      <form id="overview-form" action={`/api/projects/${project.id}/overview`} method="post" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Block title="一、基础信息与规划指标" note="维护项目名称、城市板块、土地面积、容积率、总建面、计容建面、可售面积等全局口径。土地费金额不放这里，进入土地费用明细表。"><FieldGrid project={project} fields={basicFields} /></Block>
        <Block title="二、业态 / 产品构成" note="维护启用业态的建面、计容面积、可售面积、不可售面积和分摊口径；销售单价进入收入测算页维护。">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 14 }}>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}><div><b>本项目启用业态</b><p className="meta" style={{ margin: '4px 0 0' }}>可售 {saleableProducts.length} 个；不可售/配套/地下空间 {nonSaleableProducts.length} 个。</p></div><button form="overview-products-form" className="btn btn-primary">保存启用业态</button></div>
              <div style={{ overflowX: 'auto', marginBottom: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontSize: 13 }}><thead><tr>{['口径', '概况表总控', '启用业态合计', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #d9e2ec', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{[['建筑面积', Number(project.totalBuildingArea || 0), productBuildingArea], ['计容面积', Number(project.capacityBuildingArea || 0), productCapacityArea], ['可售面积', Number(project.saleableArea || 0), productSaleableArea]].map(([name, overview, product]) => <tr key={String(name)}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{name}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(overview)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(product)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', color: Math.abs(Number(overview) - Number(product)) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(Number(overview) - Number(product))}㎡</td></tr>)}</tbody></table></div>
              <form id="overview-products-form" action={`/api/projects/${project.id}/products/batch`} method="post" /><input form="overview-products-form" type="hidden" name="rowCount" value={products.length} />
              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1120, fontSize: 12 }}><thead><tr>{['分类', '业态', '建筑面积', '计容面积', '可售面积', '不可售面积', '分摊权重', '销售', '分摊', '备注'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{products.length === 0 ? <tr><td colSpan={10} style={{ padding: 14, color: '#667085' }}>本项目暂无启用业态。请在右侧从后台模板添加，或到业态维护页恢复。</td></tr> : products.map((item, index) => <tr key={item.id} style={{ background: index % 2 ? '#fff' : '#fcfdff' }}><td style={cell}>{getCategory(item.name, item.remark)}</td><td style={{ ...cell, fontWeight: 800 }}><input form="overview-products-form" type="hidden" name={`productId-${index}`} value={item.id} /><input form="overview-products-form" type="hidden" name={`name-${index}`} value={item.name} />{item.name}</td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`buildingArea-${index}`} type="number" step="0.01" defaultValue={Number(item.buildingArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`capacityArea-${index}`} type="number" step="0.01" defaultValue={Number(item.capacityArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`saleableArea-${index}`} type="number" step="0.01" defaultValue={Number(item.saleableArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`nonSaleableArea-${index}`} type="number" step="0.01" defaultValue={Number(item.nonSaleableArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`allocationWeight-${index}`} type="number" step="0.01" defaultValue={Number(item.allocationWeight || 0) || ''} style={{ ...tableInput, minWidth: 70 }} /></td><td style={{ ...cell, textAlign: 'center' }}><input form="overview-products-form" name={`isSaleable-${index}`} type="checkbox" defaultChecked={item.isSaleable} /></td><td style={{ ...cell, textAlign: 'center' }}><input form="overview-products-form" name={`participateAllocation-${index}`} type="checkbox" defaultChecked={item.participateAllocation} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`remark-${index}`} defaultValue={item.remark || ''} style={{ ...tableInput, minWidth: 150 }} /></td></tr>)}</tbody></table></div>
            </div>
            <form action={`/api/projects/${project.id}/products`} method="post" style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12, background: '#fcfdff', display: 'flex', flexDirection: 'column', gap: 10 }}><input type="hidden" name="returnPath" value="overview" /><input type="hidden" name="mode" value="create" /><b>新增 / 更新业态</b><p className="meta" style={{ margin: 0 }}>从后台业态模板中选择；已在本项目中的业态不会出现在下拉里，避免重复。</p><label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>业态名称<select name="name" required disabled={missingPresets.length === 0} defaultValue="" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }}><option value="" disabled>{missingPresets.length === 0 ? '模板业态均已选择' : '请选择未选业态'}</option>{missingPresets.map((group) => <optgroup key={group.category} label={group.category}>{group.names.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}</select></label>{addInput('buildingArea', '建筑面积㎡')}{addInput('capacityArea', '计容面积㎡')}{addInput('saleableArea', '可售面积㎡')}{addInput('nonSaleableArea', '不可售面积㎡')}{addInput('allocationWeight', '分摊权重')}<label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>备注<input name="remark" placeholder="面积口径、适用范围" style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input name="isSaleable" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与销售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input name="participateAllocation" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与成本分摊</label><button className="btn btn-primary" disabled={missingPresets.length === 0}>添加到本项目</button><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态增减维护</Link></form>
          </div>
        </Block>
        <Block title="三、楼栋、车位与充电桩指标" note="充电桩数量在这里维护，不作为业态；车位收入通常按个数×单个车位含税单价，在车位收入测算页专项维护。"><FieldGrid project={project} fields={buildingIndicatorFields} /><div style={{ height: 12 }} /><FieldGrid project={project} fields={parkingIndicatorFields} /><div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input form="overview-form" name="chargingIncludedInParkingPrice" type="checkbox" defaultChecked={project.chargingIncludedInParkingPrice} style={{ width: 'auto' }} />充电桩并入车位售价</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input form="overview-form" name="chargingSeparateCostMeasure" type="checkbox" defaultChecked={project.chargingSeparateCostMeasure} style={{ width: 'auto' }} />充电桩单独测算成本</label><label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', gridColumn: '1 / -1' }}>车位/充电桩备注<textarea form="overview-form" name="parkingRemark" defaultValue={project.parkingRemark || ''} placeholder="产权车位、人防车位、快慢充配置口径" style={{ minHeight: 66, border: '1px solid #d9e2ec', borderRadius: 6, padding: 8 }} /></label></div></Block>
        <Block title="四、工程量指标 - 4.1 总平、景观、道路、临设" note="用于围墙、出入口、临设、三通一平、道路总平、景观、室外管网等成本测算。"><FieldGrid project={project} fields={siteEngineeringFields} /></Block>
        <Block title="四、工程量指标 - 4.2 地下室、公区、示范区与配套" note="用于地下室、主楼地下室、人防、公区、大堂、售楼部、样板间、物业/社区用房等成本测算。"><FieldGrid project={project} fields={basementPublicFields} /></Block>
        <Block title="四、工程量指标 - 4.3 土建实体工程量" note="用于桩基、土方、防水、屋面、保温、外墙、门窗、栏杆等土建科目测算。"><FieldGrid project={project} fields={civilEngineeringFields} /></Block>
        <Block title="四、工程量指标 - 4.4 安装与设备数量" note="用于配电房、水泵房、消防水池等安装设备科目测算。"><FieldGrid project={project} fields={mepEquipmentFields} /></Block>
        <Block title="五、备注与口径说明" note="保留项目定位、面积口径、取数来源、特殊假设等，不参与计算。"><textarea form="overview-form" name="remark" defaultValue={project.remark || ''} placeholder="填写项目定位、测算边界、面积口径、取数说明等" style={{ width: '100%', minHeight: 90, border: '1px solid #d9e2ec', borderRadius: 8, padding: 10 }} /></Block>
        <div className="actions" style={{ justifyContent: 'flex-end' }}><Link href={`/projects/${project.id}`} className="btn">取消</Link><button form="overview-form" className="btn btn-primary">保存项目概况</button></div>
      </div>
    </div></main>
  );
}
