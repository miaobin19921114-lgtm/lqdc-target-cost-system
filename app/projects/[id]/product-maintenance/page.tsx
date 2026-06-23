import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getCostSettings } from '@/lib/cost-product-settings';
import { getTaxLiquidationObject, taxLiquidationObjects } from '@/lib/tax-liquidation-object';

export const dynamic = 'force-dynamic';

const costGroups = ['按业态自身', '高层住宅', '洋房住宅', '别墅/合院', '底商/商业', '主楼地下室', '非主楼地下室', '人防地下室', '公共配套/所在主体', '道路总平/景观', '道路总平/围墙出入口', '安装/设备工程', '项目整体共用'];
const productCategories = ['住宅类', '商业类', '车位类', '地下空间', '配套公建', '示范区 / 专项区域', '其他'];
const saleAttributes = ['可售', '不可售', '自持', '人防', '配套', '临时展示'];
const costObjects = ['独立成本对象', '归属住宅', '归属商业', '归属地下室', '归属项目整体', '销售费用'];
const productGroupOrder = productCategories;
const groupNotes: Record<string, string> = {
  '住宅类': '住宅产品通常按建筑面积、可售面积、户数、单元、电梯、标准层等指标测算，并参与住宅收入和住宅类成本分摊。',
  '商业类': '商业产品通常需要单独区分底商、商业街、独立商业、办公公寓等，销售单价、层高、公区装修和税务清算口径不同。',
  '车位类': '车位作为收入产品和税务对象管理；充电桩不作为独立业态，归属地下车位或设备安装工程。',
  '地下空间': '地下空间一般不是销售产品，主要作为成本对象、分摊对象或人防特殊物业处理。',
  '配套公建': '物业、社区、养老、托育、设备用房等多为不可售配套，通常按受益对象或建筑面积分摊。',
  '示范区 / 专项区域': '售楼部、样板间、示范区、庭院、水系、泳池等需要单独识别，后续可区分开发成本或销售费用。',
  '其他': '暂未识别到标准分类，可手动选择产品大类并保存。'
};

type ExtraRow = {
  id: string;
  taxLiquidationObject: string | null;
  incomeTaxCostObject: string | null;
  productCategory: string | null;
  saleAttribute: string | null;
  costObject: string | null;
  clearingObject: string | null;
};

function numberValue(value: unknown) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function categoryOf(name: string, remark?: string | null) {
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1]?.split('\n')[0] || '其他';
  if (['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'].includes(name)) return '住宅类';
  if (['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'].includes(name)) return '商业类';
  if (['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'].includes(name)) return '车位类';
  if (['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'].includes(name)) return '配套公建';
  if (['高层主楼地下室', '洋房主楼地下室', '别墅地下室', '商业地下室', '非主楼纯地库', '人防地下室'].includes(name)) return '地下空间';
  if (['示范区', '售楼部', '样板间', '私家庭院', '下沉庭院', '水系', '游泳池'].includes(name)) return '示范区 / 专项区域';
  return '其他';
}

function inferredGroup(item: { name: string; isSaleable: boolean; remark?: string | null }) {
  const name = item.name || '';
  if (name.startsWith('商业收入-') || name.startsWith('其他收入-')) return '其他';
  if (name.includes('车位') || name.includes('车库') || name.includes('充电桩')) return '车位类';
  if (name.includes('地下室') || name.includes('地库') || name.includes('人防')) return '地下空间';
  const category = categoryOf(name, item.remark);
  if (productGroupOrder.includes(category)) return category;
  if (!item.isSaleable) return '配套公建';
  return '其他';
}

function groupOf(item: { name: string; isSaleable: boolean; remark?: string | null }, extra?: ExtraRow) {
  const saved = extra?.productCategory || '';
  return productGroupOrder.includes(saved) ? saved : inferredGroup(item);
}

function defaultSaleAttribute(item: { isSaleable: boolean; name: string }, extra?: ExtraRow) {
  if (extra?.saleAttribute) return extra.saleAttribute;
  if (item.name.includes('人防')) return '人防';
  return item.isSaleable ? '可售' : '不可售';
}

function defaultCostObject(item: { name: string }, extra?: ExtraRow) {
  if (extra?.costObject) return extra.costObject;
  if (item.name.includes('住宅')) return '归属住宅';
  if (item.name.includes('商业') || item.name.includes('底商')) return '归属商业';
  if (item.name.includes('地下') || item.name.includes('地库') || item.name.includes('车位')) return '归属地下室';
  if (item.name.includes('示范') || item.name.includes('售楼部') || item.name.includes('样板')) return '销售费用';
  return '归属项目整体';
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.classificationSaved === '1') return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>产品专业属性已保存。</div>;
  if (searchParams?.classificationSaved === '0') return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>产品专业属性保存失败，请检查业态状态。</div>;
  if (searchParams?.taxObjectSaved === '1') return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>税务清算对象已保存。</div>;
  if (searchParams?.taxObjectSaved === '0') return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>税务清算对象保存失败，请检查业态状态。</div>;
  if (searchParams?.costSettingsSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>成本测算归属设置已保存。</div>;
  return null;
}

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note ? <div className="meta">{note}</div> : null}</div>;
}

function SelectField({ name, value, options }: { name: string; value: string; options: readonly string[] }) {
  return <select name={name} defaultValue={value} style={{ height: 30, border: '1px solid #d9e2ec', borderRadius: 6, padding: '0 6px' }}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

export default async function ProductMaintenancePage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: { orderBy: { name: 'asc' }, include: { _count: { select: { revenues: true, costs: true } } } } }
  });
  const products = version?.products || [];
  const rows = version ? await prisma.$queryRawUnsafe<ExtraRow[]>('SELECT "id", "taxLiquidationObject", "incomeTaxCostObject", "productCategory", "saleAttribute", "costObject", "clearingObject" FROM "ProductType" WHERE "projectVersionId" = $1', version.id) : [];
  const extraMap = new Map(rows.map((row) => [row.id, row]));
  const groups = productGroupOrder.map((title) => ({ title, items: products.filter((item) => groupOf(item, extraMap.get(item.id)) === title) })).filter((group) => group.items.length > 0);
  const activeCount = products.filter((item) => item.isActive).length;
  const allocationCount = products.filter((item) => item.isActive && item.participateAllocation).length;
  const residentialCount = products.filter((item) => item.isActive && groupOf(item, extraMap.get(item.id)) === '住宅类').length;
  const commercialCount = products.filter((item) => item.isActive && groupOf(item, extraMap.get(item.id)) === '商业类').length;
  const parkingCount = products.filter((item) => item.isActive && groupOf(item, extraMap.get(item.id)) === '车位类').length;
  const supportCount = products.filter((item) => item.isActive && groupOf(item, extraMap.get(item.id)) === '配套公建').length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1680 }}>
    <div className="page-header"><div><p className="eyebrow">项目基础</p><h1 className="title">业态产品 / 税务清算对象</h1><p className="subtitle">按住宅、商业、车位、地下空间、配套公建和示范区分组管理业态产品，并维护产品大类、销售属性、成本对象、清算对象。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">项目概况</Link><Link href={`/projects/${project.id}/construction-standards`} className="btn">建造配置标准</Link><Link href={`/projects/${project.id}/quantity-indicators`} className="btn">工程量指标</Link><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    <StatusMessage searchParams={searchParams} />

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <StatCard label="全部业态" value={products.length} note={`启用 ${activeCount}`} />
      <StatCard label="住宅类" value={residentialCount} note="住宅成本与收入主对象" />
      <StatCard label="商业类" value={commercialCount} note="商业收入和非住宅清算" />
      <StatCard label="车位类" value={parkingCount} note="车位收入/充电桩归属" />
      <StatCard label="配套公建" value={supportCount} note="多为不可售配套" />
      <StatCard label="参与分摊" value={allocationCount} note="参与成本分摊" />
    </div>

    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>使用口径</b><p className="meta" style={{ margin: '6px 0 0' }}>新增专业字段后，产品分组优先读取“产品大类”。清算对象会同步写入原土增税清算字段，保证原税务测算继续可用。</p></section>

    {groups.map((group) => <section key={group.title} className="card" style={{ marginBottom: 14 }}><h2>{group.title}</h2><p className="meta" style={{ marginTop: -4, marginBottom: 10 }}>{groupNotes[group.title]}</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1900, fontSize: 13 }}><thead><tr>{['业态', '面积指标', '销售/分摊', '产品专业属性', '土增税清算对象', '所得税成本对象', '成本测算归属', '历史数据', '状态', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{group.items.map((item) => {
      const extra = extraMap.get(item.id);
      const taxObject = getTaxLiquidationObject({ name: item.name, isSaleable: item.isSaleable, taxLiquidationObject: extra?.taxLiquidationObject || extra?.clearingObject });
      const incomeTaxObject = extra?.incomeTaxCostObject || (item.isSaleable ? item.name : '受益对象/不可售配套');
      const costSetting = getCostSettings(item);
      const groupOptions = Array.from(new Set([costSetting.groupName, item.name, ...costGroups]));
      const productCategory = groupOf(item, extra);
      const saleAttribute = defaultSaleAttribute(item, extra);
      const costObject = defaultCostObject(item, extra);
      return <tr key={item.id} style={{ opacity: item.isActive ? 1 : .55 }}>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{item.name}<div className="meta">识别：{categoryOf(item.name, item.remark)}</div></td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>建面 {numberValue(item.buildingArea)}㎡<div className="meta">可售 {numberValue(item.saleableArea)}㎡</div></td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isSaleable ? '可售' : '不可售'}<div className="meta">{item.participateAllocation ? '参与分摊' : '不参与'}</div></td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><form action={`/api/projects/${project.id}/products/product-classification`} method="post" style={{ display: 'grid', gap: 5, minWidth: 230 }}><input type="hidden" name="productId" value={item.id} /><SelectField name="productCategory" value={productCategory} options={productCategories} /><SelectField name="saleAttribute" value={saleAttribute} options={saleAttributes} /><SelectField name="costObject" value={costObject} options={costObjects} /><SelectField name="clearingObject" value={taxObject} options={taxLiquidationObjects} /><button className="btn" style={{ minHeight: 30 }}>保存专业属性</button></form></td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><form action={`/api/projects/${project.id}/products/tax-liquidation-object`} method="post" style={{ display: 'flex', gap: 6 }}><input type="hidden" name="productId" value={item.id} /><select name="taxLiquidationObject" defaultValue={taxObject} style={{ height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '0 6px' }}>{taxLiquidationObjects.map((option) => <option key={option} value={option}>{option}</option>)}</select><button className="btn" style={{ minHeight: 32 }}>保存</button></form></td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{incomeTaxObject}</td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><form action={`/api/projects/${project.id}/products/cost-settings`} method="post" style={{ display: 'grid', gap: 6, minWidth: 280 }}><input type="hidden" name="productId" value={item.id} /><label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input name="standalone" type="checkbox" value="是" defaultChecked={costSetting.standalone} />独立成本组</label><select name="groupName" defaultValue={costSetting.groupName} style={{ height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '0 6px' }}>{groupOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><button className="btn" style={{ minHeight: 32 }}>保存归属</button><span className="meta">{costSetting.note}</span></form></td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>收入 {item._count.revenues} / 成本 {item._count.costs}</td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isActive ? '启用' : '停用'}</td>
        <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><Link className="btn" href={`/projects/${project.id}/overview`}>回概况维护</Link></td>
      </tr>;
    })}</tbody></table></div></section>)}

    {!products.length ? <section className="card">当前版本暂无业态，请先到项目概况页添加业态。</section> : null}
  </div></main>;
}
