import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getCostSettings } from '@/lib/cost-product-settings';

export const dynamic = 'force-dynamic';

const categories = ['住宅类', '商业商办', '车位储藏', '配套用房', '地下空间', '专项区域', '其他'];
const costGroups = ['按业态自身', '高层住宅', '洋房住宅', '别墅/合院', '底商/商业', '主楼地下室', '非主楼地下室', '人防地下室', '公共配套/所在主体', '道路总平/景观', '道路总平/围墙出入口', '安装/设备工程', '项目整体共用'];

function getCategory(name: string, remark?: string | null) {
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1]?.split('\n')[0] || '其他';
  if (['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'].includes(name)) return '住宅类';
  if (['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'].includes(name)) return '商业商办';
  if (['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'].includes(name)) return '车位储藏';
  if (['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'].includes(name)) return '配套用房';
  if (['高层主楼地下室', '洋房主楼地下室', '别墅地下室', '商业地下室', '非主楼纯地库', '人防地下室'].includes(name)) return '地下空间';
  if (['示范区', '售楼部', '样板间', '私家庭院', '下沉庭院', '水系', '游泳池'].includes(name)) return '专项区域';
  return '其他';
}

function numberValue(value: unknown) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function isTemplatePresetProduct(remark?: string | null) { return String(remark || '').includes('模板业态｜'); }

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.costSettingsSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>成本测算归属设置已保存。</div>;
  if (searchParams?.defaultProtected) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>默认预留业态不允许硬删除，已自动改为停用；以后需要时可恢复。</div>;
  if (searchParams?.templateSaved && searchParams?.saved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>业态已新增，并已保存回默认模板，后续新项目可复用。</div>;
  if (searchParams?.templateSaved && searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已在本项目中，未重复添加；但已保存回默认模板。</div>;
  if (searchParams?.templateSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>自定义业态已保存回默认模板。</div>;
  if (searchParams?.saved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>业态已更新。</div>;
  if (searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已在本项目中，请在概况表已选业态里修改；如已停用，请直接恢复，不要重复新增。</div>;
  if (searchParams?.disabled) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>业态已停用，不再参与销售、分摊和后续测算。</div>;
  if (searchParams?.restored) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>业态已恢复，并已自动恢复参与分摊。</div>;
  if (searchParams?.restoredWithHistory) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>业态已恢复。检测到历史收入/成本数据，已自动恢复参与分摊；有可售面积或收入记录的业态同步恢复为可售。</div>;
  if (searchParams?.deleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>无数据自定义业态已删除。</div>;
  if (searchParams?.cannotDelete) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已有收入或成本数据，不能硬删除，已自动停用。后续如继续使用，建议点“恢复”。</div>;
  return null;
}

export default async function ProductMaintenancePage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: { orderBy: { name: 'asc' }, include: { _count: { select: { revenues: true, costs: true } } } } }
  });
  const template = await prisma.template.findFirst({ where: { isDefault: true }, include: { products: { orderBy: { sortOrder: 'asc' } } } });
  const products = version?.products || [];
  const productNames = new Set(products.map((item) => item.name));
  const activeCount = products.filter((item) => item.isActive).length;
  const disabledCount = products.length - activeCount;
  const saleableCount = products.filter((item) => item.isActive && item.isSaleable).length;
  const allocationCount = products.filter((item) => item.isActive && item.participateAllocation).length;
  const withHistoryCount = products.filter((item) => item._count.revenues > 0 || item._count.costs > 0).length;
  const templateProductCount = template?.products.length || 0;
  const templateGroups = categories.map((category) => ({ category, items: (template?.products || []).filter((item) => item.category === category && !productNames.has(item.name)) })).filter((group) => group.items.length > 0);
  const currentGroups = categories.map((category) => ({ category, items: products.filter((item) => getCategory(item.name, item.remark) === category) })).filter((group) => group.items.length > 0);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1420 }}>
    <div className="page-header"><div><p className="eyebrow">项目基础</p><h1 className="title">业态维护</h1><p className="subtitle">维护项目产品/业态范围：默认业态库不增不减；可配置是否作为专业成本单独测算对象。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">项目概况</Link><Link href={`/projects/${project.id}/indicator-check`} className="btn">指标校验</Link><Link href="/templates" className="btn">模板中心</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>
    <StatusMessage searchParams={searchParams} />
    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">当前版本</div><div className="stat-value" style={{ fontSize: 18 }}>{version?.name || '暂无'}</div></div><div className="stat"><div className="stat-label">启用业态</div><div className="stat-value">{activeCount}</div></div><div className="stat"><div className="stat-label">可售 / 分摊</div><div className="stat-value">{saleableCount} / {allocationCount}</div></div><div className="stat"><div className="stat-label">停用 / 有历史</div><div className="stat-value">{disabledCount} / {withHistoryCount}</div></div><div className="stat"><div className="stat-label">模板业态库</div><div className="stat-value">{templateProductCount}</div></div></div>
    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>地产口径说明</b><p className="meta" style={{ margin: '6px 0 0' }}>业态是收入和面积对象；专业成本明细按工程成本对象展示。储藏室、物业社区用房、地下车位、地上车位等保留业态，但默认归属到主楼地下室、非主楼地下室、道路景观或公共配套，不单独生成专业成本组；特殊项目可手动改为单独测算。</p></section>
    <section className="card" style={{ marginBottom: 14, borderColor: '#ffe8cc', background: '#fff9f1' }}><b>操作规则</b><p className="meta" style={{ margin: '6px 0 0' }}>默认预留业态只能停用或恢复，不能硬删除；自定义业态无历史数据时可以删除。有历史收入/成本数据的业态只能停用，确保历史测算可追溯。</p></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>本项目当前业态</h2><p className="meta">“成本测算设置”只影响专业明细表的分组展示和归属，不改变业态本身。</p>{currentGroups.length ? <div style={{ display: 'grid', gap: 12 }}>{currentGroups.map((group) => <div key={group.category} style={{ border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden' }}><div style={{ background: '#f8fafc', padding: '10px 12px', fontWeight: 900 }}>{group.category}</div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1500, fontSize: 13 }}><thead><tr>{['业态', '建筑面积', '可售面积', '销售属性', '分摊属性', '成本测算设置', '历史数据', '当前状态', '处理建议', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{group.items.map((item) => {
      const hasHistory = item._count.revenues > 0 || item._count.costs > 0;
      const isPreset = isTemplatePresetProduct(item.remark);
      const suggestion = !item.isActive && isPreset ? '默认业态，可恢复' : !item.isActive && hasHistory ? '有历史，建议仅恢复或继续停用' : !item.isActive ? '无历史自定义，可删除' : isPreset ? '默认业态，建议只停用不删除' : hasHistory ? '已使用，谨慎停用' : '自定义业态可调整';
      const costSetting = getCostSettings(item);
      const groupOptions = Array.from(new Set([costSetting.groupName, item.name, ...costGroups]));
      const deleteLabel = isPreset ? '默认仅停用' : hasHistory ? '有数据停用' : '无数据删除';
      return <tr key={item.id} style={{ opacity: item.isActive ? 1 : .55 }}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{item.name}<div className="meta">{isPreset ? '默认预留业态' : '自定义业态'}</div></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.buildingArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.saleableArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isSaleable ? '可售' : '不可售'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.participateAllocation ? '参与分摊' : '不参与'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', minWidth: 310 }}><form action={`/api/projects/${project.id}/products/cost-settings`} method="post" style={{ display: 'grid', gridTemplateColumns: '88px 1fr 52px', gap: 6 }}><input type="hidden" name="productId" value={item.id} /><select name="standalone" defaultValue={costSetting.standalone ? '是' : '否'} style={{ height: 32 }}><option value="是">单独</option><option value="否">归属</option></select><select name="groupName" defaultValue={costSetting.groupName} style={{ height: 32 }}>{groupOptions.map((option) => <option key={option} value={option === '按业态自身' ? item.name : option}>{option}</option>)}</select><button className="btn" style={{ padding: '4px 6px' }}>保存</button><div className="meta" style={{ gridColumn: '1 / -1' }}>{costSetting.note}</div></form></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>收入{item._count.revenues} / 成本{item._count.costs}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', color: item.isActive ? '#2f9e44' : '#f08c00', fontWeight: 900 }}>{item.isActive ? '启用' : '停用'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{suggestion}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.isActive ? <form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="disable" /><button className="btn" style={{ padding: '5px 8px' }}>停用</button></form> : <form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="restore" /><button className="btn btn-primary" style={{ padding: '5px 8px' }}>恢复</button></form>}<form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="delete" /><button className="btn" style={{ padding: '5px 8px', color: '#c92a2a' }}>{deleteLabel}</button></form></div></td></tr>;
    })}</tbody></table></div></div>)}</div> : <p className="meta">暂无业态。</p>}</section>

    <section className="card" style={{ marginBottom: 14 }}><h2>从模板补充业态</h2><p className="meta">已在项目中的业态不会出现在下拉里，避免重复；停用业态请直接恢复，不要重复新增。</p><form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}><input type="hidden" name="returnPath" value="product-maintenance" /><input type="hidden" name="mode" value="create" /><label>一级分类<select name="category" style={{ width: '100%', height: 36 }}>{templateGroups.map((group) => <option key={group.category} value={group.category}>{group.category}</option>)}</select></label><label>二级业态<select name="name" style={{ width: '100%', height: 36 }}>{templateGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</optgroup>)}</select></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" defaultChecked />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>添加到本项目</button></form></section>
    <section className="card"><h2>新增自定义业态</h2><p className="meta">模板里没有的业态，先归到当前项目分类下；勾选后可沉淀到默认模板，后续新项目复用。</p><form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}><input type="hidden" name="returnPath" value="product-maintenance" /><input type="hidden" name="mode" value="create" /><label>一级分类<select name="customCategory" style={{ width: '100%', height: 36 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>自定义业态名称<input name="customName" placeholder="如：叠墅、商业地下夹层" style={{ width: '100%', height: 36 }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1', color: '#475467' }}><input name="saveToTemplate" type="checkbox" defaultChecked />保存回默认模板，以后新建项目可复用</label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>新增自定义业态</button></form></section>
  </div></main>;
}
