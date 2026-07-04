import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState, StatusNotice, VersionContextBar } from '@/components/commercial-status';
import { MetricCenterSyncAction, ProfileObjectAction, ProfileSectionForm } from '@/components/profile-section-form';
import { QuantityOverrideActions } from '@/components/quantity-override-actions';
import {
  getProfile,
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
type MetricField = readonly [string, string, 'text' | 'number' | 'checkbox', string];

const sections: Array<{ key: SectionKey; label: string; title: string; note: string }> = [
  { key: 'overview', label: '项目总览', title: '项目总览', note: '查看项目、版本、完整性和关键指标摘要。' },
  { key: 'product-objects', label: '业态产品与对象', title: '业态产品与对象', note: '维护启用业态、停用业态和兼容对象状态。' },
  { key: 'construction-standards', label: '建造标准', title: '建造标准', note: '维护交付标准、专项开关和关键配置字段。' },
  { key: 'project-metrics', label: '项目指标', title: '项目指标', note: '维护面积、楼栋、地下室、车位、景观道路等基础指标。' },
  { key: 'quantity-indicators', label: '工程量指标', title: '工程量指标', note: '查看系统值、手算值、生效值，并保留逐行手算覆盖能力。' }
];

const sectionFormIds: Partial<Record<SectionKey, string>> = {
  overview: 'profile-overview-form',
  'construction-standards': 'profile-construction-standards-form',
  'project-metrics': 'profile-project-metrics-form'
};

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

const standardCategories = [
  ['structure', '结构'],
  ['basement', '地下室'],
  ['civil_defense', '人防'],
  ['prefabricated', '装配式'],
  ['facade', '外立面'],
  ['window_door', '门窗'],
  ['indoor_decoration', '户内精装修'],
  ['public_area_decoration', '公区装修'],
  ['equipment', '设备'],
  ['garage', '地库'],
  ['landscape', '景观'],
  ['intelligent', '智能化'],
  ['demo_sales_sample', '示范区 / 售楼处 / 样板间'],
  ['ancient_building', '古建专项']
] as const;

const levelLabel: Record<string, string> = {
  project_level: '项目级',
  object_level: '对象级',
  detail_subject_level: '明细科目级',
  project: '项目级',
  object: '对象级',
  detail: '明细科目级'
};

const quantityModeLabel: Record<string, string> = {
  auto_calculated: '系统推算',
  manual_entered: '手算输入',
  excel_imported: 'Excel 导入',
  drawing_measured: '图纸算量',
  locked_confirmed: '锁定确认'
};

const priceSourceLabel: Record<string, string> = {
  system_default: '系统默认',
  region_price_library: '地区价格库',
  user_project_manual: '项目手工',
  historical_project: '历史项目',
  excel_imported: 'Excel 导入',
  contract_price: '合同价',
  market_inquiry: '市场询价',
  supplier_quote: '供应商报价'
};

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
  if (value === null || value === undefined || value === '') return '未维护';
  return typeof value === 'number' ? `${fmt(value)}${suffix}` : `${value}${suffix}`;
}

function dateText(value: unknown) {
  if (!value) return '未返回';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false });
}

function booleanText(value: unknown) {
  return value ? '是' : '否';
}

function modeText(value?: string | null) {
  return quantityModeLabel[String(value || '')] || value || '未返回';
}

function priceSourceText(value?: string | null) {
  return priceSourceLabel[String(value || '')] || value || '未返回';
}

function overrideNotice(item: any) {
  if (item.quantityCalcMode === 'manual_entered') return '当前工程量已手算覆盖，后续含量变化不会自动覆盖 finalQuantity';
  if (item.quantityCalcMode === 'locked_confirmed' || item.isQuantityLocked) return '当前工程量已锁定，不允许修改';
  if (item.quantityCalcMode === 'auto_calculated') return '当前工程量由基础指标 × 含量自动推算';
  return item.overrideReason || item.quantitySourceRemark || '按接口返回口径展示';
}

function standardRow(input: any, fallbackCategory: string, fallbackName: string) {
  return {
    standardLevel: input.standardLevel || 'project_level',
    standardCategory: input.standardCategory || fallbackCategory,
    standardCode: input.standardCode || fallbackCategory,
    standardName: input.standardName || fallbackName,
    costObjectName: input.costObjectName || input.costObjectId || '项目整体',
    costObjectId: input.costObjectId || null,
    detailSubjectName: input.detailSubjectName || input.detailSubjectId || '未绑定明细科目',
    detailSubjectId: input.detailSubjectId || null,
    region: input.region || '全项目',
    difficultyLevel: input.difficultyLevel || '未设置',
    difficultyCoefficient: input.difficultyCoefficient ?? '未设置',
    materialGrade: input.materialGrade || input.standardName || input.value || '未设置',
    equipmentGrade: input.equipmentGrade || '未设置',
    affectsSubjectEnabled: input.affectsSubjectEnabled ?? input.isEnabled ?? false,
    affectsContentRule: input.affectsContentRule ?? true,
    affectsUnitPrice: input.affectsUnitPrice ?? true,
    affectsDifficulty: input.affectsDifficulty ?? false,
    affectsCostPool: input.affectsCostPool ?? false,
    isEnabled: input.isEnabled ?? Boolean(input.value || input.standardName),
    recalculationRequired: input.recalculationRequired ?? false,
    remark: input.remark || 'V1 仅展示后端已支持字段，不做复杂标准库管理。'
  };
}

function objectTypeLabel(type?: string | null) {
  const map: Record<string, string> = {
    saleable_object: '可售对象 / 经营对象',
    cost_object: '成本对象',
    product_type: '普通产品业态',
    basement_cost_object: '地下室成本对象',
    parking_income_object: '车位收入 / 利润对象',
    supporting_cost_object: '配套 / 不可售成本对象',
    marketing_display_object: '营销展示 / 专项成本对象',
    construction_standard_object: '建造标准 / 专项配置对象',
    special_config_object: '建造标准 / 专项配置对象',
    tax_object: '税务对象'
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
  const formId = versionId ? sectionFormIds[current] : undefined;
  return <div className="actions" style={{ marginTop: 0 }}>
    {formId ? <button type="submit" form={formId} className="btn btn-primary" disabled={locked} title={locked ? '当前版本已锁定，本分区不可保存。' : undefined}>保存本分区</button> : null}
    {current === 'product-objects' ? <button type="button" className="btn" disabled title="本分区暂不支持整区保存，请使用每行的新增、停用或恢复按钮。">按单项保存</button> : null}
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

function MetricFieldGrid({ section, fields, data, locked }: { section: string; fields: MetricField[]; data: any; locked: boolean }) {
  const groups = [...new Set(fields.map((field) => field[3]))];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {groups.map((group) => <div key={group}>
      <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>{group}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {fields.filter((field) => field[3] === group).map(([name, label, type]) => type === 'checkbox'
          ? <Checkbox key={name} name={`${section}.${name}`} label={label} checked={Boolean(data?.[name])} locked={locked} />
          : <Input key={name} name={`${section}.${name}`} label={`${label}（${metricUnit(name)}）`} value={data?.[name]} type={type} locked={locked} note={data?.[name] === null || data?.[name] === undefined || data?.[name] === '' ? '未维护' : undefined} />)}
      </div>
    </div>)}
  </div>;
}

function metricUnit(field: string) {
  if (field === 'plotRatio') return '无';
  if (field.toLowerCase().includes('ratio') || field.includes('Rate')) return '%';
  if (field.toLowerCase().includes('count') || field.includes('Quantity')) return '个';
  if (field.toLowerCase().includes('length')) return 'm';
  if (field.toLowerCase().includes('price')) return '按接口';
  if (field.toLowerCase().includes('floor')) return field.toLowerCase().includes('height') ? 'm' : '层';
  if (field.toLowerCase().includes('height')) return 'm';
  if (field.toLowerCase().includes('area')) return '㎡';
  return '按接口';
}

function metricCellValue(value: unknown, field: string) {
  if (typeof value === 'boolean') return value ? '是' : '否';
  const unit = metricUnit(field);
  return display(value, unit === '按接口' || unit === '%' ? '' : unit);
}

function productObjectDisplayKind(row: any) {
  const name = String(row?.objectName || '');
  const type = String(row?.objectType || '');
  const remark = String(row?.remark || '');
  const text = `${name} ${type} ${remark}`;
  if (/一层|二层|首层|底商|裙楼|沿街/.test(text)) return '楼层商业对象';
  if (/独立商业|集中商业|商业街|盒子商业/.test(text)) return '独立商业对象';
  if (/车位|parking/.test(text)) return '车位对象';
  if (/地下|地库|basement/.test(text)) return '地下室对象';
  if (/配套|物业|社区|幼儿园|会所/.test(text)) return '配套对象';
  return '产品对象';
}

function productObjectDedupeKey(row: any) {
  const id = String(row?.objectId || '').trim();
  if (id) return `id:${id}`;
  return `name:${String(row?.objectName || '').trim()}|type:${String(row?.objectType || '').trim()}`;
}

function hasMetricValue(value: unknown) {
  return value !== null && value !== undefined && value !== '' && value !== false;
}

function mergeProductMetricRows(rows: any[]) {
  const merged = new Map<string, any>();
  for (const row of rows) {
    const key = productObjectDedupeKey(row);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row, displayKind: productObjectDisplayKind(row) });
      continue;
    }
    for (const [field, value] of Object.entries(row || {})) {
      if (!hasMetricValue(existing[field]) && hasMetricValue(value)) existing[field] = value;
    }
  }
  return [...merged.values()];
}

function MetricInputCell({ name, value, type, locked }: { name: string; value: unknown; type: 'text' | 'number' | 'checkbox'; locked: boolean }) {
  if (type === 'checkbox') return <input name={name} type="checkbox" defaultChecked={Boolean(value)} disabled={locked} />;
  return <input name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={valueText(value)} disabled={locked} style={{ ...(locked ? readonlyStyle : inputStyle), width: type === 'number' ? 110 : 150 }} />;
}

function MetricTable({ section, rows, fields, locked, emptyTitle, emptyChildren, blankRows = 0, rowOffset = 0, leading }: { section: string; rows: any[]; fields: Array<readonly [string, string, 'text' | 'number' | 'checkbox']>; locked: boolean; emptyTitle: string; emptyChildren: ReactNode; blankRows?: number; rowOffset?: number; leading?: (row: any) => ReactNode }) {
  const displayRows = rows.length ? rows : Array.from({ length: blankRows }, () => ({}));
  if (!displayRows.length) return <EmptyState title={emptyTitle}>{emptyChildren}</EmptyState>;
  return <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(1000, fields.length * 150), fontSize: 12 }}>
      <thead><tr>{fields.map(([, label]) => <th key={label} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{label}</th>)}</tr></thead>
      <tbody>{displayRows.map((row, rowIndex) => <tr key={`${section}-${rowIndex}`}>
        {fields.map(([name, label, type], fieldIndex) => <td key={name} style={{ ...cell, verticalAlign: 'top' }}>
          {fieldIndex === 0 && leading ? leading(row) : null}
          <MetricInputCell name={`${section}.${rowOffset + rowIndex}.${name}`} value={row?.[name]} type={type} locked={locked} />
          <div className="meta">{row?.[name] === null || row?.[name] === undefined || row?.[name] === '' ? '未维护' : metricCellValue(row?.[name], name)}</div>
          {name === 'saleableArea' && (row?.[name] === null || row?.[name] === undefined || row?.[name] === '') ? <div className="meta" style={{ color: '#d9480f', whiteSpace: 'normal' }}>会影响收入测算和可售单方成本。</div> : null}
          {fieldIndex === 0 && label.includes('object') ? <div className="meta" style={{ whiteSpace: 'normal' }}>停用对象默认不参与汇总。</div> : null}
        </td>)}
      </tr>)}</tbody>
    </table>
  </div>;
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
  if (!result.body.success) return <StatusNotice title="profile 聚合接口读取失败" tone="danger">{result.body.error.message}<div style={{ marginTop: 10 }}><Link href={`/projects/${projectId}/overview?section=overview`} className="btn">刷新重试</Link></div></StatusNotice>;
  const data: any = resultData(result);
  const metrics = await getProfileProjectMetrics(projectId, versionId);
  const m: any = metrics.body.success ? resultData(metrics) : {};
  const completeness = data.dataCompleteness || {};
  const sectionStatus = [
    ['overview', '总览'],
    ['productObjects', '业态产品与对象'],
    ['constructionStandards', '建造标准'],
    ['projectMetrics', '项目指标'],
    ['quantityIndicators', '工程量指标']
  ] as const;
  return <ProfileSectionForm formId="profile-overview-form" endpoint={profileUrl(projectId, versionId, 'overview')} locked={locked} successMessage="项目总览已保存。">
    <SectionShell>
      <StatusNotice title="profile 聚合接口加载状态" tone="success">已读取当前项目、当前版本、版本状态、数据完整性与五页入口状态。最近更新时间：{dateText(data.updatedAt)}。<div style={{ marginTop: 10 }}><Link href={`/projects/${projectId}/overview?section=overview`} className="btn">刷新本页</Link></div></StatusNotice>
      {locked ? <StatusNotice title="当前版本已锁定" tone="danger">当前版本已锁定，概况、对象、指标、建造标准和工程量相关配置不可修改。</StatusNotice> : null}
      <div className="summary-strip">
        <Stat label="项目名称" value={data.projectName || '未命名'} />
        <Stat label="版本状态" value={data.versionStatus || '未设置'} />
        <Stat label="当前版本" value={data.versionName || '暂无版本'} note={data.versionStatus || '未设置'} />
        <Stat label="是否锁定" value={data.isLocked ? '是' : '否'} />
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
          {Object.entries(completeness).map(([key, value]) => <Badge key={key} tone={value ? 'green' : 'orange'}>{key}: {value ? '已录入' : '待补充'}</Badge>)}
        </div>
        {data.warningMessages?.length ? <p className="meta" style={{ marginBottom: 0 }}>{data.warningMessages.join('；')}</p> : null}
      </Card>
      <Card title="五页入口状态" note="保持五个 Tab 结构；每个入口只展示该分区是否已具备接口数据。">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {sectionStatus.map(([key, label]) => <Link key={key} href={`/projects/${projectId}/overview?section=${key === 'overview' ? 'overview' : key.replace(/[A-Z]/g, (s) => `-${s.toLowerCase()}`)}`} style={{ border: '1px solid #e6eef7', borderRadius: 8, padding: 10, background: '#fbfdff', textDecoration: 'none', color: 'inherit' }}>
            <b>{label}</b>
            <div style={{ marginTop: 6 }}><Badge tone={completeness[key] ? 'green' : 'orange'}>{completeness[key] ? '已录入' : '待补充'}</Badge></div>
          </Link>)}
        </div>
      </Card>
      {metrics.body.success ? null : <StatusNotice title="项目指标接口读取异常" tone="warning">总览摘要仍可查看，项目指标分区返回：{metrics.body.error?.message || '未知错误'}。</StatusNotice>}
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

  function objectFlags(item: any) {
    return [
      ['isSaleableObject', '可售'],
      ['isOperatingObject', '经营'],
      ['isIncomeObject', '收入'],
      ['isCostObject', '成本'],
      ['isAllocationObject', '分摊'],
      ['isProfitObject', '利润'],
      ['isTaxObject', '税务'],
      ['isParkingObject', '车位'],
      ['isBasementObject', '地下室'],
      ['isSupportingObject', '配套'],
      ['isMarketingDisplayObject', '营销展示']
    ].map(([key, label]) => <Badge key={key} tone={item[key] ? 'green' : 'neutral'}>{label}: {booleanText(item[key])}</Badge>);
  }

  function table(rows: any[], title: string, collapsed = false) {
    const content = <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1420, fontSize: 12 }}>
        <thead><tr>{['对象', '对象分类', '启用与业务状态', '对象角色', '成本承担 / 单位', '操作能力', '提示', '操作'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map((item) => <tr key={item.objectId}>
          <td style={{ ...cell, fontWeight: 900 }}>{item.objectName}<div className="meta">{item.objectCode || item.objectId}</div><div className="meta">objectType: {item.objectType || '未返回'}</div></td>
          <td style={cell}><Badge tone={objectTypeTone(item.objectType)}>{objectTypeLabel(item.objectType)}</Badge><div className="meta">{item.objectCategory || '未分类'}</div></td>
          <td style={cell}>
            <Badge tone={item.isEnabled ? 'green' : 'red'}>{item.objectStatus || item.status}</Badge>
            <div className="meta">isEnabled: {booleanText(item.isEnabled)}</div>
            <div className="meta">objectStatus: {item.objectStatus || item.status || '未返回'}</div>
          </td>
          <td style={cell}><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 420 }}>{objectFlags(item)}</div></td>
          <td style={cell}>
            <b>{item.displayCostBearingType || '未返回'}</b>
            <div className="meta">工程量单位：{item.quantityUnit || '按后端返回'}</div>
            <div className="meta">计价单位：{item.pricingUnit || '按后端返回'}</div>
            {item.isParkingObject ? <div className="meta">车位收入按数量 x 单价，不按面积 x 元/㎡。</div> : null}
            {item.isMarketingDisplayObject ? <div className="meta">V1 默认进入开发成本口径，不自动进入销售费用。</div> : null}
          </td>
          <td style={cell}>
            <div>canEnable: {booleanText(item.canEnable)}</div>
            <div>canDisable: {booleanText(item.canDisable)}</div>
            <div>canRestore: {booleanText(item.canRestore)}</div>
            {item.blockedReason ? <div className="meta" style={{ color: '#c92a2a' }}>不可直接停用<Tip text={item.blockedReason} /></div> : null}
          </td>
          <td style={{ ...cell, minWidth: 260 }}>
            {item.warningMessage ? <div>{item.warningMessage}</div> : <span className="meta">暂无预警。</span>}
            {item.isBasementObject ? <div className="meta">主楼地下室/非主楼地下室为空间归属口径；地下车库面积为功能使用口径。</div> : null}
          </td>
          <td style={cell}>
            <ProfileObjectAction endpoint={endpoint} objectCode={item.objectCode} objectName={item.objectName} objectType={item.objectType} objectCategory={item.objectCategory} isEnabled={!item.isEnabled} locked={locked} disabled={item.isEnabled ? !item.canDisable : !item.canRestore} label={item.isEnabled ? '停用' : '恢复'} />
          </td>
        </tr>) : <tr><td colSpan={8} style={{ padding: 14, color: '#667085' }}>暂无对象数据。请先在完整维护页维护对象，或等待后端返回系统默认对象。</td></tr>}</tbody>
      </table>
    </div>;
    if (collapsed) return <details style={{ border: '1px solid #d9e2ec', borderRadius: 8, background: '#fff', overflow: 'hidden' }}><summary style={{ cursor: 'pointer', padding: '12px 14px', background: '#f8fafc', fontWeight: 900 }}>{title}（{rows.length}）</summary><div style={{ padding: 14 }}>{content}</div></details>;
    return <Card title={title} note="状态、原因与操作共用 product-types 语义；概况页和完整维护页状态保持一致。">
      {content}
    </Card>;
  }

  function groupedEnabled() {
    const groups = [...new Set(enabled.map((item) => objectTypeLabel(item.objectType)))];
    if (!groups.length) return <Card title="启用对象" note="enabled 对象默认显示。"><EmptyState title="暂无启用对象数据">请先在业态产品完整维护页维护对象，或等待后端返回系统默认对象。</EmptyState></Card>;
    return groups.map((group) => table(enabled.filter((item) => objectTypeLabel(item.objectType) === group), group));
  }

  return <SectionShell>
    {locked ? <StatusNotice title="当前版本已锁定" tone="danger">业态新增、停用、恢复均不可操作。</StatusNotice> : null}
    <StatusNotice title="本分区保存方式">业态产品与对象当前按单项操作保存；请使用每行或预设业态按钮新增、停用、恢复。顶部“按单项保存”为只读提示，不会表现为无反馈的整区保存。</StatusNotice>
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
    <StatusNotice title="对象口径说明">主楼地下室 / 非主楼地下室 = 空间归属口径；地下车库面积 = 功能使用口径。车位是收入对象 / 利润对象，收入按数量 x 单价。样板间、售楼处、示范区展示为营销展示 / 专项成本对象，V1 默认进入开发成本口径。</StatusNotice>
    {groupedEnabled()}
    {table(disabled, '已停用对象', true)}
  </SectionShell>;
}

async function ConstructionStandardsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileConstructionStandards(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const data: any = resultData(result);
  const rawStandards = Array.isArray(data.standards) ? data.standards : [];
  const fallbackStandards = [
    standardRow({ value: data.deliveryStandard, affectsDifficulty: true }, 'structure', data.deliveryStandard || '基础结构标准'),
    standardRow({ value: data.garageStandard, standardLevel: 'object_level', costObjectName: '地下室 / 地库', affectsCostPool: true }, 'basement', data.garageStandard || '地下室标准'),
    standardRow({ value: data.civilDefenseStandard, isEnabled: data.isCivilDefenseEnabled, affectsSubjectEnabled: true, affectsContentRule: true }, 'civil_defense', data.civilDefenseStandard || '人防标准'),
    standardRow({ value: data.prefabStandard, isEnabled: data.isPrefabEnabled, affectsSubjectEnabled: true, affectsContentRule: true, affectsDifficulty: true }, 'prefabricated', data.prefabStandard || '装配式标准'),
    standardRow({ value: data.facadeStandard, affectsUnitPrice: true, affectsDifficulty: true }, 'facade', data.facadeStandard || '外立面标准'),
    standardRow({ value: data.doorWindowStandard, affectsUnitPrice: true }, 'window_door', data.doorWindowStandard || '门窗标准'),
    standardRow({ value: data.fineDecorationStandard, isEnabled: data.isFineDecorationEnabled, affectsSubjectEnabled: true, affectsContentRule: true, affectsUnitPrice: true }, 'indoor_decoration', data.fineDecorationStandard || '户内精装修标准'),
    standardRow({ value: data.fineDecorationScope, standardLevel: 'object_level', affectsCostPool: true }, 'public_area_decoration', data.fineDecorationScope || '公区装修标准'),
    standardRow({ value: data.heatingStandard, isEnabled: data.isHeatingEnabled, affectsSubjectEnabled: true, affectsUnitPrice: true }, 'equipment', data.heatingStandard || '设备 / 采暖标准'),
    standardRow({ value: data.garageStandard, standardLevel: 'object_level', costObjectName: '地下车库' }, 'garage', data.garageStandard || '车库品质标准'),
    standardRow({ value: data.landscapeStandard, affectsContentRule: true, affectsUnitPrice: true }, 'landscape', data.landscapeStandard || '景观标准'),
    standardRow({ value: data.intelligentStandard, affectsUnitPrice: true }, 'intelligent', data.intelligentStandard || '智能化标准'),
    standardRow({ value: data.demoAreaStandard, isEnabled: data.isDemoAreaEnabled, standardLevel: 'object_level', costObjectName: '营销展示对象', affectsSubjectEnabled: true, affectsCostPool: true }, 'demo_sales_sample', data.demoAreaStandard || '示范区 / 售楼处 / 样板间标准'),
    standardRow({ value: data.ancientBuildingStandard, isEnabled: data.isAncientBuildingEnabled, affectsSubjectEnabled: true, affectsDifficulty: true }, 'ancient_building', data.ancientBuildingStandard || '古建专项标准')
  ];
  const standards = rawStandards.length ? rawStandards.map((item: any) => standardRow(item, item.standardCategory || 'structure', item.standardName || '建造标准')) : fallbackStandards;
  return <ProfileSectionForm formId="profile-construction-standards-form" endpoint={profileUrl(projectId, versionId, 'construction-standards')} locked={locked} successMessage="建造标准已保存。">
    <SectionShell>
      {locked ? <StatusNotice title="当前版本已锁定" tone="danger">建造标准配置只读，不能保存或触发重算。</StatusNotice> : null}
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
      <Card title="建造标准分类展示" note="按 Z3 支持的标准分类展示；后端未返回标准库行时，以当前配置字段生成只读兼容行。">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {standardCategories.map(([category, label]) => {
            const rows = standards.filter((item: any) => item.standardCategory === category);
            return <details key={category} open={rows.some((item: any) => item.isEnabled)} style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fbfdff' }}>
              <summary style={{ cursor: 'pointer', padding: '10px 12px', fontWeight: 900 }}>{label}（{rows.length}）</summary>
              {rows.length ? <div style={{ overflowX: 'auto', padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1320, fontSize: 12 }}>
                  <thead><tr>{['层级', '编码 / 名称', '对象 / 明细科目', '地区 / 难度', '材料 / 设备档次', '影响范围', '状态', '备注'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fff' }}>{head}</th>)}</tr></thead>
                  <tbody>{rows.map((item: any) => <tr key={`${item.standardCategory}-${item.standardCode}-${item.standardName}`}>
                    <td style={cell}><Badge tone="blue">{levelLabel[item.standardLevel] || item.standardLevel || '项目级'}</Badge><div className="meta">{item.standardLevel || 'project_level'}</div></td>
                    <td style={{ ...cell, fontWeight: 900 }}>{item.standardCode}<div className="meta">{item.standardName}</div></td>
                    <td style={cell}>{item.costObjectName || item.costObjectId || '项目整体'}<div className="meta">{item.detailSubjectName || item.detailSubjectId || '未绑定明细科目'}</div></td>
                    <td style={cell}>{item.region || '全项目'}<div className="meta">难度：{item.difficultyLevel || '未设置'} / 系数 {display(item.difficultyCoefficient)}</div></td>
                    <td style={cell}>{item.materialGrade || '未设置'}<div className="meta">设备：{item.equipmentGrade || '未设置'}</div></td>
                    <td style={cell}><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 360 }}>
                      <Badge tone={item.affectsSubjectEnabled ? 'green' : 'neutral'}>科目启用 {booleanText(item.affectsSubjectEnabled)}</Badge>
                      <Badge tone={item.affectsContentRule ? 'green' : 'neutral'}>含量 {booleanText(item.affectsContentRule)}</Badge>
                      <Badge tone={item.affectsUnitPrice ? 'green' : 'neutral'}>单价 {booleanText(item.affectsUnitPrice)}</Badge>
                      <Badge tone={item.affectsDifficulty ? 'green' : 'neutral'}>难度 {booleanText(item.affectsDifficulty)}</Badge>
                      <Badge tone={item.affectsCostPool ? 'green' : 'neutral'}>成本池 {booleanText(item.affectsCostPool)}</Badge>
                    </div></td>
                    <td style={cell}><Badge tone={item.isEnabled ? 'green' : 'neutral'}>{item.isEnabled ? '启用' : '未启用'}</Badge>{item.recalculationRequired ? <div style={{ marginTop: 5 }}><Badge tone="orange">需要重新计算</Badge></div> : null}</td>
                    <td style={{ ...cell, minWidth: 240 }}>{item.remark || '无'}</td>
                  </tr>)}</tbody>
                </table>
              </div> : <div style={{ padding: 12 }}><EmptyState title="暂无建造标准数据">当前版本可能尚未生成标准配置，可先使用系统默认标准。</EmptyState></div>}
            </details>;
          })}
        </div>
      </Card>
    </SectionShell>
  </ProfileSectionForm>;
}

const projectTotalMetricFields: MetricField[] = [
  ['landArea', '用地面积', 'number', '规划面积'], ['totalBuildingArea', '总建筑面积', 'number', '规划面积'], ['plotRatioArea', '计容建筑面积', 'number', '规划面积'], ['groundBuildingArea', '地上建筑面积', 'number', '规划面积'], ['undergroundBuildingArea', '地下建筑面积', 'number', '规划面积'], ['buildingBaseArea', '建筑基底面积', 'number', '规划面积'], ['plotRatio', '容积率', 'number', '规划面积'], ['buildingDensity', '建筑密度', 'number', '规划面积'], ['greenRatio', '绿地率', 'number', '规划面积'],
  ['basementArea', '地下室面积', 'number', '地下室'], ['civilDefenseArea', '人防面积', 'number', '地下室'], ['nonCivilDefenseArea', '非人防面积', 'number', '地下室'], ['undergroundGarageArea', '地下车库面积', 'number', '地下室'],
  ['landscapeArea', '景观面积', 'number', '景观道路'], ['hardscapeArea', '硬景面积', 'number', '景观道路'], ['softscapeArea', '软景面积', 'number', '景观道路'], ['vehicleRoadArea', '车行道路面积', 'number', '景观道路'], ['pedestrianRoadArea', '人行道路面积', 'number', '景观道路'], ['fireRoadArea', '消防道路面积', 'number', '景观道路'], ['perimeterLength', '周界长度', 'number', '景观道路'], ['wallLength', '围墙长度', 'number', '景观道路'],
  ['parkingTotalCount', '车位总数', 'number', '车位'], ['entranceCount', '出入口数量', 'number', '数量指标'], ['householdTotalCount', '总户数', 'number', '数量指标'], ['buildingTotalCount', '总栋数', 'number', '数量指标'], ['unitTotalCount', '总单元数', 'number', '数量指标']
];

const productMetricFields = [
  ['objectId', 'objectId', 'text'], ['objectName', '对象名称', 'text'], ['objectType', '对象类型', 'text'], ['groundBuildingArea', '地上建筑面积', 'number'], ['undergroundLinkedArea', '地下关联面积', 'number'], ['grossFloorArea', '建筑面积', 'number'], ['plotRatioArea', '计容建筑面积', 'number'], ['nonPlotRatioArea', '不计容建筑面积', 'number'], ['saleableArea', '可售面积', 'number'], ['nonSaleableArea', '不可售面积', 'number'], ['giftedArea', '赠送面积', 'number'], ['innerArea', '套内面积', 'number'], ['sharedArea', '公摊面积', 'number'], ['efficiencyRate', '得房率', 'number'], ['householdCount', '户数 / 套数', 'number'], ['unitCount', '单元数', 'number'], ['buildingCount', '栋数', 'number'], ['floorCount', '层数', 'number'], ['typicalFloorArea', '标准层面积', 'number'], ['baseArea', '基底面积', 'number'], ['landOccupationArea', '占地面积', 'number'], ['saleableQuantity', '可售数量', 'number'], ['measureUnit', '计量单位', 'text'], ['remark', '备注', 'text']
] as Array<readonly [string, string, 'text' | 'number' | 'checkbox']>;
const buildingMetricFields = [
  ['buildingId', 'buildingId', 'text'], ['buildingCode', '楼栋编号', 'text'], ['buildingName', '楼栋名称', 'text'], ['productObjectId', 'productObjectId', 'text'], ['productObjectName', '所属业态 / 产品对象', 'text'], ['groundFloorCount', '地上层数', 'number'], ['undergroundFloorCount', '地下层数', 'number'], ['unitCount', '单元数', 'number'], ['householdCount', '户数', 'number'], ['typicalFloorArea', '标准层面积', 'number'], ['groundBuildingArea', '地上建筑面积', 'number'], ['undergroundMainBuildingArea', '地下主楼面积', 'number'], ['baseArea', '建筑基底面积', 'number'], ['isSaleable', '是否可售', 'checkbox'], ['participatesCostCalculation', '参与成本测算', 'checkbox'], ['participatesIncomeCalculation', '参与收入测算', 'checkbox'], ['elevatorCountReserved', '电梯数量预留', 'number'], ['entranceDoorCountReserved', '入户门数量预留', 'number'], ['facadeAreaReserved', '外立面面积预留', 'number'], ['remark', '备注', 'text']
] as Array<readonly [string, string, 'text' | 'number' | 'checkbox']>;
const unitPlanMetricFields = [
  ['unitPlanId', 'unitPlanId', 'text'], ['unitPlanName', '户型名称', 'text'], ['productObjectId', 'productObjectId', 'text'], ['productObjectName', '所属业态', 'text'], ['unitBuildingArea', '户型建面', 'number'], ['unitInnerArea', '户型套内面积', 'number'], ['unitSaleableArea', '户型可售面积', 'number'], ['unitCount', '户型数量', 'number'], ['typicalFloorArea', '标准层面积', 'number'], ['typicalFloorHouseholdCount', '标准层户数', 'number'], ['typicalFloorCount', '标准层层数', 'number'], ['efficiencyRate', '得房率', 'number'], ['entranceDoorCount', '入户门数量', 'number'], ['windowAreaReserved', '外窗面积 / 窗地比预留', 'number'], ['balconyAreaReserved', '阳台面积预留', 'number'], ['decorationAreaReserved', '精装面积预留', 'number'], ['remark', '备注', 'text']
] as Array<readonly [string, string, 'text' | 'number' | 'checkbox']>;
const basementMetricFields: MetricField[] = [['basementTotalArea', '地下总建筑面积', 'number', '地下室'], ['mainBuildingBasementArea', '主楼地下室面积', 'number', '地下室'], ['nonMainBuildingBasementArea', '非主楼地下室面积', 'number', '地下室'], ['undergroundGarageArea', '地下车库面积', 'number', '地下室'], ['civilDefenseArea', '人防面积', 'number', '地下室'], ['nonCivilDefenseArea', '非人防面积', 'number', '地下室'], ['equipmentRoomArea', '设备用房面积', 'number', '地下室'], ['undergroundPublicArea', '地下公共区域面积', 'number', '地下室'], ['basementFloorCount', '地下层数', 'number', '地下室'], ['basementFloorHeight', '地下室层高', 'number', '地下室'], ['undergroundParkingCount', '地下车位数量', 'number', '车位'], ['civilDefenseParkingCount', '人防车位数量', 'number', '车位'], ['nonCivilDefenseParkingCount', '非人防车位数量', 'number', '车位'], ['chargingParkingCount', '充电车位数量', 'number', '车位'], ['garageFloorArea', '地坪面积', 'number', '工程量预留'], ['trafficMarkingAreaOrCount', '车库划线 / 交安面积或数量', 'number', '工程量预留'], ['rampCount', '坡道数量', 'number', '工程量预留'], ['rampArea', '坡道面积', 'number', '工程量预留'], ['lightWellCountReserved', '采光井数量预留', 'number', '工程量预留'], ['remark', '备注', 'text', '备注']];
const parkingMetricFields: MetricField[] = [['parkingTotalCount', '车位总数', 'number', '车位'], ['propertyRightParkingCount', '产权车位数量', 'number', '车位'], ['useRightParkingCount', '使用权车位数量', 'number', '车位'], ['civilDefenseParkingCount', '人防车位数量', 'number', '车位'], ['nonCivilDefenseParkingCount', '非人防车位数量', 'number', '车位'], ['saleableParkingCount', '可售车位数量', 'number', '车位'], ['selfOwnedParkingCount', '自持车位数量', 'number', '车位'], ['mechanicalParkingCount', '机械车位数量', 'number', '车位'], ['chargingPileParkingCount', '充电桩车位数量', 'number', '车位'], ['chargingPileCount', '充电桩数量', 'number', '车位'], ['parkingSaleUnitPriceReserved', '车位销售单价预留', 'number', '单价预留'], ['parkingRentUnitPriceReserved', '车位租赁单价预留', 'number', '单价预留'], ['remark', '备注', 'text', '备注']];
const landscapeRoadMetricFields: MetricField[] = [['landscapeTotalArea', '景观总面积', 'number', '景观'], ['hardscapeArea', '硬景面积', 'number', '景观'], ['softscapeArea', '软景面积', 'number', '景观'], ['waterscapeArea', '水景面积', 'number', '景观'], ['childrenActivityArea', '儿童活动场地面积', 'number', '景观'], ['sportActivityArea', '运动场地面积', 'number', '景观'], ['pedestrianRoadArea', '人行道路面积', 'number', '道路'], ['vehicleRoadArea', '车行道路面积', 'number', '道路'], ['fireRoadArea', '消防道路面积', 'number', '道路'], ['asphaltRoadArea', '沥青道路面积', 'number', '道路'], ['pavingArea', '铺装面积', 'number', '道路'], ['wallLength', '围墙长度', 'number', '周界'], ['perimeterLength', '周界长度', 'number', '周界'], ['entranceCount', '出入口数量', 'number', '周界'], ['gateCount', '大门数量', 'number', '周界'], ['guardhouseCount', '岗亭数量', 'number', '周界'], ['rainSewagePipeLengthReserved', '雨污水管网长度预留', 'number', '管网预留'], ['waterSupplyPipeLengthReserved', '给水管网长度预留', 'number', '管网预留'], ['strongWeakElectricTrenchLengthReserved', '强弱电管沟长度预留', 'number', '管网预留'], ['outdoorLightingPointReserved', '室外照明点位预留', 'number', '管网预留'], ['remark', '备注', 'text', '备注']];
const supportingSpecialMetricFields: MetricField[] = [['propertyManagementRoomArea', '物业用房面积', 'number', '配套'], ['communityRoomArea', '社区用房面积', 'number', '配套'], ['elderlyCareRoomArea', '养老用房面积', 'number', '配套'], ['kindergartenArea', '幼儿园面积', 'number', '配套'], ['clubhouseArea', '会所面积', 'number', '配套'], ['stiltFloorArea', '架空层面积', 'number', '配套'], ['garbageRoomArea', '垃圾房面积', 'number', '配套'], ['powerDistributionRoomArea', '开闭所 / 配电房面积', 'number', '配套'], ['fireControlRoomArea', '消防控制室面积', 'number', '配套'], ['gatehouseArea', '门卫室面积', 'number', '配套'], ['handoverRoomArea', '移交用房面积', 'number', '配套'], ['nonSaleableCommercialArea', '不可售商业面积', 'number', '不可售 / 自持'], ['selfOwnedCommercialArea', '自持商业面积', 'number', '不可售 / 自持'], ['sampleRoomBuildingArea', '样板间建筑面积', 'number', '营销展示'], ['sampleRoomDecorationArea', '样板间装修面积', 'number', '营销展示'], ['salesOfficeBuildingArea', '售楼处建筑面积', 'number', '营销展示'], ['salesOfficeDecorationArea', '售楼处装修面积', 'number', '营销展示'], ['demoAreaLandscapeArea', '示范区景观面积', 'number', '营销展示'], ['viewingPassageArea', '看房通道面积', 'number', '营销展示'], ['temporaryFacilityArea', '临时设施面积', 'number', '营销展示'], ['isSpecialCostObject', '是否专项成本对象', 'checkbox', '成本口径'], ['defaultCostBearingType', '默认成本承担口径', 'text', '成本口径'], ['remark', '备注', 'text', '备注']];

async function ProjectMetricsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfile(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}<div style={{ marginTop: 10 }}><Link href={`/projects/${projectId}/overview?section=project-metrics`} className="btn">重试</Link></div></StatusNotice>;
  const center: any = resultData(result).projectMetricCenter || {};
  const summary: any = center.metricValidationSummary || { warnings: [] };
  const warnings: any[] = Array.isArray(summary.warnings) ? summary.warnings : [];
  const products: any[] = mergeProductMetricRows(Array.isArray(center.productObjectMetrics) ? center.productObjectMetrics : []);
  const enabledProducts = products.filter((item) => item.isEnabled !== false && item.objectStatus !== 'disabled');
  const disabledProducts = products.filter((item) => item.isEnabled === false || item.objectStatus === 'disabled');
  const mappings: any[] = Array.isArray(center.baseIndicatorMappings) ? center.baseIndicatorMappings : [];
  const metricCenterEndpoint = `/api/projects/${projectId}/versions/${versionId}/metric-center`;
  return <ProfileSectionForm formId="profile-project-metrics-form" endpoint={metricCenterEndpoint} locked={locked} successMessage="项目指标中心已保存。" statusPlacement="top">
    <SectionShell>
      <StatusNotice title="项目指标中心口径">项目指标页负责维护项目级、业态级、楼栋级、地下室、车位、景观道路、配套及专项对象等基础指标。工程量指标页会读取这些指标作为 baseIndicator，并通过 baseIndicator x contentRule = calculatedQuantity；目标成本表最终读取 finalQuantity x unitPrice = finalAmount。finalAmount 仍为含税金额口径。</StatusNotice>
      {locked ? <StatusNotice title="当前版本已锁定" tone="danger">项目指标中心只读，不允许修改或同步基础指标。</StatusNotice> : null}
      <div className="summary-strip">
        <Stat label="项目总指标" value={Object.values(center.projectTotalMetrics || {}).filter((value) => value !== null && value !== '').length} />
        <Stat label="产品对象指标" value={enabledProducts.length} note={disabledProducts.length ? `停用 ${disabledProducts.length} 个，默认不参与汇总` : '启用对象'} />
        <Stat label="楼栋指标" value={(center.buildingMetrics || []).length} />
        <Stat label="baseIndicator 映射" value={mappings.length} />
      </div>
      <Card title="1. 项目总指标" note="按规划面积、地下室、景观道路、车位和数量指标分组。">
        <MetricFieldGrid section="projectTotalMetrics" fields={projectTotalMetricFields} data={center.projectTotalMetrics || {}} locked={locked} />
        {!Object.values(center.projectTotalMetrics || {}).some((value) => value !== null && value !== '') ? <EmptyState title="暂无项目总指标">请先维护用地面积、建筑面积、地下室、景观道路和车位等基础数据。</EmptyState> : null}
      </Card>
      <Card title="2. 分业态 / 分产品对象指标" note="每行代表一个产品对象或业态，不把产品对象全部统称为业态。停用对象默认不参与汇总。">
        <MetricTable section="productObjectMetrics" rows={enabledProducts} fields={productMetricFields} locked={locked} emptyTitle="暂无分业态 / 分产品对象指标" emptyChildren="请先在业态产品与对象页启用对象，或维护产品对象面积指标。" leading={(row) => <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}><Badge tone={row?.displayKind === '独立商业对象' ? 'orange' : row?.displayKind === '楼层商业对象' ? 'blue' : 'neutral'}>{row?.displayKind || '产品对象'}</Badge><Badge tone={row?.isSaleableObject ? 'green' : 'neutral'}>可售对象</Badge><Badge tone={row?.isCostObject ? 'green' : 'neutral'}>成本对象</Badge><Badge tone={row?.isIncomeObject ? 'green' : 'neutral'}>收入对象</Badge><Badge tone={row?.isProfitObject ? 'green' : 'neutral'}>利润对象</Badge></div>} />
        {disabledProducts.length ? <details style={{ marginTop: 12, border: '1px solid #e6eef7', borderRadius: 8 }}><summary style={{ padding: 10, cursor: 'pointer', fontWeight: 900 }}>已停用对象（{disabledProducts.length}，默认不参与汇总）</summary><div style={{ padding: 10 }}><MetricTable section="productObjectMetrics" rows={disabledProducts} fields={productMetricFields} locked={locked} rowOffset={enabledProducts.length} emptyTitle="暂无停用对象" emptyChildren="当前没有停用对象。" /></div></details> : null}
      </Card>
      <Card title="3. 楼栋维度指标" note="后续影响电梯、外立面、门窗、入户门、公区精装、消防、电气、楼栋单方成本等工程量推算；V1 不做楼栋级成本分析。">
        <MetricTable section="buildingMetrics" rows={center.buildingMetrics || []} fields={buildingMetricFields} locked={locked} blankRows={1} emptyTitle="暂无楼栋指标" emptyChildren="V1 可先按业态测算，后续可补充楼栋编号、层数、单元数、户数和标准层面积。" />
      </Card>
      <Card title="4. 户型 / 标准层指标预留" note="后续影响门窗、入户门、栏杆、精装、公区、电梯、消防、安装、户内水电等工程量推算；V1 不做户型级成本分析。">
        <MetricTable section="unitPlanMetrics" rows={center.unitPlanMetrics || []} fields={unitPlanMetricFields} locked={locked} blankRows={1} emptyTitle="暂无户型 / 标准层指标" emptyChildren="当前作为预留入口，可轻量录入户型建面、套内面积、标准层面积和户型数量。" />
      </Card>
      <Card title="5. 地下室专项指标" note="地下车库面积不等于非主楼地下室面积；车位数量也不等于地下车库面积。">
        <StatusNotice title="地下室口径提示" tone="warning">地下车库面积 ≠ 非主楼地下室面积。车位数量 ≠ 地下车库面积。</StatusNotice>
        <MetricFieldGrid section="basementMetrics" fields={basementMetricFields} data={center.basementMetrics || {}} locked={locked} />
      </Card>
      <Card title="6. 车位专项指标" note="车位收入保持数量口径。">
        <StatusNotice title="车位收入口径" tone="warning">车位收入 = 车位数量 x 车位单价。不是车位面积 x 元/㎡。</StatusNotice>
        <MetricFieldGrid section="parkingMetrics" fields={parkingMetricFields} data={center.parkingMetrics || {}} locked={locked} />
      </Card>
      <Card title="7. 景观 / 道路 / 周界指标" note="后续影响硬景、软景、道路、围墙、大门、岗亭、综合管网、景观照明、海绵城市、室外配套等工程量。">
        <MetricFieldGrid section="landscapeRoadMetrics" fields={landscapeRoadMetricFields} data={center.landscapeRoadMetrics || {}} locked={locked} />
      </Card>
      <Card title="8. 配套 / 不可售 / 专项对象指标" note="配套 / 不可售对象通常不直接产生收入，但会进入成本和分摊。样板间、售楼处、示范区 V1 默认进入 development_cost，不自动进入销售费用。">
        <MetricFieldGrid section="supportingSpecialMetrics" fields={supportingSpecialMetricFields} data={center.supportingSpecialMetrics || {}} locked={locked} />
      </Card>
      <Card title="9. 指标汇总校验" note="warnings 只提示，不阻断；早期测算数据不完整时允许保存。">
        <div className="summary-strip">
          {['productGroundAreaTotal', 'projectGroundArea', 'productPlotRatioAreaTotal', 'projectPlotRatioArea', 'productSaleableAreaTotal', 'productHouseholdCountTotal', 'projectHouseholdTotalCount', 'productBuildingCountTotal', 'projectBuildingTotalCount', 'parkingSubTotal', 'parkingTotalCount', 'basementSubAreaTotal', 'basementTotalArea', 'civilDefensePlusNonCivilDefenseArea', 'hardSoftRoadAreaTotal', 'landscapeTotalArea', 'fireRoadArea', 'vehicleRoadArea'].map((key) => <Stat key={key} label={key} value={display(summary[key])} />)}
        </div>
        {warnings.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>{warnings.map((item, index) => <div key={`${item.code}-${index}`} style={{ border: '1px solid #ffd8a8', background: item.level === 'info' || item.level === 'notice' ? '#f8fbff' : '#fff9db', borderRadius: 8, padding: 10 }}><Badge tone={item.level === 'info' || item.level === 'notice' ? 'blue' : 'orange'}>{item.level || 'warning'}</Badge> <b>{item.code}</b><div className="meta">{item.message}</div><div className="meta">relatedField: {item.relatedField || '未返回'}</div></div>)}</div> : <p className="meta">暂无校验提示。</p>}
      </Card>
      <Card title="10. baseIndicator 映射与工程量衔接" note="同步按钮会调用 Z4 的 sync-base-indicators 接口；映射表以接口返回为准。" action={<MetricCenterSyncAction endpoint={`/api/projects/${projectId}/versions/${versionId}/metrics/sync-base-indicators`} locked={locked} />}>
        <StatusNotice title="与工程量指标页衔接">可售面积影响收入测算和可售单方成本；建筑面积影响建面单方成本；计容建筑面积用于规划指标和部分测算口径；地下室、地下车库、景观道路、周界、栋数、单元数、户数、层数和标准层面积会进入对应工程量推算；配套 / 不可售对象通常不产生收入，但参与成本归集和分摊。</StatusNotice>
        {mappings.length ? <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1540, fontSize: 12 }}>
            <thead><tr>{['mappingId', 'metricSourceType', 'metricSourceCode', 'metricSourceName', 'metricValue', 'metricUnit', 'baseIndicatorType', 'baseIndicatorCode', 'baseIndicatorName', 'costObjectId', 'costObjectType', 'canBeUsedByQuantityCalculation', 'usedByDetailSubjects', 'remark'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
            <tbody>{mappings.map((item) => <tr key={item.mappingId}>
              {['mappingId', 'metricSourceType', 'metricSourceCode', 'metricSourceName', 'metricValue', 'metricUnit', 'baseIndicatorType', 'baseIndicatorCode', 'baseIndicatorName', 'costObjectId', 'costObjectType'].map((key) => <td key={key} style={cell}>{display(item[key])}</td>)}
              <td style={cell}><Badge tone={item.canBeUsedByQuantityCalculation ? 'green' : 'neutral'}>{item.canBeUsedByQuantityCalculation ? '可被工程量计算引用' : '待维护数值'}</Badge></td>
              <td style={cell}>{Array.isArray(item.usedByDetailSubjects) && item.usedByDetailSubjects.length ? item.usedByDetailSubjects.join('、') : '未绑定明细科目'}</td>
              <td style={{ ...cell, minWidth: 220 }}>{item.remark || '无'}</td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title="暂无可映射基础指标">请先维护项目指标中心数据，或执行基础指标映射刷新。</EmptyState>}
      </Card>
    </SectionShell>
  </ProfileSectionForm>;
}

async function QuantityIndicatorsSection({ projectId, versionId, locked }: { projectId: string; versionId: string; locked: boolean }) {
  const result = await getProfileQuantityIndicators(projectId, versionId);
  if (!result.body.success) return <StatusNotice title="读取失败" tone="danger">{result.body.error.message}</StatusNotice>;
  const data: any = resultData(result);
  const version = await prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, include: { products: true } });
  const costLines = await prisma.costLine.findMany({ where: { projectVersionId: versionId }, select: { id: true, taxInclusiveUnitPrice: true, taxInclusiveAmount: true, taxExclusiveAmount: true, taxAmount: true, taxRate: true, unit: true, measureBasis: true, importBatchId: true, remark: true } });
  const costLineMap = new Map(costLines.map((line) => [line.id, line]));
  const activeProductNames = new Set((version?.products || []).filter((item) => item.isActive).map((item) => item.name));
  const indicators = (data.indicators || []).filter((item: any) => !item.relatedProductType || activeProductNames.size === 0 || activeProductNames.has(item.relatedProductType) || item.relatedProductType === '全项目').map((item: any) => {
    const line = costLineMap.get(item.indicatorId);
    return {
      ...item,
      unitPrice: item.unitPrice ?? line?.taxInclusiveUnitPrice,
      priceUnit: item.priceUnit || (line?.unit ? `元/${line.unit}` : null),
      priceSource: item.priceSource || (line?.importBatchId ? 'excel_imported' : item.isQuantityOverridden ? 'user_project_manual' : 'system_default'),
      taxRate: item.taxRate ?? line?.taxRate,
      finalAmount: item.finalAmount ?? line?.taxInclusiveAmount,
      taxExcludedAmount: item.taxExcludedAmount ?? line?.taxExclusiveAmount,
      taxAmount: item.taxAmount ?? line?.taxAmount,
      amountSource: item.amountSource || 'cost_line_taxInclusiveAmount'
    };
  });
  const baseIndicators = indicators.filter((item: any) => item.baseIndicatorName || item.baseIndicatorValue !== null);
  const contentRules = indicators.filter((item: any) => item.contentRatio !== null && item.contentRatio !== undefined);
  return <SectionShell>
    {data.warnings?.length ? <StatusNotice title="工程量复核提醒" tone="warning">{data.warnings.join('；')}</StatusNotice> : null}
    {data.helpText ? <StatusNotice title="工程量口径说明" tone="success">{data.helpText}</StatusNotice> : null}
    {locked ? <StatusNotice title="当前版本已锁定" tone="danger">工程量指标、手算覆盖与恢复系统推算只读，不允许修改。</StatusNotice> : null}
    <div className="summary-strip">
      <Stat label="指标总数" value={data.summary?.totalIndicators || 0} />
      <Stat label="当前展示" value={indicators.length} />
      <Stat label="手算覆盖" value={data.summary?.overriddenCount || 0} />
      <Stat label="锁定行数" value={data.summary?.lockedCount || 0} />
    </div>
    <Card title="工程量指标分组摘要" note="本页读取 profile quantityIndicators 分区；逐行手算继续使用已验证的覆盖与恢复接口。">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {[
          ['基础指标 baseIndicator', baseIndicators.length],
          ['明细科目基础指标绑定 subjectIndicatorBinding', indicators.length],
          ['含量规则 contentRule', contentRules.length],
          ['工程量计算 quantityCalculation', indicators.length],
          ['单价来源 unitPriceSource', indicators.filter((item: any) => item.unitPrice !== null && item.unitPrice !== undefined).length],
          ['手算覆盖 / 恢复系统推算', indicators.filter((item: any) => item.isQuantityOverridden).length]
        ].map(([label, count]) => <div key={label} style={{ border: '1px solid #e6eef7', borderRadius: 8, padding: 10, background: '#fbfdff' }}><b>{label}</b><div className="meta">当前 {count} 条。</div></div>)}
      </div>
    </Card>
    <Card title="基础指标、绑定与含量规则" note="必须明确：基础指标 x 含量 = calculatedQuantity。工程量单位按后端返回展示。">
      {indicators.length ? <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1320, fontSize: 12 }}>
          <thead><tr>{['明细科目基础指标绑定', 'baseIndicator', 'contentRule', '计算式', 'lockMode / overrideReason', '来源'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
          <tbody>{indicators.map((item: any) => <tr key={`binding-${item.indicatorId}`}>
            <td style={{ ...cell, fontWeight: 800 }}>{item.indicatorName}<div className="meta">{item.detailSubjectName || item.indicatorCode}</div></td>
            <td style={cell}>{item.baseIndicatorName || item.measureBasis || '未绑定'}<div className="meta">baseIndicatorValue: {display(item.baseIndicatorValue)} {item.baseIndicatorUnit || item.quantityUnit || ''}</div><div className="meta">source: {item.indicatorSource || 'cost_line'} / {item.sourceRemark || item.quantitySourceRemark || '无备注'}</div><div className="meta">indicatorType: {item.indicatorType || 'cost_line_measure_basis'} / isOverridden: {booleanText(item.isQuantityOverridden)}</div></td>
            <td style={cell}>contentRatio: {display(item.contentRatio ?? 1)}<div className="meta">quantityUnit: {item.quantityUnit || '-'}</div><div className="meta">applicableRegion: {item.applicableRegion || item.relatedProductType || '全项目'}</div><div className="meta">confidenceLevel: {item.confidenceLevel || '按系统规则'}</div></td>
            <td style={cell}><b>基础指标 x 含量 = calculatedQuantity</b><div className="meta">{fmt(item.baseIndicatorValue)} x {fmt(item.contentRatio || 1)} = {fmt(item.calculatedQuantity)} {item.quantityUnit || ''}</div></td>
            <td style={cell}>{item.isQuantityLocked ? 'locked_confirmed' : item.isQuantityOverridden ? 'manual_override' : 'auto'}<div className="meta">{item.overrideReason || '无覆盖原因'}</div></td>
            <td style={cell}>{item.quantitySource || 'auto'}<div className="meta">{item.quantitySourceRemark || '无备注'}</div></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title="暂无工程量指标数据">请先在项目指标页维护基础指标，或等待后端返回系统默认指标。</EmptyState>}
    </Card>
    <Card title="成本明细工程量手算" note="系统值来自基础指标和含量系数；生效值以 finalQuantity 为准。锁定版本下禁止修改。">
      {locked ? <StatusNotice title="当前版本已锁定" tone="danger">工程量手算覆盖与恢复系统值不可操作。</StatusNotice> : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1760, fontSize: 12 }}>
          <thead><tr>{['指标', '适用对象', 'calculatedQuantity', 'manual / excel / drawing / locked', 'finalQuantity', 'quantityCalcMode', 'unitPrice / priceSource', 'finalAmount 含税金额', '状态提示', '操作'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
          <tbody>{indicators.length ? indicators.map((item: any) => <tr key={item.indicatorId} style={item.isQuantityOverridden ? { background: '#fffaf0' } : undefined}>
            <td style={{ ...cell, fontWeight: 800 }}>{item.indicatorCode} {item.indicatorName}<div className="meta">{item.baseIndicatorName || '未配置取数依据'}</div></td>
            <td style={cell}>{item.relatedProductType || '全项目'}</td>
            <td style={cell}>{fmt(item.calculatedQuantity)} {item.quantityUnit || ''}<div className="meta">取数 {fmt(item.baseIndicatorValue)} × 系数 {fmt(item.contentRatio || 1)}</div></td>
            <td style={cell}>
              <div>manualQuantity: {item.manualQuantity === null ? '空值' : `${fmt(item.manualQuantity)} ${item.quantityUnit || ''}`}</div>
              <div className="meta">excelImportedQuantity: {item.excelImportedQuantity === null ? '空值' : fmt(item.excelImportedQuantity)}</div>
              <div className="meta">drawingMeasuredQuantity: {item.drawingMeasuredQuantity === null ? '空值' : fmt(item.drawingMeasuredQuantity)}</div>
              <div className="meta">lockedQuantity: {item.lockedQuantity === null || item.lockedQuantity === undefined ? '空值' : fmt(item.lockedQuantity)}</div>
            </td>
            <td style={{ ...cell, fontWeight: 900 }}>{fmt(item.finalQuantity)} {item.quantityUnit || ''}</td>
            <td style={cell}><Badge tone={item.isQuantityOverridden ? 'orange' : 'green'}>{modeText(item.quantityCalcMode)}</Badge><div className="meta">{item.quantityCalcMode || '未返回'}</div><div className="meta">quantitySource: {item.quantitySource || item.indicatorSource}</div></td>
            <td style={cell}>{fmt(item.unitPrice)}<div className="meta">{item.priceUnit || item.quantityUnit || '按后端返回'}</div><div className="meta">priceSource: {priceSourceText(item.priceSource)}</div><div className="meta">taxRate: {fmt(n(item.taxRate) * 100)}%</div></td>
            <td style={{ ...cell, fontWeight: 900 }}>{fmt(item.finalAmount)} 万元<div className="meta">finalAmount = 含税金额；不含税 {fmt(item.taxExcludedAmount)} / 税额 {fmt(item.taxAmount)}</div><div className="meta">amountSource: {item.amountSource}</div></td>
            <td style={cell}>{item.isQuantityOverridden ? <Badge tone="orange">已手算覆盖</Badge> : <Badge tone="green">使用系统值</Badge>}<div className="meta" style={{ maxWidth: 260, whiteSpace: 'normal' }}>{overrideNotice(item)}</div></td>
            <td style={{ ...cell, minWidth: 280 }}>
              <QuantityOverrideActions projectId={projectId} versionId={versionId} costLineId={item.indicatorId} currentQuantity={valueText(item.finalQuantity)} hasOverride={item.isQuantityOverridden} locked={locked} />
            </td>
          </tr>) : <tr><td colSpan={10} style={{ padding: 14, color: '#667085' }}>暂无工程量指标数据。请先在项目指标页维护基础指标，或等待后端返回系统默认指标。</td></tr>}</tbody>
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
