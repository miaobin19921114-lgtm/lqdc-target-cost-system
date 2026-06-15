import Link from 'next/link';

export const dynamic = 'force-dynamic';

const productScope = [
  ['个人/小团队使用', '不按大型 ERP 做复杂组织、流程、审批，先解决个人测算效率。'],
  ['地产成本测算', '围绕项目概况、收入、目标成本、明细、税费、分摊和汇总。'],
  ['模板驱动', '用默认业态库、科目库、税率和测算规则快速生成项目框架。'],
  ['数据可沉淀', '后续逐步积累地区、业态、成本指标，服务 AI 测算。']
] as const;

const workflow = [
  ['1', '模板中心', '维护默认模板、业态库、科目库和税率规则。', '/templates'],
  ['2', '新建项目', '选择模板，确认业态，生成项目测算框架。', '/projects/new'],
  ['3', '项目列表', '进入已有项目，继续维护概况、收入、成本和税金。', '/projects'],
  ['4', '测算工作台', '进入项目后填明细表，目标成本和汇总表自动归集。', '/projects']
] as const;

export default function WorkspacePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">源信达</p><h1 className="title">地产目标成本测算系统</h1><p className="subtitle">让地产成本测算更简单。产品定位：面向个人和小团队，专注地产项目目标成本测算，不做大型 ERP，不做上下游全链路集成。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn btn-primary">进入项目列表</Link><Link href="/projects/new" className="btn">新建项目</Link><Link href="/templates" className="btn">模板中心</Link></div></div>

    <section className="card" style={{ marginBottom: 14 }}><h2>产品边界</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>{productScope.map(([name, desc]) => <div key={name} style={{ border: '1px solid #d9e2ec', borderRadius: 14, padding: 16, background: '#fff' }}><b>{name}</b><p className="meta" style={{ marginTop: 8 }}>{desc}</p></div>)}</div></section>

    <section className="card"><h2>使用流程</h2><p className="meta">第一期只做这一条线：模板 → 项目 → 概况 → 明细 → 汇总。</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>{workflow.map(([step, name, desc, href]) => <Link key={name} href={href} style={{ border: '1px solid #d9e2ec', borderRadius: 14, padding: 16, background: '#fff', display: 'block' }}><div style={{ width: 30, height: 30, borderRadius: 8, background: '#e9f7f8', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{step}</div><b style={{ display: 'block', marginTop: 12 }}>{name}</b><p className="meta" style={{ marginTop: 8 }}>{desc}</p><span style={{ color: '#0b7285', fontWeight: 900 }}>进入 ›</span></Link>)}</div></section>
  </div></main>;
}
