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

const cityOptions = [['', '请选择城市'], ['成都', '成都'], ['德阳', '德阳'], ['重庆', '重庆'], ['西安', '西安'], ['绵阳', '绵阳'], ['其他', '其他']] as const;
const districtOptions = [['', '请选择区域/板块'], ['龙泉驿区', '龙泉驿区'], ['天府新区', '天府新区'], ['高新区', '高新区'], ['锦江区', '锦江区'], ['青羊区', '青羊区'], ['成华区', '成华区'], ['武侯区', '武侯区'], ['金牛区', '金牛区'], ['双流区', '双流区'], ['温江区', '温江区'], ['新都区', '新都区'], ['郫都区', '郫都区'], ['其他', '其他']] as const;

const basicFields = [
  ['name', '项目名称', 'text'], ['landAreaMu', '土地面积亩', 'number'], ['landArea', '土地面积㎡', 'number'], ['redLineArea', '用地红线面积㎡', 'number'],
  ['plotRatio', '容积率', 'number'], ['totalBuildingArea', '总建筑面积㎡', 'number'], ['capacityBuildingArea', '计容建筑面积㎡', 'number'],
  ['aboveGroundArea', '地上建筑面积㎡', 'number'], ['undergroundArea', '地下建筑面积㎡', 'number'], ['saleableArea', '可售面积㎡', 'number'], ['nonSaleableArea', '不可售面积㎡', 'number']
] as const;

const buildingIndicatorFields = [
  ['buildingCount', '楼栋数量', 'number'], ['unitCount', '单元数量', 'number'], ['householdCount', '户数/套数', 'number'], ['elevatorCount', '电梯数量', 'number'],
  ['aboveGroundFloors', '典型地上层数', 'number'], ['basementFloors', '地下层数', 'number'], ['standardFloorArea', '标准层面积㎡', 'number'],
  ['standardFloorHeight', '标准层层高m', 'number'], ['basementFloorHeight', '地下室层高m', 'number']
] as const;

const parkingIndicatorFields = [
  ['parkingCount', '总车位数', 'number'], ['undergroundPropertyParkingCount', '地下产权车位', 'number'], ['undergroundUseRightParkingCount', '地下使用权车位', 'number'],
  ['civilDefenseParkingCount', '人防车位', 'number'], ['aboveGroundParkingCount', '地上车位', 'number'], ['chargingPileCount', '充电桩总数', 'number'],
  ['fastChargingPileCount', '快充数量', 'number'], ['slowChargingPileCount', '慢充数量', 'number'], ['reservedChargingPileCount', '预留充电条件', 'number'],
  ['chargingPileRatio', '充电桩配置比例', 'number'], ['parkingPowerCapacity', '充电桩用电容量kVA', 'number']
] as const;

const siteEngineeringFields = [
  ['sitePerimeter', '周界长度m', 'number'], ['gateCount', '出入口数量', 'number'], ['formalGateCount', '正式出入口数量', 'number'], ['temporaryGateCount', '临时出入口数量', 'number'],
  ['temporaryFacilityArea', '临设面积㎡', 'number'], ['siteLevelingArea', '场平面积㎡', 'number'], ['landscapeArea', '景观总面积㎡', 'number'], ['hardscapeArea', '硬景面积㎡', 'number'],
  ['softscapeArea', '软景面积㎡', 'number'], ['greenArea', '绿地面积㎡', 'number'], ['waterFeatureArea', '水景面积㎡', 'number'], ['childrenActivityArea', '儿童活动场地㎡', 'number'],
  ['elevatedFloorLandscapeArea', '架空层景观面积㎡', 'number'], ['roadArea', '道路总面积㎡', 'number'], ['fireRoadArea', '消防道路面积㎡', 'number'], ['asphaltRoadArea', '沥青路面面积㎡', 'number']
] as const;

const basementPublicFields = [
  ['basementParkingArea', '地下车库面积㎡', 'number'], ['mainBuildingUndergroundArea', '主楼地下室面积㎡', 'number'], ['civilDefenseArea', '人防面积㎡', 'number'], ['nonCivilDefenseArea', '非人防面积㎡', 'number'],
  ['publicArea', '地上/地下公区面积㎡', 'number'], ['lobbyArea', '一楼入户大堂面积㎡', 'number'], ['salesOfficeArea', '售楼部面积㎡', 'number'], ['showFlatArea', '样板间面积㎡', 'number'],
  ['propertyManagementArea', '物业用房面积㎡', 'number'], ['communityServiceArea', '社区用房面积㎡', 'number']
] as const;

const civilEngineeringFields = [
  ['baseArea', '基底/占地面积㎡', 'number'], ['pileFoundationArea', '桩基面积㎡', 'number'], ['earthworkVolume', '土方量m³', 'number'], ['waterproofArea', '防水面积㎡', 'number'],
  ['roofArea', '屋面面积㎡', 'number'], ['insulationArea', '保温面积㎡', 'number'], ['facadeArea', '外墙面积㎡', 'number'], ['windowArea', '门窗面积㎡', 'number'], ['railingLength', '栏杆长度m', 'number']
] as const;

const mepEquipmentFields = [['powerRoomCount', '配电房数量', 'number'], ['pumpRoomCount', '水泵房数量', 'number'], ['firePoolVolume', '消防水池容积m³', 'number']] as const;
const yesNo = [['true', '是'], ['false', '否']] as const;
const fitoutStandards = [['标准', '标准'], ['中档', '中档'], ['高档', '高档'], ['豪华', '豪华']] as const;
const formField = { height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' };
const tableInput = { width: '100%', minWidth: 82, height: 30, border: '1px solid #d9e2ec', borderRadius: 5, padding: '3px 6px' };
const cell = { padding: 7, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };

function valueOf(project: any, name: string) {
  const value = project[name];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return String(value);
}
function fmt(value: unknown) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function displayValue(value: unknown) { return typeof value === 'string' ? value : fmt(value); }
function getRank(name: string) { return presetMeta.get(name)?.rank ?? 9999; }
function isVirtualRevenueProduct(name: string) { return name.startsWith('商业收入-') || name.startsWith('其他收入-'); }
function getCategory(name: string, remark?: string | null) {
  if (presetMeta.has(name)) return presetMeta.get(name)?.category || '其他';
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1] || '其他';
  return '其他';
}
function inputFor(project: any, [name, label, type]: readonly [string, string, string], formId = 'overview-form') {
  return <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input form={formId} name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={valueOf(project, name)} style={formField} /></label>;
}
function selectFor(project: any, name: string, label: string, options: readonly (readonly [string, string])[], defaultValue?: string, note?: string) {
  const value = valueOf(project, name) || defaultValue || options[0]?.[0] || '';
  return <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<select form="overview-form" name={name} defaultValue={value} style={formField}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{note ? <span className="meta">{note}</span> : null}</label>;
}
function textFor(project: any, name: string, label: string, placeholder?: string) {
  return <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input form="overview-form" name={name} defaultValue={valueOf(project, name)} placeholder={placeholder} style={formField} /></label>;
}
function FieldGrid({ project, fields }: { project: any; fields: readonly (readonly [string, string, string])[] }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>{fields.map((field) => inputFor(project, field))}</div>; }
function ConfigGrid({ children }: { children: ReactNode }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{children}</div>; }
function Block({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, background: '#fff', overflow: 'hidden' }}><div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec' }}><h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2><p className="meta" style={{ margin: '5px 0 0' }}>{note}</p></div><div style={{ padding: 14 }}>{children}</div></section>;
}
function MetricCard({ label, value, unit, note }: { label: string; value: unknown; unit?: string; note?: string }) {
  return <div className="stat" style={{ minHeight: 86 }}><div className="stat-label">{label}</div><div className="stat-value">{displayValue(value)}{unit || ''}</div>{note ? <div className="meta">{note}</div> : null}</div>;
}
function addInput(name: string, label: string) { return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input name={name} type="number" step="0.01" style={formField} /></label>; }
function summaryCard(label: string, value: unknown, note?: string) { return <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 10, background: '#fcfdff' }}><div className="meta">{label}</div><b>{displayValue(value)}</b>{note ? <p className="meta" style={{ margin: '4px 0 0' }}>{note}</p> : null}</div>; }

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; productSaved?: string; rows?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({ where: activeVersionWhere(project), orderBy: activeVersionOrder(project), include: { products: true } });
  const allProducts = [...(version?.products || [])].sort((a, b) => getRank(a.name) - getRank(b.name) || a.name.localeCompare(b.name));
  const products = allProducts.filter((item) => item.isActive && !isVirtualRevenueProduct(item.name));
  const productNames = new Set(products.map((item) => item.name));
  const missingPresets = presetGroups.map((group) => ({ ...group, names: group.names.filter((name) => !productNames.has(name)) })).filter((group) => group.names.length > 0);
  const productBuildingArea = products.reduce((sum, row) => sum + Number(row.buildingArea || 0), 0);
  const productSaleableArea = products.reduce((sum, row) => sum + Number(row.saleableArea || 0), 0);
  const productCapacityArea = products.reduce((sum, row) => sum + Number(row.capacityArea || 0), 0);
  const saleableProducts = products.filter((row) => row.isSaleable);
  const nonSaleableProducts = products.filter((row) => !row.isSaleable);
  const undergroundProductArea = products.filter((row) => getCategory(row.name, row.remark) === '地下空间').reduce((sum, row) => sum + Number(row.buildingArea || 0), 0);
  const supportProductArea = products.filter((row) => getCategory(row.name, row.remark) === '配套用房').reduce((sum, row) => sum + Number(row.buildingArea || 0), 0);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header" style={{ alignItems: 'flex-start' }}><div><p className="eyebrow">项目基础</p><h1 className="title">项目概况</h1><p className="subtitle">项目概况是目标成本测算指标入口，优先维护土地、规划、面积、业态、车位、充电桩、景观、周界、出入口、楼栋、单元和电梯等关键口径。</p></div><div className="actions" style={{ marginTop: 0 }}><button form="overview-form" className="btn btn-primary">保存项目概况</button><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本测算</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>项目概况已保存。</div> : null}
    {searchParams?.productSaved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>业态/产品构成已保存。{searchParams?.rows ? `本次处理 ${searchParams.rows} 行。` : ''}</div> : null}
    <form id="overview-form" action={`/api/projects/${project.id}/overview`} method="post" />

    <Block title="测算关键指标看板" note="先看这些关键指标是否完整，再进入目标成本测算。充电桩只做指标，不作为独立业态。">
      <div className="summary-strip" style={{ marginBottom: 0 }}>
        <MetricCard label="土地面积" value={project.landAreaMu || project.landArea} unit={project.landAreaMu ? '亩' : '㎡'} note="土地/红线口径" />
        <MetricCard label="总建面" value={project.totalBuildingArea} unit="㎡" note="建面单方基数" />
        <MetricCard label="可售面积" value={project.saleableArea} unit="㎡" note="可售单方基数" />
        <MetricCard label="地下室面积" value={project.undergroundArea} unit="㎡" />
        <MetricCard label="车位 / 充电桩" value={`${fmt(project.parkingCount)} / ${fmt(project.chargingPileCount)}`} />
        <MetricCard label="景观 / 硬景 / 软景" value={`${fmt(project.landscapeArea)} / ${fmt(project.hardscapeArea)} / ${fmt(project.softscapeArea)}`} unit="㎡" />
        <MetricCard label="周界 / 出入口" value={`${fmt(project.sitePerimeter)} / ${fmt(project.gateCount)}`} note="围墙和出入口测算" />
        <MetricCard label="楼栋 / 单元 / 电梯" value={`${fmt(project.buildingCount)} / ${fmt(project.unitCount)} / ${fmt(project.elevatorCount)}`} />
      </div>
    </Block>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
      <Block title="一、基础信息与规划指标" note="维护项目名称、城市板块、土地亩数、土地面积、容积率、总建面、计容建面、可售面积等全局口径。土地面积亩在前，保存时自动换算㎡。">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
          {selectFor(project, 'city', '城市', cityOptions)}
          {selectFor(project, 'district', '区域/板块', districtOptions)}
        </div>
        <FieldGrid project={project} fields={basicFields} />
      </Block>

      <Block title="二、业态 / 产品构成" note="只显示当前启用的真实业态；商业收入-一层/二层等收入虚拟项不在概况页展示，避免和商业街重复。">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 14 }}><div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}><div><b>本项目启用业态</b><p className="meta" style={{ margin: '4px 0 0' }}>可售 {saleableProducts.length} 个；不可售/配套/地下空间 {nonSaleableProducts.length} 个。未启用业态不在本表显示。</p></div><button form="overview-products-form" className="btn btn-primary">保存启用业态</button></div><div style={{ overflowX: 'auto', marginBottom: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontSize: 13 }}><thead><tr>{['口径', '概况表总控', '启用业态合计', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #d9e2ec', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{[['建筑面积', Number(project.totalBuildingArea || 0), productBuildingArea], ['计容面积', Number(project.capacityBuildingArea || 0), productCapacityArea], ['可售面积', Number(project.saleableArea || 0), productSaleableArea]].map(([name, overview, product]) => <tr key={String(name)}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{name}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(overview)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(product)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', color: Math.abs(Number(overview) - Number(product)) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(Number(overview) - Number(product))}㎡</td></tr>)}</tbody></table></div><form id="overview-products-form" action={`/api/projects/${project.id}/products/batch`} method="post" /><input form="overview-products-form" type="hidden" name="rowCount" value={products.length} /><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1120, fontSize: 12 }}><thead><tr>{['分类', '业态', '建筑面积', '计容面积', '可售面积', '不可售面积', '分摊权重', '销售', '分摊', '备注'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{products.length === 0 ? <tr><td colSpan={10} style={{ padding: 14, color: '#667085' }}>本项目暂无启用业态。</td></tr> : products.map((item, index) => <tr key={item.id} style={{ background: index % 2 ? '#fff' : '#fcfdff' }}><td style={cell}>{getCategory(item.name, item.remark)}</td><td style={{ ...cell, fontWeight: 800 }}><input form="overview-products-form" type="hidden" name={`productId-${index}`} value={item.id} /><input form="overview-products-form" type="hidden" name={`name-${index}`} value={item.name} />{item.name}</td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`buildingArea-${index}`} type="number" step="0.01" defaultValue={Number(item.buildingArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`capacityArea-${index}`} type="number" step="0.01" defaultValue={Number(item.capacityArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`saleableArea-${index}`} type="number" step="0.01" defaultValue={Number(item.saleableArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`nonSaleableArea-${index}`} type="number" step="0.01" defaultValue={Number(item.nonSaleableArea || 0) || ''} style={tableInput} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`allocationWeight-${index}`} type="number" step="0.01" defaultValue={Number(item.allocationWeight || 0) || ''} style={{ ...tableInput, minWidth: 70 }} /></td><td style={{ ...cell, textAlign: 'center' }}><input form="overview-products-form" name={`isSaleable-${index}`} type="checkbox" defaultChecked={item.isSaleable} /></td><td style={{ ...cell, textAlign: 'center' }}><input form="overview-products-form" name={`participateAllocation-${index}`} type="checkbox" defaultChecked={item.participateAllocation} /></td><td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`remark-${index}`} defaultValue={item.remark || ''} style={{ ...tableInput, minWidth: 150 }} /></td></tr>)}</tbody></table></div></div><form action={`/api/projects/${project.id}/products`} method="post" style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12, background: '#fcfdff', display: 'flex', flexDirection: 'column', gap: 10 }}><input type="hidden" name="returnPath" value="overview" /><input type="hidden" name="mode" value="create" /><b>新增 / 更新业态</b><p className="meta" style={{ margin: 0 }}>从后台业态模板中选择，避免重复。未启用业态请到业态维护页统一启停。</p><label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>业态名称<select name="name" required disabled={missingPresets.length === 0} defaultValue="" style={formField}><option value="" disabled>{missingPresets.length === 0 ? '模板业态均已选择' : '请选择未选业态'}</option>{missingPresets.map((group) => <optgroup key={group.category} label={group.category}>{group.names.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}</select></label>{addInput('buildingArea', '建筑面积㎡')}{addInput('capacityArea', '计容面积㎡')}{addInput('saleableArea', '可售面积㎡')}{addInput('nonSaleableArea', '不可售面积㎡')}{addInput('allocationWeight', '分摊权重')}<button className="btn btn-primary" disabled={missingPresets.length === 0}>添加到本项目</button><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态增减维护</Link></form></div>
      </Block>

      <Block title="三、建筑与楼栋指标" note="用于电梯、单元、楼栋、标准层、层高等规则测算；下方同时展示业态面积合计，便于核对是否和楼栋面积口径一致。"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 }}>{summaryCard('启用业态建筑面积合计', `${fmt(productBuildingArea)}㎡`)}{summaryCard('概况总建筑面积', `${fmt(project.totalBuildingArea)}㎡`)}{summaryCard('楼栋/单元/电梯', `${fmt(project.buildingCount)} / ${fmt(project.unitCount)} / ${fmt(project.elevatorCount)}`)}</div><FieldGrid project={project} fields={buildingIndicatorFields} /></Block>
      <Block title="四、车位与充电桩指标" note="充电桩数量在这里维护，不作为业态；成本进入安装/设备明细，业态归属地下车位。"><FieldGrid project={project} fields={parkingIndicatorFields} /><div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input form="overview-form" name="chargingIncludedInParkingPrice" type="checkbox" defaultChecked={project.chargingIncludedInParkingPrice} style={{ width: 'auto' }} />充电桩并入车位售价</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475467' }}><input form="overview-form" name="chargingSeparateCostMeasure" type="checkbox" defaultChecked={project.chargingSeparateCostMeasure} style={{ width: 'auto' }} />充电桩单独测算成本</label><label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', gridColumn: '1 / -1' }}>车位/充电桩备注<textarea form="overview-form" name="parkingRemark" defaultValue={project.parkingRemark || ''} placeholder="产权车位、人防车位、快慢充配置口径" style={{ minHeight: 66, border: '1px solid #d9e2ec', borderRadius: 6, padding: 8 }} /></label></div></Block>
      <Block title="五、场地、景观、道路与围墙指标" note="用于围墙、出入口、临设、三通一平、道路总平、景观、室外管网等成本测算。保存时：场平面积未填默认土地面积；绿地面积和软景面积互为默认。"><FieldGrid project={project} fields={siteEngineeringFields} /></Block>
      <Block title="六、地下室 / 公区 / 配套面积" note="用于地下室、主楼地下室、人防、公区、大堂、售楼部、样板间、物业/社区用房等成本测算；同时展示业态表中地下空间和配套面积合计，方便核对。"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 }}>{summaryCard('业态地下空间合计', `${fmt(undergroundProductArea)}㎡`)}{summaryCard('概况地下室面积', `${fmt(project.undergroundArea)}㎡`)}{summaryCard('业态配套用房合计', `${fmt(supportProductArea)}㎡`)}</div><FieldGrid project={project} fields={basementPublicFields} /></Block>
      <Block title="七、土建工程量" note="用于桩基、土方、防水、屋面、保温、外墙、门窗、栏杆等土建科目测算。"><FieldGrid project={project} fields={civilEngineeringFields} /></Block>
      <Block title="八、机电设备指标" note="用于配电房、水泵房、消防水池等安装设备科目测算。"><FieldGrid project={project} fields={mepEquipmentFields} /></Block>
      <Block title="九、项目配置参数" note="控制装配式、精装交付、商业/地库/配套/示范区装修和采暖口径。装配式和采暖必须填写适用范围，否则不会默认启用全部业态科目。"><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><div><b>9.1 装配式配置</b><ConfigGrid>{selectFor(project, 'isPrefabricated', '是否装配式', yesNo, 'false')}{textFor(project, 'prefabricatedScope', '装配式适用范围', '高层/洋房/商业/配套/地下室/全部')}{inputFor(project, ['prefabricationRate', '装配率%', 'number'])}{textFor(project, 'prefabricatedSystem', '装配式结构形式', 'PC构件/叠合板/预制楼梯/预制墙板')}</ConfigGrid></div><div><b>9.2 住宅精装配置</b><ConfigGrid>{selectFor(project, 'residentialPublicFitoutStandard', '住宅公区装修标准', fitoutStandards, '标准', '住宅公区默认装修，不建议关闭。')}{selectFor(project, 'undergroundLobbyFitoutStandard', '地下归家装修标准', [['无地下归家', '无地下归家'], ['标准', '标准'], ['中档', '中档'], ['高档', '高档']], '标准')}{selectFor(project, 'residentialFitoutDelivery', '是否精装交付', yesNo, 'false')}{selectFor(project, 'residentialFitoutType', '户内精装修类型', [['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装']], '硬装')}{selectFor(project, 'residentialFitoutStandard', '户内交付标准', [['毛坯', '毛坯'], ['简装', '简装'], ['中装', '中装'], ['精装', '精装'], ['豪装', '豪装']], '毛坯')}</ConfigGrid></div><div><b>9.3 商业、地库、配套及示范区装修</b><ConfigGrid>{selectFor(project, 'commercialPublicFitout', '是否商业公区装修', yesNo, 'false')}{selectFor(project, 'commercialPublicFitoutStandard', '商业公区装修标准', fitoutStandards, '标准')}{selectFor(project, 'shopDeliveryStandard', '商铺交付标准', [['毛坯', '毛坯'], ['简装', '简装'], ['中装', '中装'], ['精装', '精装']], '毛坯')}{selectFor(project, 'basementQualityUpgrade', '是否地库品质提升', yesNo, 'false')}{selectFor(project, 'basementQualityStandard', '地库品质标准', [['基础美化', '基础美化'], ['中档', '中档'], ['高档', '高档']], '基础美化')}{selectFor(project, 'propertyFitout', '物业用房精装', yesNo, 'false')}{selectFor(project, 'communityFitout', '社区用房精装', yesNo, 'false')}{selectFor(project, 'supportFitout', '配套用房精装', yesNo, 'false')}{selectFor(project, 'hasSalesOffice', '是否有售楼部', yesNo, 'false')}{selectFor(project, 'salesOfficeFitoutType', '售楼部装修类型', [['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装']], '硬装+软装')}{selectFor(project, 'hasShowFlat', '是否有样板间', yesNo, 'false')}{selectFor(project, 'showFlatFitoutType', '样板间装修类型', [['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装'], ['全部', '全部']], '全部')}</ConfigGrid></div><div><b>9.4 采暖配置</b><ConfigGrid>{selectFor(project, 'heatingEnabled', '是否采暖', yesNo, 'false')}{textFor(project, 'heatingScope', '采暖适用范围', '高层/洋房/商业/配套/全部')}{textFor(project, 'heatingType', '采暖形式', '地暖/散热器/集中供暖/空气源')}</ConfigGrid></div></div></Block>
      <Block title="十、备注与口径说明" note="记录本项目特殊口径、暂估说明、后续复核事项。"><textarea form="overview-form" name="remark" defaultValue={project.remark || ''} style={{ width: '100%', minHeight: 90, border: '1px solid #d9e2ec', borderRadius: 8, padding: 10 }} /></Block>
    </div>
  </div></main>;
}
