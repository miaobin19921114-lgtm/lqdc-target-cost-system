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
  if (searchParams?.saved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已更新。</div>;
  if (searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已在本项目中，请在概况表已选业态里修改。</div>;
  if (searchParams?.disabled) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已停用，不再作为正常业态使用。</div>;
  if (searchParams?.restored) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态已恢复。</div>;
  if (searchParams?.deleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>无数据业态已删除。</div>;
  if (searchParams?.cannotDelete) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>该业态已有收入或成本数据，不能硬删除，已自动停用。</div>;
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
  const templateGroups = categories.map((category) => ({ category, items: (template?.products || []).filter((item) => item.category === category && !productNames.has(item.name)) })).filter((group) => group.items.length > 0);
  const currentGroups = categories.map((category) => ({ category, items: products.filter((item) => getCategory(item.name, item.remark) === category) })).filter((group) => group.items.length > 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1320 }}>
    <div className="page-header"><div><p className="eyebrow">项目业态维护</p><h1 className="title">{project.name}</h1><p className="subtitle">用于项目创建后补充、停用、恢复或删除业态。已有收入或成本数据的业态只能停用，不能硬删除。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/overview`} className="btn btn-primary">返回概况表</Link><Link href={`/projects/${project.id}`} className="btn">工作台</Link></div></div>
    <StatusMessage searchParams={searchParams} />
    <section className="card" style={{ marginBottom: 14 }}><h2>本项目当前业态</h2><p className="meta">面积、是否可售、是否参与分摊在项目概况表里维护。停用后保留历史数据，不建议参与后续测算。</p>{currentGroups.length ? <div style={{ display: 'grid', gap: 12 }}>{currentGroups.map((group) => <div key={group.category} style={{ border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden' }}><div style={{ background: '#f8fafc', padding: '10px 12px', fontWeight: 900 }}>{group.category}</div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960, fontSize: 13 }}><thead><tr>{['业态', '建筑面积', '计容面积', '可售面积', '销售', '分摊', '数据', '状态', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{group.items.map((item) => <tr key={item.id} style={{ opacity: item.isActive ? 1 : .55 }}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{item.name}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.buildingArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.capacityArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{numberValue(item.saleableArea)}㎡</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isSaleable ? '可售' : '不可售'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.participateAllocation ? '参与' : '不参与'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>收入{item._count.revenues} / 成本{item._count.costs}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{item.isActive ? '启用' : '停用'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.isActive ? <form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="disable" /><button className="btn" style={{ padding: '5px 8px' }}>停用</button></form> : <form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="restore" /><button className="btn" style={{ padding: '5px 8px' }}>恢复</button></form>}<form action={`/api/projects/${project.id}/products/status`} method="post"><input type="hidden" name="productId" value={item.id} /><input type="hidden" name="action" value="delete" /><button className="btn" style={{ padding: '5px 8px', color: '#c92a2a' }}>无数据删除</button></form></div></td></tr>)}</tbody></table></div></div>)}</div> : <p className="meta">暂无业态。</p>}</section>
    <section className="card" style={{ marginBottom: 14 }}><h2>从模板补充业态</h2><p className="meta">已在项目中的业态不会出现在下拉里，避免重复。停用业态可直接恢复，不需要重复新增。</p><form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}><input type="hidden" name="returnPath" value="product-maintenance" /><input type="hidden" name="mode" value="create" /><label>一级分类<select name="category" style={{ width: '100%', height: 36 }}>{templateGroups.map((group) => <option key={group.category} value={group.category}>{group.category}</option>)}</select></label><label>二级业态<select name="name" style={{ width: '100%', height: 36 }}>{templateGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</optgroup>)}</select></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" defaultChecked />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>添加到本项目</button></form></section>
    <section className="card"><h2>新增自定义业态</h2><p className="meta">模板里没有的业态，先归到当前项目分类下。后续可以保存回个人模板。</p><form action={`/api/projects/${project.id}/products`} method="post" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}><input type="hidden" name="returnPath" value="product-maintenance" /><input type="hidden" name="mode" value="create" /><label>一级分类<select name="customCategory" style={{ width: '100%', height: 36 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>自定义业态名称<input name="customName" placeholder="如：叠墅、商业地下夹层" style={{ width: '100%', height: 36 }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>新增自定义业态</button></form></section>
  </div></main>;
}
