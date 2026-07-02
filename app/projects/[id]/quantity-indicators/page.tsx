import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState, StatusNotice, VersionContextBar, versionStatusLabel } from '@/components/commercial-status';
import { OverviewRoadValidation } from '@/components/overview-road-validation';
import { QuantityOverrideActions } from '@/components/quantity-override-actions';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const fieldStyle = { height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', background: '#fff' };
const readonlyFieldStyle = { ...fieldStyle, background: '#f2f4f7', color: '#667085' };
const cell = { padding: 9, borderBottom: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };

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
  ['landscapeArea', '景观总面积㎡'], ['hardscapeArea', '硬景面积㎡'], ['softscapeArea', '软景面积（绿化面积）㎡'], ['waterFeatureArea', '水景面积㎡'], ['childrenActivityArea', '儿童活动场地㎡'],
  ['elevatedFloorLandscapeArea', '人行通道面积㎡'], ['roadArea', '车行道路面积㎡'], ['fireRoadArea', '其中消防道路面积㎡']
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

function FieldGrid({ project, fields, locked }: { project: any; fields: readonly (readonly [string, string])[]; locked: boolean }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
    {fields.map(([name, label]) => <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>{label}<input form="quantity-indicators-form" name={name} type="number" step="0.01" max={name === 'fireRoadArea' ? valueOf(project, 'roadArea') : undefined} defaultValue={name === 'softscapeArea' ? (valueOf(project, name) || valueOf(project, 'greenArea')) : valueOf(project, name)} disabled={locked} style={locked ? readonlyFieldStyle : fieldStyle} /></label>)}
  </div>;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note ? <div className="meta">{note}</div> : null}</div>;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function quantityText(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof (value as any).toString === 'function') return (value as any).toString();
  return String(value);
}

function systemQuantity(line: { measureValue: unknown; coefficient: unknown }) {
  return round2(Number(line.measureValue || 0) * (Number(line.coefficient || 0) || 1));
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'orange' | 'red' }) {
  const styleMap = {
    neutral: { background: '#f2f4f7', color: '#475467', border: '#d0d5dd' },
    green: { background: '#f0fff4', color: '#2b8a3e', border: '#b2f2bb' },
    orange: { background: '#fff4e6', color: '#d9480f', border: '#ffd8a8' },
    red: { background: '#fff5f5', color: '#c92a2a', border: '#ffc9c9' }
  }[tone];
  return <span style={{ display: 'inline-flex', borderRadius: 999, border: `1px solid ${styleMap.border}`, background: styleMap.background, color: styleMap.color, padding: '3px 8px', fontSize: 12, fontWeight: 800 }}>{children}</span>;
}

export default async function QuantityIndicatorsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; locked?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true }
  });
  const locked = version ? isVersionLocked(version) : false;
  const costLines = version ? await prisma.costLine.findMany({
    where: {
      projectVersionId: version.id,
      OR: [{ productTypeId: null }, { productType: { isActive: true } }]
    },
    include: { costSubject: true, productType: true },
    orderBy: [{ professionalGroup: 'asc' }, { sortOrder: 'asc' }, { detailName: 'asc' }]
  }) : [];
  const overrideRows = costLines.filter((line) => Number(line.measureValue || 0) !== 0 || Number(line.quantity || 0) !== 0 || line.quantityOverride);
  const overriddenCount = overrideRows.filter((line) => line.quantityOverride).length;
  const disabledProductCount = (version?.products || []).filter((item) => !item.isActive).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1280 }}>
    <OverviewRoadValidation />
    <div className="page-header" style={{ alignItems: 'flex-start' }}><div><p className="eyebrow">基础数据</p><h1 className="title">工程量指标</h1><p className="subtitle">集中维护用于目标成本测算的工程量指标；成本明细工程量支持按行手算覆盖和恢复系统值。</p></div><div className="actions" style={{ marginTop: 0 }}><button form="quantity-indicators-form" className="btn btn-primary" disabled={locked}>保存工程量指标</button><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}/construction-standards`} className="btn">建造配置标准</Link></div></div>
    <VersionContextBar projectName={project.name} versionName={version?.name} versionStatus={version?.status} editable={!locked} extra={[['手算覆盖', overriddenCount], ['可手算行', overrideRows.length]]} />
    {searchParams?.saved === '1' ? <StatusNotice title="工程量指标已保存" tone="success">项目级工程量指标已更新。成本明细手算覆盖需在下方逐行保存。</StatusNotice> : null}
    {searchParams?.locked === '1' ? <StatusNotice title="未执行保存" tone="danger">当前版本已锁定，本次工程量指标保存未执行。</StatusNotice> : null}
    <form id="quantity-indicators-form" action={`/api/projects/${project.id}/quantity-indicators`} method="post" />
    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <Stat label="楼栋 / 单元 / 电梯" value={`${fmt(project.buildingCount)} / ${fmt(project.unitCount)} / ${fmt(project.elevatorCount)}`} />
      <Stat label="车位 / 充电桩" value={`${fmt(project.parkingCount)} / ${fmt(project.chargingPileCount)}`} />
      <Stat label="景观 / 硬景 / 软景" value={`${fmt(project.landscapeArea)} / ${fmt(project.hardscapeArea)} / ${fmt(project.softscapeArea)}㎡`} />
      <Stat label="周界 / 出入口" value={`${fmt(project.sitePerimeter)}m / ${fmt(project.gateCount)}个`} />
      <Stat label="手算覆盖 / 可手算行" value={`${fmt(overriddenCount)} / ${fmt(overrideRows.length)}`} note={disabledProductCount ? `已隐藏停用业态 ${disabledProductCount} 个` : undefined} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Block title="一、建筑与楼栋指标" note="用于楼栋、单元、电梯、标准层、层高等成本测算。"><FieldGrid project={project} fields={buildingFields} locked={locked} /></Block>
      <Block title="二、车位与充电桩指标" note="充电桩只作为工程量和设备安装指标，不作为独立业态。"><FieldGrid project={project} fields={parkingFields} locked={locked} /><label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', marginTop: 12 }}>车位/充电桩备注<textarea form="quantity-indicators-form" name="parkingRemark" defaultValue={project.parkingRemark || ''} disabled={locked} style={{ minHeight: 66, border: '1px solid #d9e2ec', borderRadius: 6, padding: 8, background: locked ? '#f2f4f7' : '#fff' }} /></label></Block>
      <Block title="三、场地、景观、道路与围墙指标" note="场平面积未填默认土地面积；软景面积与绿化面积合并为一个输入；消防道路面积不得大于车行道路面积。"><FieldGrid project={project} fields={siteFields} locked={locked} /></Block>
      <Block title="四、地下室 / 公区 / 配套面积" note="用于地下室、人防、公区、大堂、售楼部、样板间、物业及社区用房成本测算。"><FieldGrid project={project} fields={basementFields} locked={locked} /></Block>
      <StatusNotice title="地下室层高字段支持状态" tone="warning">当前前端已维护地下室层数和地下一层层高；地下二层层高、其他地下层平均层高仍为只读口径提示，暂未完整接入保存与规则引用。当前版本状态：{versionStatusLabel(version?.status)}。</StatusNotice>
      <Block title="五、土建工程量" note="用于桩基、土方、防水、屋面、保温、外墙、门窗、栏杆等土建科目。"><FieldGrid project={project} fields={civilFields} locked={locked} /></Block>
      <Block title="六、机电设备指标" note="用于配电房、水泵房、消防水池等安装设备类测算。"><FieldGrid project={project} fields={mepFields} locked={locked} /></Block>
      <Block title="七、成本明细工程量手算" note="按成本明细行录入手算覆盖；清除覆盖会恢复系统测算值，不会删除指标。">
        {locked ? <div style={{ border: '1px solid #ffc9c9', background: '#fff5f5', borderRadius: 8, padding: 10, marginBottom: 12 }}>当前版本已锁定，不能修改手算值。</div> : null}
        {overrideRows.length === 0 ? <EmptyState title="暂无可手算的成本明细工程量">请先生成或录入目标成本明细。形成成本行后，本区会显示系统测算值、手算覆盖值和当前生效值。</EmptyState> : <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1240, fontSize: 12 }}>
            <thead><tr>{['成本科目', '明细名称', '适用业态', '系统测算值', '手算覆盖值', '当前生效值', '状态', '操作'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
            <tbody>{overrideRows.map((line) => {
              const systemValue = systemQuantity(line);
              const currentValue = quantityText(line.quantity);
              const manualValue = line.quantityOverride ? currentValue : '';
              return <tr key={line.id} style={line.quantityOverride ? { background: '#fffaf0' } : undefined}>
                <td style={{ ...cell, fontWeight: 800 }}>{line.costSubject.code} {line.costSubject.name}</td>
                <td style={cell}>{line.detailName}<div className="meta">{line.professionalGroup || '未分组'}｜{line.measureBasis || '未配置取数依据'}</div></td>
                <td style={cell}>{line.productType?.name || line.regionOrProductType || '全项目'}</td>
                <td style={cell}>{fmt(systemValue)} {line.unit || ''}<div className="meta">取数 {fmt(line.measureValue)} × 系数 {fmt(line.coefficient || 1)}</div></td>
                <td style={cell}>{line.quantityOverride ? `${fmt(manualValue)} ${line.unit || ''}` : <span className="meta">空值，未覆盖</span>}</td>
                <td style={{ ...cell, fontWeight: 900 }}>{fmt(currentValue)} {line.unit || ''}</td>
                <td style={cell}>{line.quantityOverride ? <Badge tone="orange">已手算覆盖</Badge> : <Badge tone="green">使用系统值</Badge>}</td>
                <td style={{ ...cell, minWidth: 280 }}>
                  {version ? <QuantityOverrideActions projectId={project.id} versionId={version.id} costLineId={line.id} currentQuantity={currentValue} hasOverride={line.quantityOverride} locked={locked} /> : <span className="meta">暂无版本</span>}
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>}
      </Block>
    </div>
  </div></main>;
}
