import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import ProductCascadeSelector from './ProductCascadeSelector';
import CostRuleSelector from './CostRuleSelector';

export const dynamic = 'force-dynamic';

const stages = ['投拓阶段', '定位阶段', '方案阶段', '扩初阶段', '施工图阶段', '招采阶段', '动态成本阶段', '结算阶段'];

export default async function NewProjectPage() {
  const userId = cookies().get('lqdc_session')?.value || '';
  const templates = await prisma.template.findMany({
    where: userId ? { isActive: true, OR: [{ ownerId: userId }, { ownerId: null }] } : { isActive: true, ownerId: null },
    orderBy: [{ ownerId: 'desc' }, { isDefault: 'desc' }, { sortOrder: 'asc' }],
    include: { products: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }, costRules: { orderBy: { sortOrder: 'asc' } }, taxRules: true }
  });
  const selectorTemplates = templates.map((item) => ({
    id: item.id,
    name: item.ownerId ? item.name : `${item.name}（系统）`,
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
  const costRuleTemplates = templates.map((item) => ({
    id: item.id,
    name: item.ownerId ? item.name : `${item.name}（系统）`,
    costRules: item.costRules.map((rule) => ({
      id: rule.id,
      costCode: rule.costCode,
      category: rule.category,
      subjectName: rule.subjectName,
      sourceTable: rule.sourceTable,
      measureBasis: rule.measureBasis,
      unit: rule.unit,
      defaultTaxRate: Number(rule.defaultTaxRate || 0),
      allocationMethod: rule.allocationMethod,
      sortOrder: rule.sortOrder
    }))
  }));

  return <main className="page"><form action="/api/projects" method="post" className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">项目初始化向导</p><h1 className="title">新建项目</h1><p className="subtitle">优先使用个人模板；系统模板只读。保存自定义业态时只写入个人模板，不改系统默认模板。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/templates" className="btn">模板中心</Link><Link href="/projects" className="btn">返回</Link></div></div>
    <section className="card"><span className="badge">第1步</span><h2>测算阶段</h2><p className="meta">每个项目可按投拓、定位、方案、施工图、招采、动态成本、结算等阶段沉淀不同版本。</p><label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>当前阶段<select name="stage" defaultValue="投拓阶段" style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label></section>
    <section className="card"><span className="badge">第2步</span><h2>选择模板与业态</h2>{templates.length ? <ProductCascadeSelector templates={selectorTemplates} /> : <p className="meta">暂无模板，请先到模板中心检查。</p>}</section>
    <section className="card"><span className="badge">第3步</span><h2>科目规则、税率与分摊方式</h2>{templates.length ? <CostRuleSelector templates={costRuleTemplates} /> : <p className="meta">暂无科目规则，请先到模板中心检查。</p>}</section>
    <section className="card"><span className="badge">第4步</span><h2>项目基础信息</h2><p className="meta">这里是项目主控基础指标，后续概况表会继续承接和细化，不会和业态选择冲突。</p><div className="form-grid"><label>项目名称<input name="name" required placeholder="如：龙泉140亩项目" /></label><label>城市<input name="city" defaultValue="成都" /></label><label>区域<input name="district" defaultValue="龙泉驿" /></label><label>土地面积㎡<input name="landArea" type="number" step="0.01" /></label><label>容积率<input name="plotRatio" type="number" step="0.01" /></label><label>总建筑面积㎡<input name="totalBuildingArea" type="number" step="0.01" /></label><label>可售面积㎡<input name="saleableArea" type="number" step="0.01" /></label><label>车位数量<input name="parkingCount" type="number" /></label></div><div style={{ marginTop: 14 }}><label>备注<textarea name="remark" placeholder="项目定位、测算口径等" /></label></div></section>
    <div className="actions" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary">创建项目并生成框架</button></div>
  </form></main>;
}
