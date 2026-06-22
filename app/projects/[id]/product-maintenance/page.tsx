import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getCostSettings } from '@/lib/cost-product-settings';
import { getTaxLiquidationObject, taxLiquidationObjects } from '@/lib/tax-liquidation-object';

export const dynamic = 'force-dynamic';

const costGroups = ['按业态自身', '高层住宅', '洋房住宅', '别墅/合院', '底商/商业', '主楼地下室', '非主楼地下室', '人防地下室', '公共配套/所在主体', '道路总平/景观', '道路总平/围墙出入口', '安装/设备工程', '项目整体共用'];

function numberValue(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function categoryOf(name: string, remark?: string | null) {
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1]?.split('\n')[0] || '其他';
  if (['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'].includes(name)) return '住宅类';
  if (['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'].includes(name)) return '商业商办';
  if (['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'].includes(name)) return '车位储藏';
  if (['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'].includes(name)) return '配套用房';
  if (['高层主楼地下室', '洋房主楼地下室', '别墅地下室', '商业地下室', '非主楼纯地库', '人防地下室'].includes(name)) return '地下空间';
  if (['示范区', '售楼部', '样板间', '私家庭院', '下沉庭院', '水系', '游泳池'].includes(name)) return '专项区域';
  return '其他';
}

function groupOf(item: { name: string; isSaleable: boolean; remark?: string | null }) {
  const name = item.name || '';
  const category = categoryOf(name, item.remark);
  if (name.includes('人防')) return '人防 / 特殊物业';
  if (category === '车位储藏' || name.includes('车位') || name.includes('车库')) return '车位 / 储藏';
  if (category === '地下空间') return '地下空间';
  if (!item.isSaleable || category === '配套用房') return '不可售 / 配套';
  if (category === '住宅类') return '可售住宅';
  if (category === '商业商办') return '商业商办';
  return '专项 / 其他';
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.taxObjectSaved === '1') return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>税务清算对象已保存。</div>;
  if (searchParams?.taxObjectSaved === '0') return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>税务清算对象保存失败，请检查业态状态。</div>;
  if (searchParams?.costSettingsSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>成本测算归属设置已保存。</div>;
  return null;
}

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note ? <div className="meta">{note}</div> : null}</div>;
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
  const rows = version ? await prisma.$queryRawUnsafe<Array<{ id: string; taxLiquidationObject: string | null; incomeTaxCostObject: string | null }>>('SELECT "id", "taxLiquidationObject", "incomeTaxCostObject" FROM "ProductType" WHERE "projectVersionId" = $1', version.id) : [];
  const extraMap = new Map(rows.map((row) => [row.id, row]));
  const groups = ['可售住宅', '商业商办', '车位 / 储藏', '地下空间', '人防 / 特殊物业', '不可售 / 配套', '专项 / 其他'].map((title) => ({ title, items: products.filter((item) => groupOf(item) === title) })).filter((group) => group.items.length > 0);
  const activeCount = products.filter((item) => item.isActive).length;
  const saleableCount = products.filter((item) => item.isActive && item.isSaleable).length;
  const allocationCount = products.filter((item) => item.isActive && item.participateAllocation).length;
  const parkingCount = products.filter((item) => item.name.includes('车位') || item.name.includes('车库')).length;
  const supportCount = products.filter((item) => !item.isSaleable || categoryOf(item.name, item.remark) === '配套用房').length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1520 }}>
    <div className="page-header"><div><p className="eyebrow">项目基础</p><h1 className="title">业态产品 / 税务清算对象</h1><p className="subtitle">这里管理业态产品、销售属性、成本分摊属性、土增税清算对象和所得税成本对象。充电桩不作为独立业态，归属地下车位或安装设备工程。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">项目概况</Link><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    <StatusMessage searchParams={searchParams} />

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <StatCard label="全部业态" value={products.length} note={`启用 ${activeCount}`} />
      <StatCard label="可售业态" value={saleableCount} note="参与收入测算" />
      <StatCard label="参与分摊" value={allocationCount} note="参与成本分摊" />
      <StatCard label="车位/地库" value={parkingCount} note="充电桩归属车位" />
      <StatCard label="配套/不可售" value={supportCount} note="税务常归不可售配套" />
    </div>

    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>使用口径</b><p className="meta" style={{ margin: '6px 0 0' }}>土增税清算对象按普通住宅、非普通住宅、非住宅商业、车位、办公公寓、不可售配套、人防特殊物业分类；所得税成本对象暂按业态或受益对象展示。成本明细按“成本测算归属”判断是否作为独立成本组。</p></section>

    {groups.map((group) => <section key={group.title} className="card" style={{ marginBottom: 14 }}><h2>{group.title}</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1680, fontSize: 13 }}><thead><tr>{['业态', '建筑面积', '可售面积', '销售属性', '分摊属性', '土增税清算对象', '所得税成本对象', '成本测算归属', '历史数据', '状态', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{group.items.map((item) => {
      const extra = extraMap.get(item.id);
      const taxObject = getTaxLiquidationObject({ name: item.name, isSaleable: item.isSaleable, taxLiquidationObject: extra?.taxLiquidationObject });
      const incomeTaxObject = extra?.incomeTaxCostObject || (item.isSaleable ? item.name : '受益对象/不可售配套');
      const costSetting = getCostSettings(item);
      const groupOptions = Array.from(new Set([costSetting.groupName, item.name, ...costGroups]));
      return <tr key={item.id} style={{ opacity: item.isActive ? 1 : .55 }}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{item.name}<div className="meta">{categoryOf(item.name, item.remark)}</div></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.buildingArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.saleableArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isSaleable ? '可售' : '不可售'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.participateAllocation ? '参与分摊' : '不参与'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><form action={`/api/projects/${project.id}/products/tax-liquidation-object`} method="post" style={{ display: 'flex', gap: 6 }}><input type="hidden" name="productId" value={item.id} /><select name="taxLiquidationObject" defaultValue={taxObject} style={{ height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '0 6px' }}>{taxLiquidationObjects.map((option) => <option key={option} value={option}>{option}</option>)}</select><button className="btn" style={{ minHeight: 32 }}>保存</button></form></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{incomeTaxObject}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><form action={`/api/projects/${project.id}/products/cost-settings`} method="post" style={{ display: 'grid', gap: 6, minWidth: 280 }}><input type="hidden" name="productId" value={item.id} /><label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input name="standalone" type="checkbox" value="是" defaultChecked={costSetting.standalone} />独立成本组</label><select name="groupName" defaultValue={costSetting.groupName} style={{ height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '0 6px' }}>{groupOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><button className="btn" style={{ minHeight: 32 }}>保存归属</button><span className="meta">{costSetting.note}</span></form></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>收入 {item._count.revenues} / 成本 {item._count.costs}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isActive ? '启用' : '停用'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><Link className="btn" href={`/projects/${project.id}/overview`}>回概况维护</Link></td></tr>;
    })}</tbody></table></div></section>)}

    {!products.length ? <section className="card">当前版本暂无业态，请先到项目概况页添加业态。</section> : null}
  </div></main>;
}
