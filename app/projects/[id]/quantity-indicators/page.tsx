import Link from 'next/link';
import type { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const fieldStyle = { height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' };

const buildingFields = [
  ['buildingCount', '楼栋数量'], ['unitCount', '单元数量'], ['householdCount', '户数/套数'], ['elevatorCount', '电梯数量'],
  ['aboveGroundFloors', '典型地上层数'], ['basementFloors', '地下层数'], ['standardFloorArea', '标准层面积㎡'], ['standardFloorHeight', '标准层层高m'], ['basementFloorHeight', '地下室层高m']
] as const;

const parkingFields = [
  ['parkingCount', '总车位数'], ['undergroundPropertyParkingCount', '地下产权车位'], ['undergroundUseRightParkingCount', '地下使用权车位'], ['civilDefenseParkingCount', '人防车位'], ['aboveGroundParkingCount', '地上车位'],
  ['chargingPileCount', '充电桩总数'], ['fastChargingPileCount', '快充数量'], ['slowChargingPileCount', '慢充数量'], ['reservedChargingPileCount', '预留充电条件'], ['chargingPileRatio', '充电桩配置比例'], ['parkingPowerCapacity', '充电桩用电容量kVA']
] as const;

const siteFields = [
  ['sitePerimeter', '周界长度m'], ['gateCount', '出入口数量'], ['formalGateCount', '正式出入口数量'], ['temporaryGateCount', '临时出入口数量'], ['temporaryFacilityArea', '临设面积㎡'], ['siteLevelingArea', '场平面积㎡'],
  ['landscapeArea', '景观总面积㎡'], ['hardscapeArea', '硬景面积㎡'], ['softscapeArea', '软景面积㎡'], ['greenArea', '绿地面积㎡'], ['waterFeatureArea', '水景面积㎡'], ['childrenActivityArea', '儿童活动场地㎡'], ['elevatedFloorLandscapeArea', '架空层景观面积㎡'],
  ['roadArea', '道路总面积㎡'], ['fireRoadArea', '消防道路面积㎡'], ['asphaltRoadArea', '沥青路面面积㎡']
] as const;

const basementFields = [
  ['basementParkingArea', '地下车库面积㎡'], ['mainBuildingUndergroundArea', '主楼地下室面积㎡'], ['civilDefenseArea', '人防面积㎡'], ['nonCivilDefenseArea', '非人防面积㎡'],
  ['publicArea', '地上/地下公区面积㎡'], ['lobbyArea', '一楼入户大堂面积㎡'], ['salesOfficeArea', '售楼部面积㎡'], ['showFlatArea', '样板间面积㎡'], ['propertyManagementArea', '物业用房面积㎡'], ['communityServiceArea', '社区用房面积㎡']
] as const;

const civilFields = [
  ['baseArea', '基底/占地面积㎡'], ['pileFoundationArea', '桩基面积㎡'], ['earthworkVolume', '土方量m³'], ['waterproofArea', '防水面积㎡'], ['roofArea', '屋面面积㎡'], ['insulationArea', '保温面积㎡'], ['facadeArea', '外墙面积㎡'], ['windowArea', '门窗面积㎡'], ['railingLength', '栏杆长度m']
] as const;

const mepFields = [['powerRoomCount', '配电房数量'], ['pumpRoomCount', '水泵房数量'], ['firePoolVolume', '消防水池容积m³']] as const;

function valueOf(project: any, name: string) {
  const value = project[name];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return String(value);
}

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function Block({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
    <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec' }}>
      <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
      <p className="meta" style={{ margin: '5px 0 0' }}>{note}</p>
    </div>
    <div style={{ padding: 14 }}>{children}</div>
  </section>;
}

function FieldGrid({ project, fields }: { project: any; fields: readonly (readonly [string, string])[] }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
    {fields.map(([name, label]) => <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input form="quantity-indicators-form" name={name} type="number" step="0.01" defaultValue={valueOf(project, name)} style={fieldStyle} /></label>)}
  </div>;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note ? <div className="meta">{note}</div> : null}</div>;
}

export default async function QuantityIndicatorsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header" style={{ alignItems: 'flex-start' }}><div><p className="eyebrow">基础数据</p><h1 className="title">工程量指标</h1><p className="subtitle">集中维护用于目标成本测算的工程量指标。该页只录入工程量，不维护建造标准和业态产品。</p></div><div className="actions" style={{ marginTop: 0 }}><button form="quantity-indicators-form" className="btn btn-primary">保存工程量指标</button><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}/construction-standards`} className="btn">建造配置标准</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>工程量指标已保存。</div> : null}
    <form id="quantity-indicators-form" action={`/api/projects/${project.id}/quantity-indicators`} method="post" />
    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <Stat label="楼栋 / 单元 / 电梯" value={`${fmt(project.buildingCount)} / ${fmt(project.unitCount)} / ${fmt(project.elevatorCount)}`} />
      <Stat label="车位 / 充电桩" value={`${fmt(project.parkingCount)} / ${fmt(project.chargingPileCount)}`} />
      <Stat label="景观 / 硬景 / 软景" value={`${fmt(project.landscapeArea)} / ${fmt(project.hardscapeArea)} / ${fmt(project.softscapeArea)}㎡`} />
      <Stat label="周界 / 出入口" value={`${fmt(project.sitePerimeter)}m / ${fmt(project.gateCount)}个`} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Block title="一、建筑与楼栋指标" note="用于楼栋、单元、电梯、标准层、层高等成本测算。"><FieldGrid project={project} fields={buildingFields} /></Block>
      <Block title="二、车位与充电桩指标" note="充电桩只作为工程量和设备安装指标，不作为独立业态。"><FieldGrid project={project} fields={parkingFields} /><label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', marginTop: 12 }}>车位/充电桩备注<textarea form="quantity-indicators-form" name="parkingRemark" defaultValue={project.parkingRemark || ''} style={{ minHeight: 66, border: '1px solid #d9e2ec', borderRadius: 6, padding: 8 }} /></label></Block>
      <Block title="三、场地、景观、道路与围墙指标" note="场平面积未填默认土地面积；绿地面积和软景面积互为默认。"><FieldGrid project={project} fields={siteFields} /></Block>
      <Block title="四、地下室 / 公区 / 配套面积" note="用于地下室、人防、公区、大堂、售楼部、样板间、物业及社区用房成本测算。"><FieldGrid project={project} fields={basementFields} /></Block>
      <Block title="五、土建工程量" note="用于桩基、土方、防水、屋面、保温、外墙、门窗、栏杆等土建科目。"><FieldGrid project={project} fields={civilFields} /></Block>
      <Block title="六、机电设备指标" note="用于配电房、水泵房、消防水池等安装设备类测算。"><FieldGrid project={project} fields={mepFields} /></Block>
    </div>
  </div></main>;
}
