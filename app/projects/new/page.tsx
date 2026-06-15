import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    include: { products: { orderBy: { sortOrder: 'asc' } }, costRules: true, taxRules: true }
  });
  const template = templates[0];

  return <main className="page"><form action="/api/projects" method="post" className="container" style={{ maxWidth: 1100 }}>
    <div className="page-header"><div><p className="eyebrow">项目初始化向导</p><h1 className="title">新建项目</h1><p className="subtitle">先选择模板，再确认本项目业态，创建后生成项目测算框架。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/templates" className="btn">模板中心</Link><Link href="/projects" className="btn">返回</Link></div></div>
    <section className="card"><span className="badge">第1步</span><h2>选择模板</h2>{templates.length ? <div style={{ display: 'grid', gap: 10 }}>{templates.map((item, index) => <label key={item.id} style={{ display: 'flex', gap: 10, border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><input type="radio" name="templateId" value={item.id} defaultChecked={index === 0} /><span><b>{item.name}</b><div className="meta">业态 {item.products.length} 个，科目规则 {item.costRules.length} 条，税率 {item.taxRules.length} 条</div></span></label>)}</div> : <p className="meta">暂无模板，请先到模板中心检查。</p>}</section>
    <section className="card"><span className="badge">第2步</span><h2>项目基础信息</h2><div className="form-grid"><label>项目名称<input name="name" required placeholder="如：龙泉140亩项目" /></label><label>城市<input name="city" defaultValue="成都" /></label><label>区域<input name="district" defaultValue="龙泉驿" /></label><label>土地面积㎡<input name="landArea" type="number" step="0.01" /></label><label>容积率<input name="plotRatio" type="number" step="0.01" /></label><label>总建筑面积㎡<input name="totalBuildingArea" type="number" step="0.01" /></label><label>可售面积㎡<input name="saleableArea" type="number" step="0.01" /></label><label>车位数量<input name="parkingCount" type="number" /></label></div><div style={{ marginTop: 14 }}><label>备注<textarea name="remark" placeholder="项目定位、测算口径等" /></label></div></section>
    <section className="card"><span className="badge">第3步</span><h2>确认本项目业态</h2><p className="meta">只勾选本项目需要的业态，未勾选的不生成到项目概况表。</p>{template ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>{template.products.map((item) => <label key={item.id} style={{ display: 'flex', gap: 8, border: '1px solid #d9e2ec', borderRadius: 10, padding: 10 }}><input name="templateProductIds" type="checkbox" value={item.id} defaultChecked={item.isSaleable || item.participateAllocation} /><span><b>{item.name}</b><div className="meta">{item.category} · {item.isSaleable ? '可售' : '不可售'}</div></span></label>)}</div> : null}</section>
    <div className="actions" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary">创建项目并生成框架</button></div>
  </form></main>;
}
