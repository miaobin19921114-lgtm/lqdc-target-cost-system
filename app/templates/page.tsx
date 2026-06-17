import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const categories = ['住宅类', '商业商办', '车位储藏', '配套用房', '地下空间', '专项区域', '其他'];

const systemTemplateGroups = [
  { title: '项目测算模板', desc: '用于新建项目时快速套用项目结构、业态、税率和基础规则。', items: ['住宅开发测算模板', '商业开发测算模板', '产业园测算模板', '旧改/代建测算模板'] },
  { title: '目标成本模板', desc: '用于沉淀成本科目、目标成本层级、测算依据和单方指标。', items: ['目标成本科目模板', '业态成本模板', '地区成本模板', '档次成本模板'] },
  { title: '合约招采模板', desc: '用于沉淀合约台账、招采计划、清标分析和付款计划表单。', items: ['合同台账模板', '招采计划模板', '付款计划模板', '清标分析模板'] },
  { title: '审批流程模板', desc: '用于沉淀投决、目标成本、招采、合同、付款审批表和风控项。', items: ['投决审批模板', '目标成本审批模板', '招采审批模板', '合同审批模板'] },
  { title: '报告输出模板', desc: '用于沉淀经营报告、投决报告、敏感性报告、税务报告输出格式。', items: ['经营报告模板', '投决报告模板', '敏感性报告模板', '税务报告模板'] },
  { title: 'AI提示词模板', desc: '用于沉淀成本复核、招标文件审查、合同风险审查、报告生成提示词。', items: ['成本复核提示词', '招标文件审查提示词', '合同风险审查提示词', '报告生成提示词'] }
] as const;

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function sourceLabel(tpl: any, canEdit: boolean) {
  if (tpl.sourceProjectName) return `来源项目：${tpl.sourceProjectName}`;
  if (tpl.baseTemplateId) return '来源系统模板/上级模板副本';
  return canEdit ? '来源：个人新建模板' : '来源：系统默认模板';
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.templateDefaulted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>已设置为默认个人模板。以后新建项目会优先显示它。</div>;
  if (searchParams?.templateCopied) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>模板已复制到你的个人模板。</div>;
  if (searchParams?.templateRenamed) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人模板已重命名。</div>;
  if (searchParams?.templateDeleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人模板已删除。</div>;
  if (searchParams?.systemTemplateReadonly) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>系统模板只读，不能直接修改或设为个人默认。请先复制为个人模板。</div>;
  if (searchParams?.personalTemplate) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>已复制为你的个人模板，后续编辑只保存到个人名下，不会修改系统默认模板。</div>;
  if (searchParams?.productSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>业态模板已保存到个人模板。</div>;
  if (searchParams?.productUpdated) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人业态模板已更新。</div>;
  if (searchParams?.productDisabled) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>个人业态模板已停用，后续新建项目不会再默认显示。</div>;
  if (searchParams?.productRestored) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人业态模板已恢复。</div>;
  if (searchParams?.productDeleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>个人业态模板已删除。</div>;
  if (searchParams?.duplicate) return <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>业态名称重复，请调整后再保存。</div>;
  return null;
}

function TemplateManagePanel({ tpl, canEdit, userId }: { tpl: any; canEdit: boolean; userId: string }) {
  if (!userId) return null;
  if (!canEdit) {
    return <div style={{ display: 'grid', gap: 8, minWidth: 260 }}><Link className="btn" href={`/templates/${tpl.id}/rules`}>查看科目/税率规则</Link><form action="/api/templates" method="post" style={{ display: 'grid', gap: 6 }}><input type="hidden" name="action" value="copy" /><input type="hidden" name="templateId" value={tpl.id} /><input name="newName" placeholder={`${tpl.name}（我的模板）`} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><button className="btn btn-primary">复制为我的模板</button></form></div>;
  }
  return <div style={{ display: 'grid', gap: 8, minWidth: 340 }}><Link className="btn btn-primary" href={`/templates/${tpl.id}/rules`}>编辑科目/税率规则</Link>{tpl.isDefault ? <div style={{ border: '1px solid #b2f2bb', color: '#2b8a3e', background: '#f0fff4', borderRadius: 8, padding: '8px 10px', fontWeight: 900 }}>当前默认个人模板</div> : <form action="/api/templates" method="post"><input type="hidden" name="action" value="setDefault" /><input type="hidden" name="templateId" value={tpl.id} /><button className="btn btn-primary" style={{ width: '100%' }}>设为默认模板</button></form>}<form action="/api/templates" method="post" style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 6 }}><input type="hidden" name="action" value="rename" /><input type="hidden" name="templateId" value={tpl.id} /><input name="name" defaultValue={tpl.name} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="type" defaultValue={tpl.type} style={{ height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><input name="description" defaultValue={tpl.description || ''} placeholder="模板说明" style={{ gridColumn: '1 / -1', height: 34, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 8px' }} /><button className="btn" style={{ gridColumn: '1 / -1' }}>保存名称/说明</button></form><div style={{ display: 'flex', gap: 8 }}><form action="/api/templates" method="post" style={{ flex: 1 }}><input type="hidden" name="action" value="copy" /><input type="hidden" name="templateId" value={tpl.id} /><button className="btn" style={{ width: '100%' }}>复制一份</button></form><form action="/api/templates" method="post" style={{ flex: 1 }}><input type="hidden" name="action" value="delete" /><input type="hidden" name="templateId" value={tpl.id} /><button className="btn" style={{ width: '100%', color: '#c92a2a' }}>删除模板</button></form></div></div>;
}

export default async function TemplatesPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const userId = cookies().get('lqdc_session')?.value || '';
  const templates = await prisma.template.findMany({
    where: userId ? { OR: [{ ownerId: null }, { ownerId: userId }] } : { ownerId: null },
    orderBy: [{ ownerId: 'desc' }, { isDefault: 'desc' }, { sortOrder: 'asc' }],
    include: { products: { orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { sortOrder: 'asc' }] }, costRules: { orderBy: { sortOrder: 'asc' } }, taxRules: { orderBy: { sortOrder: 'asc' } } }
  });

  return <main className="page"><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header"><div><p className="eyebrow">系统模板中心</p><h1 className="title">系统模板 / 个人模板</h1><p className="subtitle">系统模板是底座，个人模板是你的复用版本。系统默认模板只读；个人模板可复制、重命名、删除、设为默认。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn">个人工作台</Link><Link href="/knowledge" className="btn">个人知识库</Link><Link href="/projects/new" className="btn btn-primary">用模板新建项目</Link></div></div>
    <StatusMessage searchParams={searchParams} />

    <section className="card" style={{ marginBottom: 14, borderColor: '#c5eef3', background: '#f8fbff' }}>
      <div className="page-header" style={{ marginBottom: 12 }}><div><p className="eyebrow">系统模板结构</p><h2 style={{ margin: 0 }}>模板分类</h2><p className="meta">先按地产成本、招采、合约、审批和报告的实际使用场景分组，后续逐步接入对应模板维护页面。</p></div><span className="badge">模板底座</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>{systemTemplateGroups.map((group) => <div key={group.title} style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 14, background: '#fff' }}><b>{group.title}</b><p className="meta" style={{ minHeight: 42 }}>{group.desc}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{group.items.map((item) => <span key={item} style={{ fontSize: 12, color: '#344054', background: '#f2f4f7', border: '1px solid #e4e7ec', borderRadius: 999, padding: '5px 8px' }}>{item}</span>)}</div></div>)}</div>
    </section>

    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>模板保护规则</b><p className="meta" style={{ margin: '6px 0 0' }}>系统默认模板不能被任何个人直接改动。个人模板可以设为默认模板，之后新建项目时会排在最前面。</p></section>

    {templates.length === 0 ? <section className="card"><h2>暂无模板</h2><p className="meta">部署迁移完成后会自动生成“住宅开发目标成本标准模板”。</p></section> : <div style={{ display: 'grid', gap: 16 }}>{templates.map((tpl) => {
      const canEdit = !!userId && tpl.ownerId === userId;
      const activeProducts = tpl.products.filter((item) => item.isActive);
      const disabledProducts = tpl.products.filter((item) => !item.isActive);
      return <section key={tpl.id} className="card" style={{ borderColor: canEdit ? (tpl.isDefault ? '#51cf66' : '#b2f2bb') : '#d0ebff' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}><div><span className="badge">{canEdit ? (tpl.isDefault ? '我的默认模板' : '我的模板') : '系统只读模板'}</span><h2 style={{ marginTop: 10 }}>{tpl.name}</h2><p className="meta">{tpl.description || '暂无说明'}</p><div style={{ marginTop: 8, color: '#0b7285', fontSize: 13, fontWeight: 800 }}>{sourceLabel(tpl, canEdit)}</div><div className="summary-strip" style={{ marginTop: 10 }}><div className="stat"><div className="stat-label">启用业态</div><div className="stat-value">{activeProducts.length}</div></div><div className="stat"><div className="stat-label">停用业态</div><div className="stat-value">{disabledProducts.length}</div></div><div className="stat"><div className="stat-label">科目规则</div><div className="stat-value">{tpl.costRules.length}</div></div><div className="stat"><div className="stat-label">税率规则</div><div className="stat-value">{tpl.taxRules.length}</div></div></div></div><TemplateManagePanel tpl={tpl} canEdit={canEdit} userId={userId} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
          {canEdit ? <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>新增业态模板</b><p className="meta">新增后进入你的个人业态库，新建项目时可直接选择。</p><form action="/api/templates/products" method="post" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px 120px 120px', gap: 10, alignItems: 'end' }}><input type="hidden" name="action" value="create" /><input type="hidden" name="templateId" value={tpl.id} /><label>分类<select name="category" style={{ width: '100%', height: 36 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>业态名称<input name="name" required placeholder="如：叠墅" style={{ width: '100%', height: 36 }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="isSaleable" type="checkbox" defaultChecked />可售</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="participateAllocation" type="checkbox" defaultChecked />分摊</label><label>权重<input name="allocationWeight" type="number" step="0.01" defaultValue="1" style={{ width: '100%', height: 36 }} /></label><button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>新增到我的模板</button></form></div> : null}
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><b>{canEdit ? '启用业态模板' : '启用业态模板（只读）'}</b><p className="meta">{canEdit ? '修改分类、可售、分摊和权重；停用后不会进入新项目初始化。' : '系统默认业态仅展示，个人需先复制后才能修改。'}</p><div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{activeProducts.length ? activeProducts.map((p) => canEdit ? <form key={p.id} action="/api/templates/products" method="post" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 90px 80px 90px 80px', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f3f5', paddingBottom: 8 }}><input type="hidden" name="action" value="update" /><input type="hidden" name="templateId" value={tpl.id} /><input type="hidden" name="productId" value={p.id} /><select name="category" defaultValue={p.category} style={{ height: 34 }}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><input name="name" defaultValue={p.name} style={{ height: 34 }} /><label style={{ display: 'flex', gap: 6 }}><input name="isSaleable" type="checkbox" defaultChecked={p.isSaleable} />可售</label><label style={{ display: 'flex', gap: 6 }}><input name="participateAllocation" type="checkbox" defaultChecked={p.participateAllocation} />分摊</label><input name="allocationWeight" type="number" step="0.01" defaultValue={fmt(p.allocationWeight)} style={{ height: 34 }} /><input name="sortOrder" type="number" defaultValue={p.sortOrder} style={{ height: 34 }} /><button className="btn">保存</button><button className="btn" name="action" value="disable" style={{ color: '#c92a2a' }}>停用</button></form> : <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 90px', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f3f5', paddingBottom: 8 }}><span className="meta">{p.category}</span><b>{p.name}</b><span>{p.isSaleable ? '可售' : '不可售'}</span><span>{p.participateAllocation ? '分摊' : '不分摊'}</span><span>权重{fmt(p.allocationWeight)}</span></div>) : <p className="meta">暂无启用业态。</p>}</div></div>
          {canEdit && disabledProducts.length ? <div style={{ border: '1px solid #ffe8cc', borderRadius: 10, padding: 12, background: '#fff9f1' }}><b>停用业态模板</b><p className="meta">停用业态不参与新项目初始化，可恢复或删除。</p><div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{disabledProducts.map((p) => <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px 90px', gap: 8, alignItems: 'center', borderBottom: '1px solid #ffe8cc', paddingBottom: 8 }}><span className="meta">{p.category}</span><b>{p.name}</b><form action="/api/templates/products" method="post"><input type="hidden" name="action" value="restore" /><input type="hidden" name="productId" value={p.id} /><button className="btn btn-primary">恢复</button></form><form action="/api/templates/products" method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="productId" value={p.id} /><button className="btn" style={{ color: '#c92a2a' }}>删除</button></form></div>)}</div></div> : null}
          <div style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div><b>科目/税率概览</b><p className="meta" style={{ margin: '4px 0 0' }}>科目规则 {tpl.costRules.length} 条；税率规则 {tpl.taxRules.length} 条。</p></div><Link className="btn btn-primary" href={`/templates/${tpl.id}/rules`}>{canEdit ? '编辑规则' : '查看规则'}</Link></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 10 }}><div>{tpl.costRules.slice(0, 8).map((r) => <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f3f5' }}><b>{r.subjectName}</b><div className="meta">{r.sourceTable || '-'} · {r.measureBasis || '-'}</div></div>)}</div><div>{tpl.taxRules.map((r) => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f3f5' }}><span>{r.name}</span><b>{Number(r.rate) * 100}%</b></div>)}</div></div></div>
        </div></section>;
    })}</div>}
  </div></main>;
}
