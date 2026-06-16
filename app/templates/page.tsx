import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const categories = ['住宅类', '商业商办', '车位储藏', '配套用房', '地下空间', '专项区域', '其他'];

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.personalTemplate) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>已复制为你的个人模板，后续编辑只保存到个人名下，不会修改系统默认模板。</div>;
  if (searchParams?.productSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态模板已保存到个人模板。</div>;
  if (searchParams?.productUpdated) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人业态模板已更新。</div>;
  if (searchParams?.productDisabled) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>个人业态模板已停用，后续新建项目不会再默认显示。</div>;
  if (searchParams?.productRestored) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人业态模板已恢复。</div>;
  if (searchParams?.productDeleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人业态模板已删除。</div>;
  if (searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>业态名称重复，请调整后再保存。</div>;
  return null;
}

export default async function TemplatesPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const userId = cookies().get('lqdc_session')?.value || '';
  const templates = await prisma.template.findMany({
    where: userId ? { OR: [{ ownerId: null }, { ownerId: userId }] } : { ownerId: null },
    orderBy: [{ ownerId: 'desc' }, { sortOrder: 'asc' }],
    include: { products: { orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { sortOrder: 'asc' }] }, costRules: { orderBy: { sortOrder: 'asc' } }, taxRules: { orderBy: { sortOrder: 'asc' } } }
  });

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">模板中心</p><h1 className="title">系统模板 / 个人模板</h1><p className="subtitle">系统默认模板只读。个人修改业态、科目、税率时，会先复制为个人模板，所有更改只保存在个人名下。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn">项目列表</Link><Link href="/projects/new" className="btn btn-primary">用模板新建项目</Link></div></div>
    <StatusMessage searchParams={searchParams} />
    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>模板保护规则</b><p className="meta" style={{ margin: '6px 0 0' }}>系统默认模板不能被任何个人直接改动。点击“复制为我的模板”后，系统会生成一份个人模板；以后新增、停用、修改业态都只影响你的个人模板。</p></section>
    {templates.length === 0 ? <section className="card"><h2>暂无模板</h2><p className="meta">部署迁移完成后会自动生成“住宅开发目标成本标准模板”。</p></section> : <div style={{ display: 'grid', gap: 16 }}>{templates.map((tpl) => {
      const canEdit = !!userId && tpl.ownerId === userId;
      const activeProducts = tpl.products.filter((item) => item.isActive);
      const disabledProducts = tpl.products.filter((item) => !item.isActive);
      return <section key={tpl.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}><div><span className="badge">{canEdit ? '我的模板' : '系统只读模板'}</span><h2 style={{ marginTop: 10 }}>{tpl.name}</h2><p className="meta">{tpl.description || '暂无说明'}</p></div><div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}><div className="stat"><div className="stat-label">启用/停用/规则/税率</div><div className="stat-value">{activeProducts.length}/{disabledProducts.length}/{tpl.costRules.length}/{tpl.taxRules.length}</div></div><Link className="btn" href={`/templates/${tpl.id}/rules`}>{canEdit ? '编辑科目/税率规则' : '查看科目/税率规则'}</Link>{!canEdit && userId ? <form action="/api/templates/products" method="post"><input type="hidden" name="action" value="copy" /><input type="hidden" name="templateId" value={tpl.id} /><button className="btn btn-primary">复制为我的模板后编辑</button></form> : null}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
          {canEdit ? <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>新增业态模板</b><p className="meta">新增后进入你的个人业态库，新建项目时可直接选择。</p><form action="/api/templates/products" method="post" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px 120px 120px', gap: 10, alignItems: 'end' }}><input type="hidden" name="action" value="create" /><input type="hidden" name="templateId" value={tpl.id} /><label>分类<select name="category" style={{ width: '100%', height: 36 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>业态名称<input name="name" required placeholder="如：叠墅" style={{ width: '100%', height: 36 }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" defaultChecked />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><label>权重<input name="allocationWeight" type="number" step="0.01" defaultValue="1" style={{ width: '100%', height: 36 }} /></label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>新增到我的模板</button></form></div> : null}
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>{canEdit ? '启用业态模板' : '启用业态模板（只读）'}</b><p className="meta">{canEdit ? '修改分类、可售、分摊和权重；停用后不会进入新项目初始化。' : '系统默认业态仅展示，个人需先复制后才能修改。'}</p><div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{activeProducts.length ? activeProducts.map((p) => canEdit ? <form key={p.id} action="/api/templates/products" method="post" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 90px 80px 90px 80px', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f3f5', paddingBottom: 8 }}><input type="hidden" name="action" value="update" /><input type="hidden" name="templateId" value={tpl.id} /><input type="hidden" name="productId" value={p.id} /><select name="category" defaultValue={p.category} style={{ height: 34 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><input name="name" defaultValue={p.name} style={{ height: 34 }} /><label style={{ display: 'flex', gap: 6 }}><input name="isSaleable" type="checkbox" defaultChecked={p.isSaleable} />可售</label><label style={{ display: 'flex', gap: 6 }}><input name="participateAllocation" type="checkbox" defaultChecked={p.participateAllocation} />分摊</label><input name="allocationWeight" type="number" step="0.01" defaultValue={fmt(p.allocationWeight)} style={{ height: 34 }} /><input name="sortOrder" type="number" defaultValue={p.sortOrder} style={{ height: 34 }} /><button className="btn">保存</button><button className="btn" name="action" value="disable" style={{ color: '#c92a2a' }}>停用</button></form> : <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 90px', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f3f5', paddingBottom: 8 }}><span className="meta">{p.category}</span><b>{p.name}</b><span>{p.isSaleable ? '可售' : '不可售'}</span><span>{p.participateAllocation ? '分摊' : '不分摊'}</span><span>权重{fmt(p.allocationWeight)}</span></div>) : <p className="meta">暂无启用业态。</p>}</div></div>
          {canEdit && disabledProducts.length ? <div style={{ border: '1px solid #ffe8cc', borderRadius: 10, padding: 12, background: '#fff9f1' }}><b>停用业态模板</b><p className="meta">停用业态不参与新项目初始化，可恢复或删除。</p><div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{disabledProducts.map((p) => <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px 90px', gap: 8, alignItems: 'center', borderBottom: '1px solid #ffe8cc', paddingBottom: 8 }}><span className="meta">{p.category}</span><b>{p.name}</b><form action="/api/templates/products" method="post"><input type="hidden" name="action" value="restore" /><input type="hidden" name="productId" value={p.id} /><button className="btn btn-primary">恢复</button></form><form action="/api/templates/products" method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="productId" value={p.id} /><button className="btn" style={{ color: '#c92a2a' }}>删除</button></form></div>)}</div></div> : null}
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div><b>科目/税率概览</b><p className="meta" style={{ margin: '4px 0 0' }}>科目规则 {tpl.costRules.length} 条；税率规则 {tpl.taxRules.length} 条。系统默认科目和税率只读，个人编辑自动写入个人模板。</p></div><Link className="btn btn-primary" href={`/templates/${tpl.id}/rules`}>{canEdit ? '编辑规则' : '查看规则'}</Link></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 10 }}><div>{tpl.costRules.slice(0, 8).map((r) => <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f3f5' }}><b>{r.subjectName}</b><div className="meta">{r.sourceTable || '-'} · {r.measureBasis || '-'}</div></div>)}</div><div>{tpl.taxRules.map((r) => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f3f5' }}><span>{r.name}</span><b>{Number(r.rate) * 100}%</b></div>)}</div></div></div>
        </div></section>;
    })}</div>}
  </div></main>;
}
