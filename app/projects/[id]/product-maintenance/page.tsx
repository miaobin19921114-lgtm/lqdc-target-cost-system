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
  '住宅类': '住宅产品通常按建筑面积、可售面积、户数、单元、电梯、标准层等指标测算。',
  '商业类': '商业产品需要区分销售、租赁、自持、公区装修和非住宅清算口径。',
  '车位类': '车位作为收入产品和税务对象管理；充电桩不作为独立业态。',
  '地下空间': '地下空间主要作为成本对象、分摊对象或人防特殊物业处理。',
  '配套公建': '物业、社区、养老、托育、设备用房等多为不可售配套。',
  '示范区 / 专项区域': '售楼部、样板间、示范区等可后续区分开发成本或销售费用。',
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

function safeAnchor(text: string) {
  return encodeURIComponent(text.replace(/\s+/g, '-'));
}

function categoryOf(name: string, remark?: string | null) {
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1]?.split('\n')[0] || '其他';
  if (['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'].includes(name)) return '住宅类';
  if (['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'].includes(name)) return '商业类';
  if (['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'].includes(name)) return '车位类';
  if (['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'].includes(name)) return '配套公建';
  if (['高层主楼地下室', '小高层主楼地下室', '洋房主楼地下室', '叠拼/联排地下室', '别墅/合院地下室', '商业地下室', '非主楼纯地库', '人防地下室'].includes(name)) return '地下空间';
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
  if (item.name.includes('住宅') || item.name.includes('高层') || item.name.includes('洋房') || item.name.includes('合院')) return '归属住宅';
  if (item.name.includes('商业') || item.name.includes('底商') || item.name.includes('商铺')) return '归属商业';
  if (item.name.includes('地下') || item.name.includes('地库') || item.name.includes('车位')) return '归属地下室';
  if (item.name.includes('示范') || item.name.includes('售楼部') || item.name.includes('样板')) return '销售费用';
  return '归属项目整体';
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.organized === '1') return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>已一键整理业态结构：空白专业属性已补齐，并已检查对应地下室。</div>;
  if (searchParams?.organized === '0') return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>一键整理失败，请检查当前版本状态。</div>;
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

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'blue' | 'orange' | 'red' }) {
  const styleMap = {
    neutral: { background: '#f2f4f7', color: '#475467', border: '#d0d5dd' },
    green: { background: '#f0fff4', color: '#2b8a3e', border: '#b2f2bb' },
    blue: { background: '#e7f5ff', color: '#0b7285', border: '#a5d8ff' },
    orange: { background: '#fff4e6', color: '#d9480f', border: '#ffd8a8' },
    red: { background: '#fff5f5', color: '#c92a2a', border: '#ffc9c9' }
  }[tone];
  return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${styleMap.border}`, background: styleMap.background, color: styleMap.color, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{children}</span>;
}

function SelectField({ name, value, options }: { name: string; value: string; options: readonly string[] }) {
  return <select name={name} defaultValue={value} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px', background: '#fff', width: '100%' }}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: '#667085', fontWeight: 700, marginBottom: 4 }}>{children}</div>;
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
  const basementCount = products.filter((item) => item.isActive && groupOf(item, extraMap.get(item.id)) === '地下空间').length;
  const supportCount = products.filter((item) => item.isActive && groupOf(item, extraMap.get(item.id)) === '配套公建').length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1480 }}>
    <div className="page-header"><div><p className="eyebrow">项目基础</p><h1 className="title">业态产品 / 税务清算对象</h1><p className="subtitle">卡片式管理业态产品。优先维护产品大类、销售属性、成本对象、清算对象，面积指标仍回项目概况维护。</p></div><div className="actions" style={{ marginTop: 0 }}><form action={`/api/projects/${project.id}/products/organize`} method="post"><button className="btn btn-primary">一键整理业态结构</button></form><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}/construction-standards`} className="btn">建造配置标准</Link><Link href={`/projects/${project.id}/quantity-indicators`} className="btn">工程量指标</Link><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    <StatusMessage searchParams={searchParams} />

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <StatCard label="全部业态" value={products.length} note={`启用 ${activeCount}`} />
      <StatCard label="住宅类" value={residentialCount} note="住宅成本与收入" />
      <StatCard label="商业类" value={commercialCount} note="商业与非住宅" />
      <StatCard label="车位类" value={parkingCount} note="车位收入/充电桩归属" />
      <StatCard label="地下空间" value={basementCount} note="主楼地下室/地库/人防" />
      <StatCard label="配套公建" value={supportCount} note="不可售配套" />
      <StatCard label="参与分摊" value={allocationCount} note="成本分摊对象" />
    </div>

    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}>
      <b>页面口径</b>
      <p className="meta" style={{ margin: '6px 0 10px' }}>现在按“产品大类”分组展示。点击“一键整理业态结构”，会补齐空白专业属性，并检查是否缺少对应地下室；不会覆盖你已经手动保存过的专业字段。</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{groups.map((group) => <a key={group.title} href={`#${safeAnchor(group.title)}`} className="btn" style={{ minHeight: 32 }}>{group.title}（{group.items.length}）</a>)}</div>
    </section>

    {groups.map((group) => <section id={safeAnchor(group.title)} key={group.title} className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div><h2 style={{ marginBottom: 4 }}>{group.title}</h2><p className="meta" style={{ margin: 0 }}>{groupNotes[group.title]}</p></div>
        <Badge tone="blue">{group.items.length} 个业态</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12, marginTop: 14 }}>
        {group.items.map((item) => {
          const extra = extraMap.get(item.id);
          const taxObject = getTaxLiquidationObject({ name: item.name, isSaleable: item.isSaleable, taxLiquidationObject: extra?.taxLiquidationObject || extra?.clearingObject });
          const incomeTaxObject = extra?.incomeTaxCostObject || (item.isSaleable ? item.name : '受益对象/不可售配套');
          const costSetting = getCostSettings(item);
          const groupOptions = Array.from(new Set([costSetting.groupName, item.name, ...costGroups]));
          const productCategory = groupOf(item, extra);
          const saleAttribute = defaultSaleAttribute(item, extra);
          const costObject = defaultCostObject(item, extra);
          const statusTone = item.isActive ? 'green' : 'red';
          const saleTone = item.isSaleable ? 'blue' : saleAttribute === '人防' ? 'orange' : 'neutral';

          return <article key={item.id} style={{ background: '#fff', border: '1px solid #d9e2ec', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div><h3 style={{ margin: 0, fontSize: 18 }}>{item.name}</h3><div className="meta" style={{ marginTop: 5 }}>系统识别：{categoryOf(item.name, item.remark)}</div></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}><Badge tone={statusTone}>{item.isActive ? '启用' : '停用'}</Badge><Badge tone={saleTone}>{saleAttribute}</Badge></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 9 }}><div className="meta">建筑面积</div><b>{numberValue(item.buildingArea)}㎡</b></div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 9 }}><div className="meta">可售面积</div><b>{numberValue(item.saleableArea)}㎡</b></div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 9 }}><div className="meta">历史数据</div><b>收入 {item._count.revenues} / 成本 {item._count.costs}</b></div>
            </div>

            <form action={`/api/projects/${project.id}/products/product-classification`} method="post" style={{ background: '#fbfdff', border: '1px solid #e6eef7', borderRadius: 12, padding: 12 }}>
              <input type="hidden" name="productId" value={item.id} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <label><FieldLabel>产品大类</FieldLabel><SelectField name="productCategory" value={productCategory} options={productCategories} /></label>
                <label><FieldLabel>销售属性</FieldLabel><SelectField name="saleAttribute" value={saleAttribute} options={saleAttributes} /></label>
                <label><FieldLabel>成本对象</FieldLabel><SelectField name="costObject" value={costObject} options={costObjects} /></label>
                <label><FieldLabel>清算对象</FieldLabel><SelectField name="clearingObject" value={taxObject} options={taxLiquidationObjects} /></label>
              </div>
              <div className="actions" style={{ marginTop: 10 }}><button className="btn btn-primary" style={{ minHeight: 32 }}>保存专业属性</button><Link className="btn" href={`/projects/${project.id}/overview`}>回概况维护</Link></div>
            </form>

            <form action={`/api/projects/${project.id}/products/cost-settings`} method="post" style={{ background: '#fffaf0', border: '1px solid #ffe8cc', borderRadius: 12, padding: 12 }}>
              <input type="hidden" name="productId" value={item.id} />
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}><input name="standalone" type="checkbox" value="是" defaultChecked={costSetting.standalone} />独立成本组</label>
                <select name="groupName" defaultValue={costSetting.groupName} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px', background: '#fff' }}>{groupOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              </div>
              <div className="meta" style={{ marginTop: 7 }}>所得税成本对象：{incomeTaxObject}；{costSetting.note}</div>
              <div className="actions" style={{ marginTop: 10 }}><button className="btn" style={{ minHeight: 32 }}>保存成本归属</button></div>
            </form>
          </article>;
        })}
      </div>
    </section>)}

    {!products.length ? <section className="card">当前版本暂无业态，请先到项目概况页添加业态。</section> : null}
  </div></main>;
}
