import Link from 'next/link';
import type { ReactNode } from 'react';
import { StatusNotice, VersionContextBar } from '@/components/commercial-status';
import { ProfileObjectAction, ProfileSectionForm } from '@/components/profile-section-form';
import { QuantityOverrideActions } from '@/components/quantity-override-actions';
import {
  getProfileConstructionStandards,
  getProfileOverview,
  getProfileProductObjects,
  getProfileProjectMetrics,
  getProfileQuantityIndicators
} from '@/lib/profile-service';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SectionKey = 'overview' | 'product-objects' | 'construction-standards' | 'project-metrics' | 'quantity-indicators';
type Field = readonly [string, string, 'text' | 'number' | 'checkbox', unknown?, string?];

const sections: Array<{ key: SectionKey; label: string; title: string; note: string }> = [
  { key: 'overview', label: '项目总览', title: '项目总览', note: '查看项目、版本、完整性和关键指标摘要。' },
  { key: 'product-objects', label: '业态产品与对象', title: '业态产品与对象', note: '维护启用业态、停用业态和兼容对象状态。' },
  { key: 'construction-standards', label: '建造标准', title: '建造标准', note: '维护交付标准、专项开关和关键配置字段。' },
  { key: 'project-metrics', label: '项目指标', title: '项目指标', note: '维护面积、楼栋、地下室、车位、景观道路等基础指标。' },
  { key: 'quantity-indicators', label: '工程量指标', title: '工程量指标', note: '查看系统值、手算值、生效值，并保留逐行手算覆盖能力。' }
];

const presetObjects = [
  { category: '住宅类', names: ['高层住宅', '小高层住宅', '洋房', '叠拼', '合院', '别墅'] },
  { category: '商业及经营类', names: ['底商', '集中商业', '商业街', '公寓', '办公', '酒店'] },
  { category: '地下及车位类', names: ['地下车库', '地下车位', '人防车位', '非人防车位', '立体车位', '充电桩车位'] },
  { category: '配套及不可售类', names: ['物业用房', '社区用房', '会所', '架空层', '幼儿园', '配建用房', '移交用房'] },
  { category: '特殊条件类', names: ['人防', '装配式', '采暖', '精装修', '古建专项', '示范区', '售楼处', '样板间'] }
] as const;

const inputStyle = { height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', background: '#fff' };
const readonlyStyle = { ...inputStyle, background: '#f2f4f7', color: '#667085' };
const cell = { padding: 9, borderBottom: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };

function n(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function fmt(value: unknown) {
  return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object' && typeof (value as any).toString === 'function') return (value as any).toString();
  return String(value);
}

function display(value: unknown, suffix = '') {
  if (value === null || value === undefined || value === '') return '未配置';
  return typeof value === 'number' ? `${fmt(value)}${suffix}` : `${value}${suffix}`;
}

function objectTypeLabel(type?: string | null) {
  const map: Record<string, string> = {
    product_type: '普通产品业态',
    basement_cost_object: '地下室成本对象',
    parking_income_object: '车位收入对象',
    supporting_cost_object: '配套成本对象',
    marketing_display_object: '营销展示对象',
    special_config_object: '专项配置对象'
  };
  return map[String(type || '')] || String(type || '未分类');
}

function objectTypeTone(type?: string | null): 'neutral' | 'green' | 'blue' | 'orange' | 'red' {
  if (type === 'parking_income_object') return 'blue';
  if (type === 'marketing_display_object') return 'orange';
  if (type === 'basement_cost_object' || type === 'supporting_cost_object') return 'green';
  if (type === 'special_config_object') return 'orange';
  return 'neutral';
}

function resultData(result: { body: any }) {
  return result.body?.data;
}

function activeSection(input?: string): SectionKey {
  return sections.some((item) => item.key === input) ? input as SectionKey : 'overview';
}

function profileUrl(projectId: string, versionId: string, section?: string) {
  return section ? `/api/projects/${projectId}/versions/${versionId}/profile/${section}` : `/api/projects/${projectId}/versions/${versionId}/profile`;
}

function TabNav({ projectId, current }: { projectId: string; current: SectionKey }) {
  return <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
    {sections.map((item) => <Link key={item.key} href={`/projects/${projectId}/overview?section=${item.key}`} className={current === item.key ? 'btn btn-primary' : 'btn'}>{item.label}</Link>)}
  </nav>;
}

function HeaderActions({ projectId, versionId, current, locked }: { projectId: string; versionId?: string; current: SectionKey; locked: boolean }) {
  const saveable = current !== 'quantity-indicators' && versionId;
  return <div className="actions" style={{ marginTop: 0 }}>
    {saveable ? <button form={`profile-${current}-form`} className="btn btn-primary" disabled={locked}>保存本分区</button> : null}
    {current === 'quantity-indicators' ? <Link href={`/projects/${projectId}/quantity-indicators`} className="btn">完整工程量页</Link> : null}
    {current === 'product-objects' ? locked ? <button className="btn" disabled>完整维护页</button> : <Link href={`/projects/${projectId}/product-maintenance`} className="btn">完整维护页</Link> : null}
    <Link href={`/projects/${projectId}`} className="btn">返回项目测算中心</Link>
  </div>;
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'blue' | 'orange' | 'red' }) {
  const styleMap = {
    neutral: { background: '#f2f4f7', color: '#475467', border: '#d0d5dd' },
    green: { background: '#f0fff4', color: '#2b8a3e', border: '#b2f2bb' },
    blue: { background: '#e7f5ff', color: '#0b7285', border: '#a5d8ff' },
    orange: { background: '#fff4e6', color: '#d9480f', border: '#ffd8a8' },
    red: { background: '#fff5f5', color: '#c92a2a', border: '#ffc9c9' }
  }[tone];
  return <span style={{ display: 'inline-flex', borderRadius: 999, border: `1px solid ${styleMap.border}`, background: styleMap.background, color: styleMap.color, padding: '3px 8px', fontSize: 12, fontWeight: 800 }}>{children}</span>;
}

function TooltipStyles() {
  return <style>{`
    .profile-tip { position: relative; display: inline-flex; margin-left: 5px; vertical-align: middle; }
    .profile-tip__icon { width: 16px; height: 16px; border: 1px solid #cbd5e1; border-radius: 999px; background: #f8fafc; color: #475467; font-size: 11px; font-weight: 900; line-height: 14px; text-align: center; cursor: help; }
    .profile-tip__bubble { position: absolute; z-index: 10; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); width: max-content; max-width: 280px; padding: 7px 9px; border-radius: 6px; background: #111827; color: #fff; font-size: 12px; line-height: 1.5; opacity: 0; visibility: hidden; pointer-events: none; white-space: normal; }
    .profile-tip:hover .profile-tip__bubble, .profile-tip:focus-within .profile-tip__bubble { opacity: 1; visibility: visible; }
  `}</style>;
}

function Tip({ text }: { text: string }) {
  return <span className="profile-tip"><span className="profile-tip__icon" tabIndex={0}>?</span><span className="profile-tip__bubble">{text}</span></span>;
}

function Card({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return <section style={{ border: '1px solid #d9e2ec', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
    <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div><h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>{note ? <p className="meta" style={{ margin: '5px 0 0' }}>{note}</p> : null}</div>
      {action}
    </div>
    <div style={{ padding: 14 }}>{children}</div>
  </section>;
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note ? <div className="meta">{note}</div> : null}</div>;
}

function Input({ name, label, value, type = 'text', locked, note }: { name: string; label: string; value: unknown; type?: 'text' | 'number'; locked: boolean; note?: string }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>
    {label}
    <input name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={valueText(value)} disabled={locked} style={locked ? readonlyStyle : inputStyle} />
    {note ? <span className="meta">{note}</span> : null}
  </label>;
}

function Checkbox({ name, label, checked, locked }: { name: string; label: string; checked: boolean; locked: boolean }) {
  return <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#475467' }}>
    <input name={name} type="checkbox" defaultChecked={checked} disabled={locked} />
    {label}
  </label>;
}

function FieldGrid({ fields, locked }: { fields: Field[]; locked: boolean }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
    {fields.map(([name, label, type, value, note]) => type === 'checkbox'
      ? <Checkbox key={name} name={name} label={label} checked={Boolean(value)} locked={locked} />
      : <Input key={name} name={name} label={label} value={value} type={type} locked={locked} note={note} />)}
  </div>;
}

function SectionShell({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>;
}

async function OverviewSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileOverview(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const data: any = resultData(result);
  const metrics = await getProfileProjectMetrics(projectId, versionId);
  const m: any = metrics.body.success ? resultData(metrics) : {};
  return <ProfileSectionForm formId="profile-overview-form" endpoint={profileUrl(projectId, versionId, 'overview')} locked={locked} successMessage="项目总览已保存。">
    <SectionShell>
      <div className="summary-strip">
        <Stat label="项目名称" value={data.projectName || '未命名'} />
        <Stat label="所在地区" value={data.region || '未配置'} />
        <Stat label="当前版本" value={data.versionName || '暂无版本'} note={data.versionStatus || '未设置'} />
        <Stat label="下一建议分区" value={data.nextRecommendedSection || '无'} />
      </div>
      <Card title="基础信息" note="总览页只保留轻量基础字段，更多指标请进入对应分区。">
        <FieldGrid locked={locked} fields={[
          ['projectName', '项目名称', 'text', data.projectName],
          ['region', '地区', 'text', data.region, '格式建议：城市/区县'],
          ['projectType', '项目类型', 'text', data.projectType],
          ['developmentMode', '开发模式', 'text', data.developmentMode],
          ['templateSource', '模板来源', 'text', data.templateSource]
        ]} />
      </Card>
      <Card title="关键总量摘要">
        <div className="summary-strip">
          <Stat label="地块面积" value={display(m.land?.landArea, '㎡')} />
          <Stat label="总建筑面积" value={display(m.buildingArea?.totalBuildingArea, '㎡')} />
          <Stat label="计容建筑面积" value={display(m.buildingArea?.plotRatioBuildingArea, '㎡')} />
          <Stat label="地下建筑面积" value={display(m.buildingArea?.undergroundBuildingArea, '㎡')} />
          <Stat label="地下车位" value={display(m.parking?.undergroundParkingCount, '个')} />
        </div>
      </Card>
      <Card title="数据完整性" note="V1 仅做存在性判断，不做复杂评分。">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(data.dataCompleteness || {}).map(([key, value]) => <Badge key={key} tone={value ? 'green' : 'orange'}>{key}: {value ? '已录入' : '待补充'}</Badge>)}
        </div>
        {data.warningMessages?.length ? <p className="meta" style={{ marginBottom: 0 }}>{data.warningMessages.join('；')}</p> : null}
      </Card>
    </SectionShell>
  </ProfileSectionForm>;
}

async function ProductObjectsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileProductObjects(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const objects: any[] = (resultData(result) as any).objects || [];
  const enabled = objects.filter((item) => item.isEnabled);
  const disabled = objects.filter((item) => !item.isEnabled);
  const existingNames = new Set(objects.map((item) => String(item.objectName)));
  const addable = presetObjects.map((group) => ({ ...group, names: group.names.filter((name) => !existingNames.has(name)) })).filter((group) => group.names.length);
  const endpoint = profileUrl(projectId, versionId, 'product-objects');

  function table(rows: any[], title: string) {
    return <Card title={title} note="状态、原因与操作共用 product-types 语义。">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, fontSize: 12 }}>
          <thead><tr>{['对象', '对象口径', '属性', '单位', '数据状态', '操作'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
          <tbody>{rows.length ? rows.map((item) => <tr key={item.objectId}>
            <td style={{ ...cell, fontWeight: 900 }}>{item.objectName}<div className="meta">{item.objectCode}</div></td>
            <td style={cell}><Badge tone={objectTypeTone(item.objectType)}>{objectTypeLabel(item.objectType)}</Badge><div className="meta">{item.objectCategory}</div></td>
            <td style={cell}><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {item.isSaleable ? <Badge tone="blue">可售</Badge> : <Badge>不可售</Badge>}
              {item.isIncomeObject ? <Badge tone="green">收入对象</Badge> : null}
              {item.isCostObject ? <Badge tone="green">成本对象</Badge> : null}
              {item.isTaxObject ? <Badge tone="orange">税务对象</Badge> : null}
              {item.isProfitObject ? <Badge tone="blue">利润对象</Badge> : null}
            </div></td>
            <td style={cell}>
              {item.quantityUnit || item.pricingUnit ? <><b>{item.quantityUnit || '-'}</b><div className="meta">{item.pricingUnit || '未设置计价单位'}</div></> : <span className="meta">按对象口径维护</span>}
            </td>
            <td style={cell}>
              <Badge tone={item.isEnabled ? 'green' : 'red'}>{item.status}</Badge>
              {item.blockedReason ? <div className="meta" style={{ color: '#c92a2a' }}>不可停用<Tip text={item.blockedReason} /></div> : null}
              {item.warningMessage ? <div className="meta">{item.warningMessage}</div> : null}
            </td>
            <td style={cell}>
              <ProfileObjectAction endpoint={endpoint} objectCode={item.objectCode} objectName={item.objectName} objectType={item.objectType} objectCategory={item.objectCategory} isEnabled={!item.isEnabled} locked={locked} disabled={item.isEnabled ? !item.canDisable : !item.canRestore} label={item.isEnabled ? '停用' : '恢复'} />
            </td>
          </tr>) : <tr><td colSpan={6} style={{ padding: 14, color: '#667085' }}>暂无数据。</td></tr>}</tbody>
        </table>
      </div>
    </Card>;
  }

  return <SectionShell>
    {locked ? <StatusNotice title="当前版本已锁定" tone="danger">业态新增、停用、恢复均不可操作。</StatusNotice> : null}
    <div className="summary-strip">
      <Stat label="启用对象" value={enabled.length} />
      <Stat label="已停用对象" value={disabled.length} />
      <Stat label="不可直接停用" value={enabled.filter((item) => item.canDisable === false).length} />
      <Stat label="兼容对象" value={objects.filter((item) => item.objectType !== 'product_type').length} />
    </div>
    <Card title="可新增业态" note="新增普通产品业态会调用 profile productObjects 分区保存，并复用后端 product-types 新增逻辑。" action={locked ? <button className="btn" disabled>完整维护页</button> : <Link className="btn" href={`/projects/${projectId}/product-maintenance`}>完整维护页</Link>}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {addable.length ? addable.flatMap((group) => group.names.map((name) => <ProfileObjectAction key={name} endpoint={endpoint} objectCode={name} objectName={name} objectType="product_type" objectCategory={group.category} isEnabled locked={locked} label={`新增 ${name}`} />)) : <span className="meta">暂无可新增预设业态。</span>}
      </div>
    </Card>
    {table(enabled, '启用业态 / 对象')}
    {table(disabled, '已停用业态 / 对象')}
  </SectionShell>;
}

async function ConstructionStandardsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileConstructionStandards(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const data: any = resultData(result);
  return <ProfileSectionForm formId="profile-construction-standards-form" endpoint={profileUrl(projectId, versionId, 'construction-standards')} locked={locked} successMessage="建造标准已保存。">
    <SectionShell>
      <Card title="基础建造标准" note="只保留影响含量、单价和工程量推算的轻量字段。">
        <FieldGrid locked={locked} fields={[
          ['deliveryStandard', '交付标准', 'text', data.deliveryStandard],
          ['facadeStandard', '外立面标准', 'text', data.facadeStandard],
          ['doorWindowStandard', '门窗标准', 'text', data.doorWindowStandard],
          ['landscapeStandard', '景观标准', 'text', data.landscapeStandard],
          ['garageStandard', '车库标准', 'text', data.garageStandard],
          ['intelligentStandard', '智能化标准', 'text', data.intelligentStandard]
        ]} />
      </Card>
      <Card title="专项配置" note="启用后显示对应基础字段；本页不承载完整专项配置库。">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldGrid locked={locked} fields={[
            ['isPrefabEnabled', '启用装配式', 'checkbox', data.isPrefabEnabled],
            ['prefabArea', '装配式面积', 'number', data.prefabArea],
            ['isFineDecorationEnabled', '启用精装修', 'checkbox', data.isFineDecorationEnabled],
            ['fineDecorationArea', '精装修面积', 'number', data.fineDecorationArea],
            ['isHeatingEnabled', '启用采暖', 'checkbox', data.isHeatingEnabled],
            ['heatingArea', '采暖面积', 'number', data.heatingArea],
            ['isCivilDefenseEnabled', '启用人防', 'checkbox', data.isCivilDefenseEnabled],
            ['civilDefenseArea', '人防面积', 'number', data.civilDefenseArea],
            ['civilDefenseParkingCount', '人防车位数量', 'number', data.civilDefenseParkingCount],
            ['isChargingPileEnabled', '启用充电桩', 'checkbox', data.isChargingPileEnabled],
            ['chargingPileCount', '充电桩数量', 'number', data.chargingPileCount],
            ['chargingPileRatio', '充电桩比例', 'number', data.chargingPileRatio],
            ['isDemoAreaEnabled', '启用示范区', 'checkbox', data.isDemoAreaEnabled],
            ['demoArea', '示范区面积', 'number', data.demoArea],
            ['salesOfficeArea', '售楼处面积', 'number', data.salesOfficeArea],
            ['showFlatArea', '样板间面积', 'number', data.showFlatArea]
          ]} />
        </div>
      </Card>
    </SectionShell>
  </ProfileSectionForm>;
}

async function ProjectMetricsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileProjectMetrics(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const data: any = resultData(result);
  return <ProfileSectionForm formId="profile-project-metrics-form" endpoint={profileUrl(projectId, versionId, 'project-metrics')} locked={locked} successMessage="项目指标已保存。">
    <SectionShell>
      {data.warnings?.length ? <StatusNotice title="指标复核提醒" tone="warning">{data.warnings.join('；')}</StatusNotice> : null}
      <Card title="土地与面积指标">
        <FieldGrid locked={locked} fields={[
          ['land.landArea', '地块面积', 'number', data.land?.landArea],
          ['buildingArea.totalBuildingArea', '总建筑面积', 'number', data.buildingArea?.totalBuildingArea],
          ['buildingArea.plotRatioBuildingArea', '计容建筑面积', 'number', data.buildingArea?.plotRatioBuildingArea],
          ['buildingArea.aboveGroundBuildingArea', '地上建筑面积', 'number', data.buildingArea?.aboveGroundBuildingArea],
          ['buildingArea.undergroundBuildingArea', '地下建筑面积', 'number', data.buildingArea?.undergroundBuildingArea],
          ['buildingArea.saleableArea', '可售面积', 'number', data.buildingArea?.saleableArea],
          ['buildingArea.nonSaleableArea', '不可售面积', 'number', data.buildingArea?.nonSaleableArea],
          ['buildingArea.buildingBaseArea', '建筑基底面积', 'number', data.buildingArea?.buildingBaseArea]
        ]} />
      </Card>
      <Card title="楼栋规模指标">
        <FieldGrid locked={locked} fields={[
          ['buildings.buildingCount', '楼栋数', 'number', data.buildings?.buildingCount],
          ['buildings.unitCount', '单元数', 'number', data.buildings?.unitCount],
          ['buildings.householdCount', '户数', 'number', data.buildings?.householdCount],
          ['buildings.standardFloorArea', '标准层面积', 'number', data.buildings?.standardFloorArea],
          ['buildings.aboveGroundFloorCount', '地上层数', 'number', data.buildings?.aboveGroundFloorCount],
          ['buildings.undergroundFloorCount', '地下层数', 'number', data.buildings?.undergroundFloorCount]
        ]} />
      </Card>
      <Card title="地下室指标" note={data.basement?.helpText || '地下室层高目前仅承接 B1、B2 与其他层平均层高，仍保留部分完成语义。'}>
        <FieldGrid locked={locked} fields={[
          ['basement.basementTotalArea', '地下总建筑面积', 'number', data.basement?.basementTotalArea],
          ['basement.mainBuildingBasementArea', '主楼地下室面积', 'number', data.basement?.mainBuildingBasementArea],
          ['basement.nonMainBuildingBasementArea', '非主楼地下室面积', 'number', data.basement?.nonMainBuildingBasementArea],
          ['basement.undergroundGarageArea', '地下车库面积', 'number', data.basement?.undergroundGarageArea],
          ['basement.civilDefenseArea', '人防面积', 'number', data.basement?.civilDefenseArea],
          ['basement.nonCivilDefenseArea', '非人防面积', 'number', data.basement?.nonCivilDefenseArea],
          ['basement.basementFloorCount', '地下层数', 'number', data.basement?.basementFloorCount],
          ['basement.basementB1Height', 'B1 层高', 'number', data.basement?.basementB1Height],
          ['basement.basementB2Height', 'B2 层高', 'number', data.basement?.basementB2Height],
          ['basement.basementOtherAvgHeight', '其他层平均层高', 'number', data.basement?.basementOtherAvgHeight]
        ]} />
      </Card>
      <Card title="车位与景观道路" note={data.parking?.remark || '车位收入按个数和单个车位价格维护，不按面积单价测算。'}>
        <FieldGrid locked={locked} fields={[
          ['parking.undergroundParkingCount', '地下车位数', 'number', data.parking?.undergroundParkingCount],
          ['parking.civilDefenseParkingCount', '人防车位数', 'number', data.parking?.civilDefenseParkingCount],
          ['parking.propertyRightParkingCount', '产权车位数', 'number', data.parking?.propertyRightParkingCount],
          ['parking.useRightParkingCount', '使用权车位数', 'number', data.parking?.useRightParkingCount],
          ['parking.chargingPileParkingCount', '充电桩车位数', 'number', data.parking?.chargingPileParkingCount],
          ['parking.parkingUnitPrice', '车位单价', 'number', data.parking?.parkingUnitPrice],
          ['landscapeRoad.landscapeArea', '景观面积', 'number', data.landscapeRoad?.landscapeArea],
          ['landscapeRoad.hardLandscapeArea', '硬景面积', 'number', data.landscapeRoad?.hardLandscapeArea],
          ['landscapeRoad.softLandscapeArea', '软景面积', 'number', data.landscapeRoad?.softLandscapeArea],
          ['landscapeRoad.vehicleRoadArea', '车行道路面积', 'number', data.landscapeRoad?.vehicleRoadArea],
          ['landscapeRoad.fireRoadAreaIncluded', '消防道路面积', 'number', data.landscapeRoad?.fireRoadAreaIncluded],
          ['landscapeRoad.boundaryLength', '周界长度', 'number', data.landscapeRoad?.boundaryLength]
        ]} />
      </Card>
      <Card title="营销展示对象" note={data.marketingDisplay?.remark || '样板间、售楼处、示范区只作为展示对象或专项成本口径，不作为普通收入业态。'}>
        <FieldGrid locked={locked} fields={[
          ['marketingDisplay.isSampleRoomEnabled', '启用样板间', 'checkbox', data.marketingDisplay?.isSampleRoomEnabled],
          ['marketingDisplay.sampleRoomCount', '样板间数量', 'number', data.marketingDisplay?.sampleRoomCount],
          ['marketingDisplay.sampleRoomArea', '样板间面积', 'number', data.marketingDisplay?.sampleRoomArea],
          ['marketingDisplay.sampleRoomHostType', '样板间所在载体', 'text', data.marketingDisplay?.sampleRoomHostType],
          ['marketingDisplay.sampleRoomHostProductType', '承载产品业态', 'text', data.marketingDisplay?.sampleRoomHostProductType],
          ['marketingDisplay.isSampleRoomFutureSaleable', '未来可售房源', 'checkbox', data.marketingDisplay?.isSampleRoomFutureSaleable],
          ['marketingDisplay.isSampleRoomRestoreRequired', '需拆除恢复', 'checkbox', data.marketingDisplay?.isSampleRoomRestoreRequired],
          ['marketingDisplay.sampleRoomDecorationStandard', '样板间装修标准', 'text', data.marketingDisplay?.sampleRoomDecorationStandard],
          ['marketingDisplay.sampleRoomCostBearingType', '样板间成本承担', 'text', data.marketingDisplay?.sampleRoomCostBearingType],
          ['marketingDisplay.sampleRoomCostTransferReserved', '预留成本转移', 'checkbox', data.marketingDisplay?.sampleRoomCostTransferReserved],
          ['marketingDisplay.isSalesOfficeEnabled', '启用售楼处', 'checkbox', data.marketingDisplay?.isSalesOfficeEnabled],
          ['marketingDisplay.salesOfficeType', '售楼处类型', 'text', data.marketingDisplay?.salesOfficeType],
          ['marketingDisplay.salesOfficeArea', '售楼处面积', 'number', data.marketingDisplay?.salesOfficeArea],
          ['marketingDisplay.salesOfficeFutureUse', '售楼处后续用途', 'text', data.marketingDisplay?.salesOfficeFutureUse],
          ['marketingDisplay.salesOfficeCostBearingType', '售楼处成本承担', 'text', data.marketingDisplay?.salesOfficeCostBearingType],
          ['marketingDisplay.salesOfficeTransferReserved', '售楼处转移预留', 'checkbox', data.marketingDisplay?.salesOfficeTransferReserved],
          ['marketingDisplay.isDemoAreaEnabled', '启用示范区', 'checkbox', data.marketingDisplay?.isDemoAreaEnabled],
          ['marketingDisplay.demoArea', '示范区面积', 'number', data.marketingDisplay?.demoArea],
          ['marketingDisplay.demoLandscapeArea', '示范区景观面积', 'number', data.marketingDisplay?.demoLandscapeArea],
          ['marketingDisplay.demoRoadArea', '示范区道路面积', 'number', data.marketingDisplay?.demoRoadArea],
          ['marketingDisplay.demoPackagingArea', '示范区包装面积', 'number', data.marketingDisplay?.demoPackagingArea],
          ['marketingDisplay.demoViewingPathArea', '看房通道面积', 'number', data.marketingDisplay?.demoViewingPathArea],
          ['marketingDisplay.demoCostBearingType', '示范区成本承担', 'text', data.marketingDisplay?.demoCostBearingType],
          ['marketingDisplay.demoTransferReserved', '示范区转移预留', 'checkbox', data.marketingDisplay?.demoTransferReserved]
        ]} />
      </Card>
    </SectionShell>
  </ProfileSectionForm>;
}

async function QuantityIndicatorsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileQuantityIndicators(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const data: any = resultData(result);
  const version = await prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, include: { products: true } });
  const activeProductNames = new Set((version?.products || []).filter((item) => item.isActive).map((item) => item.name));
  const indicators = (data.indicators || []).filter((item: any) => !item.relatedProductType || activeProductNames.size === 0 || activeProductNames.has(item.relatedProductType) || item.relatedProductType === '全项目');
  return <SectionShell>
    {data.warnings?.length ? <StatusNotice title="工程量复核提醒" tone="warning">{data.warnings.join('；')}</StatusNotice> : null}
    {data.helpText ? <StatusNotice title="工程量口径说明" tone="success">{data.helpText}</StatusNotice> : null}
    <div className="summary-strip">
      <Stat label="指标总数" value={data.summary?.totalIndicators || 0} />
      <Stat label="当前展示" value={indicators.length} />
      <Stat label="手算覆盖" value={data.summary?.overriddenCount || 0} />
      <Stat label="锁定行数" value={data.summary?.lockedCount || 0} />
    </div>
    <Card title="工程量指标分组摘要" note="本页读取 profile quantityIndicators 分区；逐行手算继续使用已验证的覆盖与恢复接口。">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {['场地景观道路围墙', '外立面门窗', '地下室', '户型精装', '专项基础指标'].map((label) => <div key={label} style={{ border: '1px solid #e6eef7', borderRadius: 8, padding: 10, background: '#fbfdff' }}><b>{label}</b><div className="meta">按成本明细取数依据归集展示。</div></div>)}
      </div>
    </Card>
    <Card title="成本明细工程量手算" note="系统值来自基础指标和含量系数；生效值以 finalQuantity 为准。锁定版本下禁止修改。">
      {locked ? <StatusNotice title="当前版本已锁定" tone="danger">工程量手算覆盖与恢复系统值不可操作。</StatusNotice> : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1360, fontSize: 12 }}>
          <thead><tr>{['指标', '适用对象', '系统值', '手算值', '生效值', '单位', '来源', '状态', '操作'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
          <tbody>{indicators.length ? indicators.map((item: any) => <tr key={item.indicatorId} style={item.isQuantityOverridden ? { background: '#fffaf0' } : undefined}>
            <td style={{ ...cell, fontWeight: 800 }}>{item.indicatorCode} {item.indicatorName}<div className="meta">{item.baseIndicatorName || '未配置取数依据'}</div></td>
            <td style={cell}>{item.relatedProductType || '全项目'}</td>
            <td style={cell}>{fmt(item.calculatedQuantity)} {item.quantityUnit || ''}<div className="meta">取数 {fmt(item.baseIndicatorValue)} × 系数 {fmt(item.contentRatio || 1)}</div></td>
            <td style={cell}>{item.manualQuantity === null ? <span className="meta">空值，未覆盖</span> : `${fmt(item.manualQuantity)} ${item.quantityUnit || ''}`}</td>
            <td style={{ ...cell, fontWeight: 900 }}>{fmt(item.finalQuantity)} {item.quantityUnit || ''}</td>
            <td style={cell}><b>{item.quantityUnit || '-'}</b><div className="meta">{item.pricingUnit || '计价单位随成本明细单价口径'}</div></td>
            <td style={cell}>{item.quantitySource || item.indicatorSource}</td>
            <td style={cell}>{item.isQuantityOverridden ? <Badge tone="orange">已手算覆盖</Badge> : <Badge tone="green">使用系统值</Badge>}</td>
            <td style={{ ...cell, minWidth: 280 }}>
              <QuantityOverrideActions projectId={projectId} versionId={versionId} costLineId={item.indicatorId} currentQuantity={valueText(item.finalQuantity)} hasOverride={item.isQuantityOverridden} locked={locked} />
            </td>
          </tr>) : <tr><td colSpan={9} style={{ padding: 14, color: '#667085' }}>暂无工程量指标。请先生成或录入目标成本明细。</td></tr>}</tbody>
        </table>
      </div>
    </Card>
  </SectionShell>;
}

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }; searchParams?: { section?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({ where: activeVersionWhere(project), orderBy: activeVersionOrder(project) });
  if (!version) return <main className="page">暂无测算版本</main>;

  const current = activeSection(searchParams?.section);
  const section = sections.find((item) => item.key === current)!;
  const locked = isVersionLocked(version);
  const overview = await getProfileOverview(project.id, version.id);
  const overviewData: any = overview.body.success ? resultData(overview) : {};

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <TooltipStyles />
    <div className="page-header" style={{ alignItems: 'flex-start' }}>
      <div>
        <p className="eyebrow">项目概况五分区</p>
        <h1 className="title">{section.title}</h1>
        <p className="subtitle">{section.note}</p>
      </div>
      <HeaderActions projectId={project.id} versionId={version.id} current={current} locked={locked} />
    </div>
    <TabNav projectId={project.id} current={current} />
    <VersionContextBar projectName={project.name} versionName={version.name} versionStatus={version.status} editable={!locked} extra={[['当前分区', section.label], ['完整性缺口', overviewData.missingRequiredSections?.length || 0]]} />
    {locked ? <StatusNotice title="当前版本已锁定" tone="danger">五个分区均进入只读状态；涉及保存、启停、恢复、手算覆盖的操作不可执行。</StatusNotice> : null}
    {current === 'overview' ? await OverviewSection({ projectId: project.id, versionId: version.id, locked }) : null}
    {current === 'product-objects' ? await ProductObjectsSection({ projectId: project.id, versionId: version.id, locked }) : null}
    {current === 'construction-standards' ? await ConstructionStandardsSection({ projectId: project.id, versionId: version.id, locked }) : null}
    {current === 'project-metrics' ? await ProjectMetricsSection({ projectId: project.id, versionId: version.id, locked }) : null}
    {current === 'quantity-indicators' ? await QuantityIndicatorsSection({ projectId: project.id, versionId: version.id, locked }) : null}
  </div></main>;
}
