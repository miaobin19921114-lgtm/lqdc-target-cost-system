import Link from 'next/link';
import type { ReactNode } from 'react';
import { CityDistrictSelect } from '@/components/city-district-select';
import { OverviewRoadValidation } from '@/components/overview-road-validation';
import { ProductScopeSelect } from '@/components/product-scope-select';
import { getProductTypeImpact } from '@/lib/product-type-service';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Field = readonly [string, string, 'text' | 'number'];
type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  productCategory: string | null;
  remark: string | null;
  isActive: boolean;
  isSaleable: boolean;
  participateAllocation: boolean;
  buildingArea: unknown;
  capacityArea: unknown;
  saleableArea: unknown;
  nonSaleableArea: unknown;
  allocationWeight: unknown;
  taxLiquidationObject?: string | null;
  clearingObject?: string | null;
};
type ImpactRow = Awaited<ReturnType<typeof getProductTypeImpact>>;

const productGroups = [
  { category: '住宅类', names: ['高层住宅', '小高层住宅', '洋房', '叠拼', '合院', '别墅'] },
  { category: '商业及经营类', names: ['底商', '集中商业', '商业街', '公寓', '办公', '酒店'] },
  { category: '地下及车位类', names: ['地下车库', '地下车位', '人防车位', '非人防车位', '立体车位', '充电桩车位'] },
  { category: '配套及不可售类', names: ['物业用房', '社区用房', '会所', '架空层', '幼儿园', '配建用房', '移交用房'] },
  { category: '特殊条件类', names: ['人防', '装配式', '采暖', '精装修', '古建 / 仿古建筑', '示范区', '售楼处', '样板间'] }
] as const;

const categoryAlias: Record<string, string> = {
  住宅类: '住宅类',
  住宅: '住宅类',
  商业类: '商业及经营类',
  商业商办: '商业及经营类',
  商业: '商业及经营类',
  车位类: '地下及车位类',
  车位储藏: '地下及车位类',
  地下空间: '地下及车位类',
  '地下室/车位': '地下及车位类',
  配套公建: '配套及不可售类',
  配套用房: '配套及不可售类',
  专项区域: '特殊条件类',
  '示范区 / 专项区域': '特殊条件类'
};

const nameAlias: Record<string, string> = {
  洋房住宅: '洋房',
  '叠拼/联排': '叠拼',
  别墅合院: '别墅',
  '别墅/合院': '别墅',
  中式合院: '合院',
  独立商业: '集中商业',
  商业综合体: '集中商业',
  '公寓/LOFT': '公寓',
  写字楼: '办公',
  地下产权车位: '地下车位',
  地下使用权车位: '地下车位',
  非主楼纯地库: '地下车库',
  人防地下室: '人防',
  物业管理用房: '物业用房',
  售楼部: '售楼处'
};

const projectFields: Field[] = [
  ['name', '项目名称', 'text'],
  ['landArea', '地块面积', 'number'],
  ['landAreaMu', '地块面积（亩）', 'number'],
  ['redLineArea', '占地面积', 'number'],
  ['totalBuildingArea', '总建筑面积', 'number'],
  ['capacityBuildingArea', '计容建筑面积', 'number'],
  ['aboveGroundArea', '地上建筑面积', 'number'],
  ['undergroundArea', '地下建筑面积', 'number'],
  ['saleableArea', '可售面积', 'number'],
  ['nonSaleableArea', '不可售面积', 'number'],
  ['buildingCount', '楼栋数量', 'number'],
  ['unitCount', '单元数量', 'number'],
  ['householdCount', '户数', 'number'],
  ['basementFloors', '地下室层数', 'number'],
  ['basementFloorHeight', '地下一层层高', 'number'],
  ['baseArea', '建筑基底面积', 'number']
];

const landscapeFields: Field[] = [
  ['landscapeArea', '景观面积', 'number'],
  ['hardscapeArea', '硬景面积', 'number'],
  ['softscapeArea', '软景面积（绿化面积）', 'number'],
  ['elevatedFloorLandscapeArea', '人行通道面积', 'number'],
  ['roadArea', '车行道路面积', 'number'],
  ['fireRoadArea', '其中消防道路面积', 'number'],
  ['sitePerimeter', '周界长度', 'number'],
  ['waterFeatureArea', '围墙长度', 'number'],
  ['gateCount', '出入口数量', 'number']
];

const facadeFields: Field[] = [
  ['facadeArea', '外立面面积', 'number'],
  ['windowArea', '门窗面积', 'number'],
  ['railingLength', '栏杆长度', 'number'],
  ['insulationArea', '百叶面积', 'number']
];

const basementFields: Field[] = [
  ['undergroundArea', '地下建筑面积', 'number'],
  ['basementParkingArea', '地下车库面积', 'number'],
  ['civilDefenseArea', '人防面积', 'number'],
  ['nonCivilDefenseArea', '非人防面积', 'number'],
  ['waterproofArea', '地下室防水面积', 'number'],
  ['mainBuildingUndergroundArea', '地下室地坪面积', 'number']
];

const fitoutFields: Field[] = [
  ['householdCount', '户数', 'number'],
  ['parkingCount', '套数', 'number'],
  ['standardFloorArea', '户型面积', 'number'],
  ['temporaryFacilityArea', '厨房面积', 'number'],
  ['childrenActivityArea', '卫生间面积', 'number'],
  ['publicArea', '户内精装面积', 'number'],
  ['lobbyArea', '公区精装面积', 'number'],
  ['salesOfficeArea', '大堂面积', 'number']
];

const specialFields: Field[] = [
  ['pileFoundationArea', '装配式面积', 'number'],
  ['roofArea', '采暖面积', 'number'],
  ['earthworkVolume', '古建面积', 'number'],
  ['siteLevelingArea', '示范区面积', 'number'],
  ['salesOfficeArea', '售楼处面积', 'number'],
  ['showFlatArea', '样板间面积', 'number'],
  ['chargingPileCount', '充电桩数量', 'number']
];

const formField = { height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', background: '#fff' };
const readonlyField = { ...formField, background: '#f2f4f7', color: '#667085' };
const tableInput = { width: '100%', minWidth: 82, height: 30, border: '1px solid #d9e2ec', borderRadius: 5, padding: '3px 6px' };
const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const yesNo = [['true', '启用'], ['false', '不启用']] as const;

function valueOf(project: any, name: string) {
  const value = project[name];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return String(value);
}

function n(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function fmt(value: unknown) {
  return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '未配置';
  return typeof value === 'string' ? value : fmt(value);
}

function normalizedName(name: string) {
  return nameAlias[name] || name;
}

function getRemarkCategory(remark?: string | null) {
  if (!remark?.includes('模板业态｜')) return '';
  return remark.split('模板业态｜')[1]?.split(/[；\n]/)[0] || '';
}

function getProductCategory(product: ProductRow) {
  const byName = productGroups.find((group) => group.names.some((name) => normalizedName(product.name).includes(name) || name.includes(normalizedName(product.name))));
  if (byName) return byName.category;
  const source = product.productCategory || product.category || getRemarkCategory(product.remark);
  return categoryAlias[source || ''] || '特殊条件类';
}

function productRank(product: ProductRow) {
  const category = getProductCategory(product);
  const groupIndex = productGroups.findIndex((group) => group.category === category);
  const nameIndex = productGroups[groupIndex]?.names.findIndex((name) => normalizedName(product.name).includes(name) || name.includes(normalizedName(product.name))) ?? 99;
  return (groupIndex < 0 ? 99 : groupIndex) * 100 + (nameIndex < 0 ? 99 : nameIndex);
}

function isVirtualRevenueProduct(name: string) {
  return name.startsWith('商业收入-') || name.startsWith('其他收入-');
}

function hasAnyBusinessData(impact: ImpactRow | undefined) {
  return Boolean(impact?.hasIncomeData || impact?.hasCostData || impact?.hasAllocationData || impact?.hasTaxData || impact?.hasProfitData || impact?.hasExcelImportData);
}

function inputFor(project: any, [name, label, type]: Field, locked: boolean, props?: Record<string, unknown>) {
  const style = locked ? readonlyField : formField;
  return <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>
    {label}
    <input form="overview-form" name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={valueOf(project, name)} disabled={locked} style={style} {...props} />
  </label>;
}

function readOnlyItem(label: string, value: ReactNode, note?: string) {
  return <div style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fbfdff', padding: 10 }}>
    <div className="meta">{label}</div>
    <b>{value}</b>
    {note ? <div className="meta">{note}</div> : null}
  </div>;
}

function FieldGrid({ project, fields, locked }: { project: any; fields: readonly Field[]; locked: boolean }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>{fields.map((field) => inputFor(project, field, locked))}</div>;
}

function SelectFor({ project, name, label, options, defaultValue, locked }: { project: any; name: string; label: string; options: readonly (readonly [string, string])[]; defaultValue?: string; locked: boolean }) {
  const value = valueOf(project, name) || defaultValue || options[0]?.[0] || '';
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>
    {label}
    <select form="overview-form" name={name} defaultValue={value} disabled={locked} style={locked ? readonlyField : formField}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  </label>;
}

function Block({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return <section style={{ border: '1px solid #d9e2ec', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
    <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div><h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>{note ? <p className="meta" style={{ margin: '5px 0 0' }}>{note}</p> : null}</div>
      {action}
    </div>
    <div style={{ padding: 14 }}>{children}</div>
  </section>;
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'blue' | 'orange' | 'red' }) {
  const styleMap = {
    neutral: { background: '#f2f4f7', color: '#475467', border: '#d0d5dd' },
    green: { background: '#f0fff4', color: '#2b8a3e', border: '#b2f2bb' },
    blue: { background: '#e7f5ff', color: '#0b7285', border: '#a5d8ff' },
    orange: { background: '#fff4e6', color: '#d9480f', border: '#ffd8a8' },
    red: { background: '#fff5f5', color: '#c92a2a', border: '#ffc9c9' }
  }[tone];
  return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${styleMap.border}`, background: styleMap.background, color: styleMap.color, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{children}</span>;
}

function TooltipStyles() {
  return <style>{`
    .overview-tooltip {
      position: relative;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      margin-left: 4px;
    }
    .overview-tooltip__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      background: #f8fafc;
      color: #475467;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      cursor: help;
      outline: none;
    }
    .overview-tooltip__icon:focus {
      box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.16);
      border-color: #67b7c7;
    }
    .overview-tooltip__bubble {
      position: absolute;
      z-index: 20;
      left: 50%;
      bottom: calc(100% + 8px);
      transform: translateX(-50%);
      width: max-content;
      max-width: 260px;
      padding: 7px 9px;
      border-radius: 6px;
      background: #111827;
      color: #fff;
      font-size: 12px;
      line-height: 1.5;
      font-weight: 500;
      white-space: normal;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.2);
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    .overview-tooltip__bubble::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: #111827;
    }
    .overview-tooltip:hover .overview-tooltip__bubble,
    .overview-tooltip:focus-within .overview-tooltip__bubble {
      opacity: 1;
      visibility: visible;
    }
  `}</style>;
}

function Tooltip({ text }: { text: string }) {
  return <span className="overview-tooltip">
    <span className="overview-tooltip__icon" tabIndex={0} aria-label={text}>?</span>
    <span className="overview-tooltip__bubble" role="tooltip">{text}</span>
  </span>;
}

function ProductStatusBadges({ product, impact, locked }: { product: ProductRow; impact?: ImpactRow; locked: boolean }) {
  const hasData = hasAnyBusinessData(impact) || Boolean(impact?.hasOverviewData);
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    <Badge tone={product.isActive ? 'green' : 'red'}>{product.isActive ? '已启用' : '已停用'}</Badge>
    {hasData ? <Badge tone="orange">已有数据</Badge> : null}
    {locked ? <Badge tone="red">已锁定不可调整</Badge> : null}
  </div>;
}

function ProductTable({ rows, impacts, locked, projectId, versionId, showActions = false }: { rows: ProductRow[]; impacts: Map<string, ImpactRow>; locked: boolean; projectId: string; versionId?: string; showActions?: boolean }) {
  return <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showActions ? 720 : 600, fontSize: 12, tableLayout: 'fixed' }}>
      <thead><tr>{['业态', '分类', '属性', '状态', ...(showActions ? ['操作'] : [])].map((head, index) => <th key={head} style={{ ...cell, width: index === 0 ? '25%' : index === 1 ? '19%' : index === 2 ? '21%' : showActions && index === 4 ? 86 : 'auto', textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={showActions ? 5 : 4} style={{ padding: 14, color: '#667085' }}>暂无业态。</td></tr> : rows.map((product) => {
          const impact = impacts.get(product.id);
          const cannotDisableReason = impact?.blockedReason || (hasAnyBusinessData(impact) ? '该业态已有业务数据，不能停用。' : '');
          return <tr key={product.id}>
            <td style={{ ...cell, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</td>
            <td style={{ ...cell, overflow: 'hidden', textOverflow: 'ellipsis' }}>{getProductCategory(product)}</td>
            <td style={cell}><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><Badge tone={product.isSaleable ? 'blue' : 'neutral'}>{product.isSaleable ? '可售' : '不可售'}</Badge><Badge tone={product.participateAllocation ? 'green' : 'neutral'}>{product.participateAllocation ? '成本对象' : '不分摊'}</Badge></div></td>
            <td style={cell}><ProductStatusBadges product={product} impact={impact} locked={locked} />{cannotDisableReason && product.isActive ? <div className="meta" style={{ marginTop: 5, color: '#c92a2a', display: 'inline-flex', alignItems: 'center', maxWidth: 140, whiteSpace: 'nowrap' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>不可停用</span><Tooltip text={cannotDisableReason} /></div> : null}</td>
            {showActions ? <td style={{ ...cell, width: 86 }}>
              {locked ? <span className="meta">版本锁定，禁止调整</span> : product.isActive ? <form action={`/api/projects/${projectId}/products/status`} method="post">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="action" value="disable" />
                <input type="hidden" name="operationReason" value="概况页业态增减维护" />
                <button className="btn" disabled={!impact?.canDisable} style={{ minHeight: 28, padding: '4px 10px' }}>停用</button>
              </form> : <form action={`/api/projects/${projectId}/products/status`} method="post">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="action" value="restore" />
                <input type="hidden" name="operationReason" value="概况页业态增减维护" />
                <button className="btn btn-primary" disabled={!versionId} style={{ minHeight: 28, padding: '4px 10px' }}>恢复</button>
              </form>}
            </td> : null}
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

function ProductMetricTable({ rows, locked, projectId }: { rows: ProductRow[]; locked: boolean; projectId: string }) {
  return <>
    <form id="overview-products-form" action={`/api/projects/${projectId}/products/batch`} method="post" />
    <input form="overview-products-form" type="hidden" name="rowCount" value={rows.length} />
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040, fontSize: 12 }}>
        <thead><tr>{['业态', '建筑面积', '计容面积', '可售面积', '不可售面积', '分摊权重', '销售', '分摊', '备注'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={9} style={{ padding: 14, color: '#667085' }}>暂无启用业态。</td></tr> : rows.map((product, index) => <tr key={product.id}>
            <td style={{ ...cell, fontWeight: 900 }}>
              <input form="overview-products-form" type="hidden" name={`productId-${index}`} value={product.id} />
              <input form="overview-products-form" type="hidden" name={`name-${index}`} value={product.name} />
              {product.name}
              <div className="meta">{getProductCategory(product)}</div>
            </td>
            <td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`buildingArea-${index}`} type="number" step="0.01" defaultValue={n(product.buildingArea) || ''} disabled={locked} style={locked ? { ...tableInput, background: '#f2f4f7' } : tableInput} /></td>
            <td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`capacityArea-${index}`} type="number" step="0.01" defaultValue={n(product.capacityArea) || ''} disabled={locked} style={locked ? { ...tableInput, background: '#f2f4f7' } : tableInput} /></td>
            <td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`saleableArea-${index}`} type="number" step="0.01" defaultValue={n(product.saleableArea) || ''} disabled={locked} style={locked ? { ...tableInput, background: '#f2f4f7' } : tableInput} /></td>
            <td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`nonSaleableArea-${index}`} type="number" step="0.01" defaultValue={n(product.nonSaleableArea) || ''} disabled={locked} style={locked ? { ...tableInput, background: '#f2f4f7' } : tableInput} /></td>
            <td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`allocationWeight-${index}`} type="number" step="0.01" defaultValue={n(product.allocationWeight) || 1} disabled={locked} style={{ ...(locked ? { ...tableInput, background: '#f2f4f7' } : tableInput), minWidth: 70 }} /></td>
            <td style={{ ...cell, textAlign: 'center' }}><input form="overview-products-form" name={`isSaleable-${index}`} type="checkbox" defaultChecked={product.isSaleable} disabled={locked} /></td>
            <td style={{ ...cell, textAlign: 'center' }}><input form="overview-products-form" name={`participateAllocation-${index}`} type="checkbox" defaultChecked={product.participateAllocation} disabled={locked} /></td>
            <td style={{ ...cell, padding: 0 }}><input form="overview-products-form" name={`remark-${index}`} defaultValue={product.remark || ''} disabled={locked} style={{ ...(locked ? { ...tableInput, background: '#f2f4f7' } : tableInput), minWidth: 170 }} /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}

function MetricCard({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
  return <div className="stat" style={{ minHeight: 78 }}><div className="stat-label">{label}</div><div className="stat-value">{display(value)}{unit || ''}</div></div>;
}

export default async function ProjectOverviewPage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({ where: activeVersionWhere(project), orderBy: activeVersionOrder(project), include: { products: true } });
  const locked = version ? isVersionLocked(version) : false;
  const allProducts = [...((version?.products || []) as ProductRow[])].filter((item) => !isVirtualRevenueProduct(item.name)).sort((a, b) => productRank(a) - productRank(b) || a.name.localeCompare(b.name, 'zh-CN'));
  const activeProducts = allProducts.filter((item) => item.isActive);
  const disabledProducts = allProducts.filter((item) => !item.isActive);
  const impacts = new Map<string, ImpactRow>();
  await Promise.all(allProducts.map(async (product) => impacts.set(product.id, version ? await getProductTypeImpact(version.id, product.id) : null)));

  const activeNames = new Set(allProducts.map((item) => normalizedName(item.name)));
  const addableGroups = productGroups.map((group) => ({ ...group, names: group.names.filter((name) => !activeNames.has(name)) })).filter((group) => group.names.length > 0);
  const productBuildingArea = activeProducts.reduce((sum, row) => sum + n(row.buildingArea), 0);
  const productSaleableArea = activeProducts.reduce((sum, row) => sum + n(row.saleableArea), 0);
  const productCapacityArea = activeProducts.reduce((sum, row) => sum + n(row.capacityArea), 0);
  const saleableProducts = activeProducts.filter((row) => row.isSaleable);
  const scopeProductNames = activeProducts.map((item) => item.name);
  const disabledReasonCount = activeProducts.filter((item) => impacts.get(item.id)?.canDisable === false).length;
  const landPrice = version ? await prisma.costLine.findFirst({
    where: { projectVersionId: version.id, OR: [{ detailName: { contains: '土地价款' } }, { detailName: { contains: '土地出让' } }, { costSubject: { name: { contains: '土地价款' } } }] },
    include: { costSubject: true },
    orderBy: { sortOrder: 'asc' }
  }).catch(() => null) : null;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <TooltipStyles />
    <OverviewRoadValidation />
    <div className="page-header" style={{ alignItems: 'flex-start' }}>
      <div>
        <p className="eyebrow">V1 概况页</p>
        <h1 className="title">项目概况</h1>
        <p className="subtitle">按测算逻辑分为业态产品、建造标准、项目概况、工程量指标。默认只显示启用业态，停用业态保留历史但不参与当前页面展示。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <button form="overview-form" className="btn btn-primary" disabled={locked}>保存概况</button>
        <a href="#product-maintenance" className="btn">业态增减维护</a>
        <Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本测算</Link>
        <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
      </div>
    </div>

    {locked ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>当前测算版本已锁定，不能调整业态。如需修改，请复制新版本后操作。</div> : null}
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>项目概况已保存。</div> : null}
    {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>当前版本已锁定，本次保存或业态调整未执行。</div> : null}
    {searchParams?.productSaved ? <div className="card" style={{ marginBottom: 14, borderColor: searchParams.productSaved === '1' ? '#b2f2bb' : '#ffd8a8', background: searchParams.productSaved === '1' ? '#f0fff4' : '#fff9db' }}>业态维护结果：{searchParams.productSaved === '1' ? '已保存。' : searchParams.productSaved === 'duplicate' ? '该业态已存在。' : searchParams.productSaved === 'disabled' ? '该业态在已停用区，请使用恢复启用。' : '未完成。'}</div> : null}

    <form id="overview-form" action={`/api/projects/${project.id}/overview`} method="post" />

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <MetricCard label="启用业态" value={activeProducts.length} />
      <MetricCard label="已停用业态" value={disabledProducts.length} />
      <MetricCard label="总建筑面积" value={project.totalBuildingArea} unit="㎡" />
      <MetricCard label="可售面积" value={project.saleableArea} unit="㎡" />
      <MetricCard label="车行/消防道路" value={`${fmt(project.roadArea)} / ${fmt(project.fireRoadArea)}`} unit="㎡" />
      <MetricCard label="软景面积（绿化面积）" value={project.softscapeArea || project.greenArea} unit="㎡" />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Block title="一、业态维护" note="仅保留业态新增、停用、恢复入口；指标录入放在下方主区域。" action={<Link href={`/projects/${project.id}/product-maintenance`} className="btn">完整维护页</Link>}>
        <div id="product-maintenance" />
        {locked ? <div style={{ border: '1px solid #ffc9c9', background: '#fff5f5', borderRadius: 8, padding: 10, marginBottom: 12 }}>当前测算版本已锁定，不能调整业态。如需修改，请复制新版本后操作。</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          {readOnlyItem('启用业态', activeProducts.length)}
          {readOnlyItem('可售业态', saleableProducts.length)}
          {readOnlyItem('启用业态建筑面积合计', `${fmt(productBuildingArea)}㎡`)}
          {readOnlyItem('启用业态可售面积合计', `${fmt(productSaleableArea)}㎡`)}
          {readOnlyItem('有数据不可停用业态', disabledReasonCount)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: 12, alignItems: 'start' }}>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}>
            <summary style={{ cursor: 'pointer', padding: 10, background: '#f8fafc', fontWeight: 900 }}>当前启用业态 <span className="meta">{activeProducts.length} 个</span><Tooltip text="当前参与本页指标录入和测算展示的业态。" /></summary>
            <div style={{ padding: 8 }}><ProductTable rows={activeProducts} impacts={impacts} locked={locked} projectId={project.id} versionId={version?.id} showActions /></div>
          </details>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <details style={{ border: '1px solid #ffe8cc', borderRadius: 8, background: '#fffaf0' }}>
              <summary style={{ cursor: 'pointer', padding: 10, fontWeight: 900 }}>已停用业态 <span className="meta">{disabledProducts.length} 个</span><Tooltip text="停用不是删除，历史记录保留，默认不参与当前测算展示。" /></summary>
              <div style={{ padding: 8 }}><ProductTable rows={disabledProducts} impacts={impacts} locked={locked} projectId={project.id} versionId={version?.id} showActions /></div>
            </details>
            <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}>
              <summary style={{ cursor: 'pointer', padding: 10, fontWeight: 900 }}>可新增业态<Tooltip text="从预设业态中新增，新增后到下方业态指标录入区填写面积。" /></summary>
              <div style={{ padding: 10 }}>
                <form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 9 }}>
                  <input type="hidden" name="returnPath" value="overview" />
                  <input type="hidden" name="mode" value="create" />
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>可新增业态
                    <select name="customName" required disabled={locked || addableGroups.length === 0} defaultValue="" style={locked ? readonlyField : formField}>
                      <option value="" disabled>{addableGroups.length ? '请选择业态' : '暂无可新增业态'}</option>
                      {addableGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.names.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>业态分类
                    <select name="customCategory" disabled={locked} defaultValue="住宅类" style={locked ? readonlyField : formField}>{productGroups.map((group) => <option key={group.category} value={group.category}>{group.category}</option>)}</select>
                  </label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}><input name="isSaleable" type="checkbox" disabled={locked} />可售</label>
                    <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}><input name="participateAllocation" type="checkbox" defaultChecked disabled={locked} />成本对象</label>
                  </div>
                  <button className="btn btn-primary" disabled={locked || addableGroups.length === 0}>新增业态</button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </Block>

      <Block title="二、业态指标录入" note="启用业态的面积、可售、成本分摊指标在这里集中录入。" action={<button form="overview-products-form" className="btn btn-primary" disabled={locked}>保存业态指标</button>}>
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680, fontSize: 13 }}>
            <thead><tr>{['口径', '概况表总控', '启用业态合计', '差异'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #d9e2ec', color: '#667085', background: '#fbfdff' }}>{head}</th>)}</tr></thead>
            <tbody>{[['建筑面积', n(project.totalBuildingArea), productBuildingArea], ['计容面积', n(project.capacityBuildingArea), productCapacityArea], ['可售面积', n(project.saleableArea), productSaleableArea]].map(([name, overview, product]) => <tr key={String(name)}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{name}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(overview)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{fmt(product)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', color: Math.abs(Number(overview) - Number(product)) > 1 ? '#e03131' : '#2f9e44', fontWeight: 900 }}>{fmt(Number(overview) - Number(product))}㎡</td></tr>)}</tbody>
          </table>
        </div>
        <ProductMetricTable rows={activeProducts} locked={locked} projectId={project.id} />
      </Block>

      <Block title="三、其他概况字段" note="项目基础数据、建造标准和工程量指标。">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}>
            <summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>建造标准</summary>
            <div style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <SelectFor project={project} name="residentialFitoutStandard" label="交付标准" options={[['毛坯', '毛坯'], ['精装', '精装'], ['公区精装', '公区精装'], ['户内精装', '户内精装']]} defaultValue="毛坯" locked={locked} />
          <SelectFor project={project} name="commercialPublicFitoutStandard" label="外立面标准" options={[['涂料', '涂料'], ['真石漆', '真石漆'], ['铝板', '铝板'], ['石材', '石材'], ['玻璃幕墙', '玻璃幕墙']]} defaultValue="涂料" locked={locked} />
          <SelectFor project={project} name="shopDeliveryStandard" label="门窗标准" options={[['普通铝合金', '普通铝合金'], ['断桥铝', '断桥铝'], ['系统窗', '系统窗']]} defaultValue="普通铝合金" locked={locked} />
          <SelectFor project={project} name="basementQualityStandard" label="景观标准" options={[['低配', '低配'], ['标准', '标准'], ['高配', '高配']]} defaultValue="标准" locked={locked} />
          <SelectFor project={project} name="undergroundLobbyFitoutStandard" label="车库标准" options={[['普通车库', '普通车库'], ['品质车库', '品质车库'], ['立体车库', '立体车库']]} defaultValue="普通车库" locked={locked} />
          <SelectFor project={project} name="residentialPublicFitoutStandard" label="智能化标准" options={[['基础', '基础'], ['标准', '标准'], ['高配', '高配']]} defaultValue="基础" locked={locked} />
        </div>
        <details style={{ border: '1px solid #e6eef7', borderRadius: 8, marginTop: 14, background: '#fbfdff' }}>
          <summary style={{ cursor: 'pointer', padding: 12, fontWeight: 900 }}>专项配置开关</summary>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <SelectFor project={project} name="isPrefabricated" label="是否启用装配式" options={yesNo} defaultValue="false" locked={locked} />
              <SelectFor project={project} name="residentialFitoutDelivery" label="是否启用精装修" options={yesNo} defaultValue="false" locked={locked} />
              <SelectFor project={project} name="commercialPublicFitout" label="是否启用人防" options={yesNo} defaultValue="false" locked={locked} />
              <SelectFor project={project} name="heatingEnabled" label="是否启用采暖" options={yesNo} defaultValue="false" locked={locked} />
              <SelectFor project={project} name="propertyFitout" label="是否启用古建" options={yesNo} defaultValue="false" locked={locked} />
              <SelectFor project={project} name="chargingSeparateCostMeasure" label="是否启用充电桩" options={yesNo} defaultValue="true" locked={locked} />
              <SelectFor project={project} name="hasSalesOffice" label="是否启用示范区" options={yesNo} defaultValue="false" locked={locked} />
            </div>
            {project.isPrefabricated ? <FieldGrid project={project} fields={[['pileFoundationArea', '装配式面积', 'number']]} locked={locked} /> : null}
            {project.residentialFitoutDelivery ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{inputFor(project, ['publicArea', '精装面积', 'number'], locked)}<SelectFor project={project} name="residentialFitoutType" label="精装标准" options={[['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装']]} defaultValue="硬装" locked={locked} /></div> : null}
            {project.commercialPublicFitout ? <FieldGrid project={project} fields={[['civilDefenseArea', '人防面积', 'number'], ['civilDefenseParkingCount', '人防车位数量', 'number']]} locked={locked} /> : null}
            {project.heatingEnabled ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{inputFor(project, ['roofArea', '采暖面积', 'number'], locked)}<ProductScopeSelect name="heatingScope" label="采暖受益业态" products={scopeProductNames} value={project.heatingScope} note="从当前启用业态中选择。" disabled={locked} /></div> : null}
            {project.propertyFitout ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{inputFor(project, ['earthworkVolume', '古建面积', 'number'], locked)}<SelectFor project={project} name="salesOfficeFitoutType" label="古建标准" options={[['低配', '低配'], ['标准', '标准'], ['高配', '高配']]} defaultValue="标准" locked={locked} /></div> : null}
            {project.chargingSeparateCostMeasure ? <FieldGrid project={project} fields={[['chargingPileCount', '充电桩数量', 'number'], ['chargingPileRatio', '配建比例', 'number']]} locked={locked} /> : null}
          </div>
        </details>
            </div>
          </details>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}>
            <summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>项目概况</summary>
            <div style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
          <CityDistrictSelect city={project.city} district={project.district} disabled={locked} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 }}>
          {readOnlyItem('所在地区', `${project.city || '未配置'}${project.district ? ` / ${project.district}` : ''}`)}
          {readOnlyItem('项目类型', '未配置', 'V1 当前未设置独立保存字段')}
          {readOnlyItem('开发模式', '未配置', 'V1 当前未设置独立保存字段')}
          {readOnlyItem('测算版本', version?.name || '暂无版本')}
          {readOnlyItem('土地价款', landPrice ? `${fmt(landPrice.taxInclusiveAmount)}万元` : '未配置', '来源于土地费明细')}
          {readOnlyItem('地下二层层高', '未配置', 'V1 当前未设置独立保存字段')}
          {readOnlyItem('其他地下层平均层高', '未配置', 'V1 当前未设置独立保存字段')}
        </div>
        <FieldGrid project={project} fields={projectFields} locked={locked} />
            </div>
          </details>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}>
            <summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>工程量指标</summary>
            <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}>
            <summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>场地景观道路围墙指标</summary>
            <div style={{ padding: 12 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>{landscapeFields.map((field) => inputFor(project, field, locked, field[0] === 'fireRoadArea' ? { max: valueOf(project, 'roadArea') } : undefined))}</div><p className="meta" style={{ margin: '8px 0 0' }}>前端校验：消防道路面积不得大于当前车行道路面积；软景/绿化只保留一个输入。</p></div>
          </details>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>外立面及门窗指标</summary><div style={{ padding: 12 }}><FieldGrid project={project} fields={facadeFields} locked={locked} /></div></details>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>地下室指标</summary><div style={{ padding: 12 }}><FieldGrid project={project} fields={basementFields} locked={locked} /></div></details>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>户型及精装指标</summary><div style={{ padding: 12 }}><FieldGrid project={project} fields={fitoutFields} locked={locked} /></div></details>
          <details open style={{ border: '1px solid #e6eef7', borderRadius: 8, background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 12, background: '#f8fafc', fontWeight: 900 }}>专项基础指标</summary><div style={{ padding: 12 }}><FieldGrid project={project} fields={specialFields} locked={locked} /></div></details>
        </div>
            </div>
          </details>
        </div>
      </Block>

      <Block title="备注与口径说明" note="记录本项目特殊口径、暂估说明、后续复核事项。">
        <textarea form="overview-form" name="remark" defaultValue={project.remark || ''} disabled={locked} style={{ width: '100%', minHeight: 90, border: '1px solid #d9e2ec', borderRadius: 8, padding: 10, background: locked ? '#f2f4f7' : '#fff' }} />
      </Block>
    </div>
  </div></main>;
}
