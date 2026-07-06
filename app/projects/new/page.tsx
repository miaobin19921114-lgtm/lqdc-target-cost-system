import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { defaultVersionStage, versionStageOptions } from '@/lib/version-stage';
import ProductCascadeSelector from './ProductCascadeSelector';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const userId = cookies().get('lqdc_session')?.value || '';
  const templates = await prisma.template.findMany({
    where: userId ? { isActive: true, OR: [{ ownerId: userId }, { ownerId: null }] } : { isActive: true, ownerId: null },
    orderBy: [{ ownerId: 'desc' }, { isDefault: 'desc' }, { sortOrder: 'asc' }],
    include: { products: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }, costRules: { orderBy: { sortOrder: 'asc' } }, taxRules: true }
  });
  const residentialTemplate = templates.find((item) => item.name.includes('住宅开发目标成本标准模板')) || templates[0];
  const selectorTemplates = residentialTemplate ? [residentialTemplate].map((item) => ({
    id: item.id,
    name: item.ownerId ? `${item.name}${item.isDefault ? '（默认）' : ''}` : `${item.name}（系统）`,
    type: item.type,
    description: item.description,
    products: item.products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      isSaleable: product.isSaleable,
      participateAllocation: product.participateAllocation
    }))
  })) : [];

  return <main className="page"><form action="/api/projects" method="post" className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">项目初始化向导</p><h1 className="title">新建项目</h1><p className="subtitle">按 4 步完成项目基础信息、测算模板、业态选择和创建确认，创建后进入项目测算中心。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn">返回项目中心</Link></div></div>
    <section className="card" style={{ marginBottom: 14 }}><span className="badge">第 1 步</span><h2>项目基础信息</h2><p className="meta">先录入项目主控信息，后续可在项目概况中继续补充。</p><div className="form-grid"><label>项目名称 *<input name="name" required placeholder="如：龙泉140亩项目" /></label><label>城市 *<input name="city" required defaultValue="成都" /></label><label>区域 *<input name="district" required defaultValue="龙泉驿" /></label><label>测算阶段 *<select name="stage" defaultValue={defaultVersionStage}>{versionStageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label><label>土地面积（㎡）<input name="landArea" type="number" step="0.01" /></label><label>容积率<input name="plotRatio" type="number" step="0.01" /></label><label>总建筑面积（㎡）<input name="totalBuildingArea" type="number" step="0.01" /></label><label>可售面积（㎡）<input name="saleableArea" type="number" step="0.01" /></label><label>车位数量（个）<input name="parkingCount" type="number" /></label></div><div style={{ marginTop: 14 }}><label>备注<textarea name="remark" placeholder="项目定位、测算口径等" /></label></div></section>
    <section className="card" style={{ marginBottom: 14 }}><span className="badge">第 2 步</span><h2>选择测算模板</h2><div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: '#f8fafc' }}><b>住宅开发目标成本标准模板</b><p className="meta" style={{ margin: '6px 0 0' }}>V1 仅此模板可真实选择；厂房、产业园、商业综合体等模板作为后续预留，不进入本次创建。</p><input type="hidden" name="templateName" value="住宅开发目标成本标准模板" /></div><details style={{ marginTop: 12 }}><summary style={{ cursor: 'pointer', fontWeight: 900 }}>查看模板包含内容</summary><p className="meta" style={{ marginTop: 8 }}>创建后将带入目标成本科目框架、收入明细框架、税费测算框架和常用测算口径。科目税率明细可在项目测算中心继续查看。</p></details></section>
    <section className="card" style={{ marginBottom: 14 }}><span className="badge">专项配置</span><h2>选择项目专项</h2><p className="meta">未选择的专项不会在创建后的建造标准和成本测算中自动启用；机械车位为 06 字段遗留，V1 先只记录为创建口径说明。</p><div className="form-grid">
      <label>是否室内精装修<select name="residentialFitoutDelivery" defaultValue="false"><option value="false">否</option><option value="true">是</option></select></label>
      <label>是否装配式<select name="isPrefabricated" defaultValue="false"><option value="false">否</option><option value="true">是</option></select></label>
      <label>是否采暖<select name="heatingEnabled" defaultValue="false"><option value="false">否</option><option value="true">是</option></select></label>
      <label>是否有人防<select name="hasCivilDefense" defaultValue="false"><option value="false">否</option><option value="true">是，面积后续维护</option></select></label>
      <label>是否有机械车位<select name="hasMechanicalParking" defaultValue="false"><option value="false">否</option><option value="true">是</option></select></label>
      <label>机械车位数量（个）<input name="mechanicalParkingCount" type="number" min="0" /></label>
      <label>是否有充电桩<select name="hasChargingPile" defaultValue="false"><option value="false">否</option><option value="true">是，数量后续维护</option></select></label>
    </div></section>
    <section className="card" style={{ marginBottom: 14 }}><span className="badge">第 3 步</span><h2>选择业态</h2><p className="meta">默认展示住宅、商业、车位、地下室和配套常用业态；更多业态可展开选择。</p>{templates.length ? <ProductCascadeSelector templates={selectorTemplates} /> : <p className="meta">模板中心暂无可用业态。可先填写项目信息，创建后再维护自定义业态。</p>}<details style={{ marginTop: 12 }}><summary style={{ cursor: 'pointer', fontWeight: 900 }}>展开更多业态</summary><p className="meta">可在创建后进入“业态产品与对象”补充办公、酒店、幼儿园、配建用房等非默认业态。</p></details><div className="meta" style={{ marginTop: 10 }}>保留“新增自定义业态”，用于非标准产品测算。</div></section>
    <section className="card" style={{ marginBottom: 14 }}><span className="badge">第 4 步</span><h2>确认并创建</h2><p className="meta">创建前请复核：项目名称、城市区域、测算阶段、测算模板和已选业态。创建后将生成：项目概况、初始版本、目标成本科目框架、收入明细框架、税费测算框架。</p></section>
    <div className="actions" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary">创建项目并进入测算中心</button></div>
  </form></main>;
}
