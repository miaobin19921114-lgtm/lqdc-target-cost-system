import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const categories = ['住宅类', '商业商办', '车位储藏', '配套用房', '地下空间', '专项区域', '其他'];

function getCategory(name: string, remark?: string | null) {
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1] || '其他';
  if (['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'].includes(name)) return '住宅类';
  if (['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'].includes(name)) return '商业商办';
  if (['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'].includes(name)) return '车位储藏';
  if (['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'].includes(name)) return '配套用房';
  if (['高层主楼地下室', '洋房主楼地下室', '别墅地下室', '商业地下室', '非主楼纯地库', '人防地下室'].includes(name)) return '地下空间';
  if (['示范区', '售楼部', '样板间', '私家庭院', '下沉庭院', '水系', '游泳池'].includes(name)) return '专项区域';
  return '其他';
}

function numberValue(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.templateSaved && searchParams?.saved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已新增，并已保存回默认模板，后续新项目可复用。</div>;
  if (searchParams?.templateSaved && searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已在本项目中，未重复添加；但已保存回默认模板。</div>;
  if (searchParams?.templateSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>自定义业态已保存回默认模板。</div>;
  if (searchParams?.saved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已更新。</div>;
  if (searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已在本项目中，请在概况表已选业态里修改；如已停用，请直接恢复，不要重复新增。</div>;
  if (searchParams?.disabled) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已停用，不再参与销售、分摊和后续测算。</div>;
  if (searchParams?.restored) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已恢复，并已自动恢复参与分摊。</div>;
  if (searchParams?.restoredWithHistory) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已恢复。检测到历史收入/成本数据，已自动恢复参与分摊；有可售面积或收入记录的业态同步恢复为可售。</div>;
  if (searchParams?.deleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>无数据业态已删除。</div>;
  if (searchParams?.cannotDelete) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已有收入或成本数据，不能硬删除，已自动停用。后续如继续使用，建议点“恢复”。</div>;
  return null;
}

export default async function ProductMaintenancePage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: { orderBy: { name: 'asc' }, include: { _count: { select: { revenues: true, costs: true } } } } }
  });
  const template = await prisma.template.findFirst({ where: { isDefault: true }, include: { products: { orderBy: { sortOrder: 'asc' } } } });
  const products = version?.products || [];
  const productNames = new Set(products.map((item) => item.name));
  const activeCount = products.filter((item) => item.isActive).length;
  const disabledCount = products.length - activeCount;
  const withHistoryCount = products.filter((item) => item._count.revenues > 0 || item._count.costs > 0).length;
  const templateProductCount = template?.products.length || 0;
  const templateGroups = categories.map((category) => ({ category, items: (template?.products || []).filter((item) => item.category === category && !productNames.has(item.name)) })).filter((group) => group.items.length > 0);
  const currentGroups = categories.map((category) => ({ category, items: products.filter((item) => getCategory(item.name, item.remark) === category) })).filter((group) => group.items.length > 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1320 }}>
    <div className="page-header"><div><p className="eyebrow">项目业态维护</p><h1 className="title">{project.name}</h1><p className="subtitle">用于项目创建后补充、停用、恢复或删除业态。自定义业态可保存回默认模板，后续新项目复用。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">返回概况表</Link><Link href="/templates" className="btn">模板中心</Link><Link href={`/projects/${project.id}`} className="btn">工作台</Link></div></div>
    <StatusMessage searchParams={searchParams} />
    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">启用业态</div><div className="stat-value">{activeCount}</div></div><div className="stat"><div className="stat-label">停用业态</div><div className="stat-value">{disabledCount}</div></div><div className="stat"><div className="stat-label">有历史数据</div><div className="stat-value">{withHistoryCount}</div></div><div className="stat"><div className="stat-label">模板业态库</div><div className="stat-value">{templateProductCount}</div></div></div>
    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>操作规则</b><p className="meta" style={{ margin: '6px 0 0' }}>无历史收入/成本的业态可以直接删除；已有历史数据的业态只能停用或恢复。恢复时系统会自动恢复“参与分摊”。新增自定义业态时勾选“保存回默认模板”，以后新建项目可直接从模板选择。</p></section>
    <section className="card" style={{ marginBottom: 14 }}><h2>本项目当前业态</h2><p className="meta">面积、是否可售、是否参与分摊在项目概况表里维护。停用后保留历史数据，不参与后续测算；恢复后再进入概况表核对面积和口径。</p>{currentGroups.length ? <div style={{ display: 'grid', gap: 12 }}>{currentGroups.map((group) => <div key={group.category} style={{ border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden' }}><div style={{ background: '#f8fafc', padding: '10px 12px', fontWeight: 900 }}>{group.category}</div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1060, fontSize: 13 }}><thead><tr>{['业态', '建筑面积', '计容面积', '可售面积', '销售', '分摊', '历史数据', '状态', '建议', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{group.items.map((item) => { const hasHistory = item._count.revenues > 0 || item._count.costs > 0; const suggestion = !item.isActive && hasHistory ? '建议恢复' : !item.isActive ? '可删除' : hasHistory ? '保留使用' : '可调整'; return <tr key={item.id} style={{ opacity: item.isActive ? 1 : .55 }}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{item.name}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.buildingArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.capacityArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.saleableArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isSaleable ? '可售' : '不可售'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.participateAllocation ? '参与' : '不参与'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>收入{item._count.revenues} / 成本{item._count.costs}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', color: item.isActive ? '#2f9e44' : '#f08c00', fontWeight: 900 }}>{item.isActive ? '启用' : '停用'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{suggestion}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.isActive ? <form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="disable" /><button className="btn" style={{ padding: '5px 8px' }}>停用</button></form> : <form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="restore" /><button className="btn btn-primary" style={{ padding: '5px 8px' }}>恢复</button></form>}<form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="delete" /><button className="btn" style={{ padding: '5px 8px', color: '#c92a2a' }}>{hasHistory ? '有数据停用' : '无数据删除'}</button></form></div></td></tr>; })}</tbody></table></div></div>)}</div> : <p className="meta">暂无业态。</p>}</section>
    <section className="card" style={{ marginBottom: 14 }}><h2>从模板补充业态</h2><p className="meta">已在项目中的业态不会出现在下拉里，避免重复。停用业态可直接恢复，不需要重复新增。</p><form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}><input type="hidden" name="returnPath" value="product-maintenance" /><input type="hidden" name="mode" value="create" /><label>一级分类<select name="category" style={{ width: '100%', height: 36 }}>{templateGroups.map((group) => <option key={group.category} value={group.category}>{group.category}</option>)}</select></label><label>二级业态<select name="name" style={{ width: '100%', height: 36 }}>{templateGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</optgroup>)}</select></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" defaultChecked />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>添加到本项目</button></form></section>
    <section className="card"><h2>新增自定义业态</h2><p className="meta">模板里没有的业态，先归到当前项目分类下；勾选后可同步沉淀到默认模板。</p><form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}><input type="hidden" name="returnPath" value="product-maintenance" /><input type="hidden" name="mode" value="create" /><label>一级分类<select name="customCategory" style={{ width: '100%', height: 36 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>自定义业态名称<input name="customName" placeholder="如：叠墅、商业地下夹层" style={{ width: '100%', height: 36 }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1', color: '#475467' }}><input name="saveToTemplate" type="checkbox" defaultChecked />保存回默认模板，以后新建项目可复用</label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>新增自定义业态</button></form></section>
  </div></main>;
}
