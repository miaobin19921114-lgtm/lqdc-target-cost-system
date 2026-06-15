import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductCascadeSelector from './ProductCascadeSelector';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    include: { products: { orderBy: { sortOrder: 'asc' } }, costRules: { orderBy: { sortOrder: 'asc' } }, taxRules: true }
  });
  const selectorTemplates = templates.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    description: item.description,
    products: item.products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      isSaleable: product.isSaleable,
      participateAllocation: product.participateAllocation
    }))
  }));
  const template = templates[0];

  return <main className="page"><form action="/api/projects" method="post" className="container" style={{ maxWidth: 1100 }}>
    <div className="page-header"><div><p className="eyebrow">项目初始化向导</p><h1 className="title">新建项目</h1><p className="subtitle">先选择模板，再用一级分类 + 二级业态多选确认本项目范围。创建后生成项目测算框架。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/templates" className="btn">模板中心</Link><Link href="/projects" className="btn">返回</Link></div></div>
    <section className="card"><span className="badge">第1步</span><h2>选择模板与业态</h2>{templates.length ? <ProductCascadeSelector templates={selectorTemplates} /> : <p className="meta">暂无模板，请先到模板中心检查。</p>}</section>
    <section className="card"><span className="badge">第2步</span><h2>项目基础信息</h2><p className="meta">这里是项目主控基础指标，后续概况表会继续承接和细化，不会和业态选择冲突。</p><div className="form-grid"><label>项目名称<input name="name" required placeholder="如：龙泉140亩项目" /></label><label>城市<input name="city" defaultValue="成都" /></label><label>区域<input name="district" defaultValue="龙泉驿" /></label><label>土地面积㎡<input name="landArea" type="number" step="0.01" /></label><label>容积率<input name="plotRatio" type="number" step="0.01" /></label><label>总建筑面积㎡<input name="totalBuildingArea" type="number" step="0.01" /></label><label>可售面积㎡<input name="saleableArea" type="number" step="0.01" /></label><label>车位数量<input name="parkingCount" type="number" /></label></div><div style={{ marginTop: 14 }}><label>备注<textarea name="remark" placeholder="项目定位、测算口径等" /></label></div></section>
    <section className="card"><span className="badge">第3步</span><h2>确认科目规则</h2><p className="meta">第一版先带入默认规则。下一版继续增加“勾选科目、确认测算依据、分摊方式”。</p>{template ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>{template.costRules.map((rule) => <div key={rule.id} style={{ border: '1px solid #eef2f6', borderRadius: 10, padding: 10 }}><b>{rule.subjectName}</b><div className="meta">{rule.sourceTable || '-'} · {rule.measureBasis || '-'}</div></div>)}</div> : null}</section>
    <div className="actions" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary">创建项目并生成框架</button></div>
  </form></main>;
}
