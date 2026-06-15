import Link from 'next/link';

export const dynamic = 'force-dynamic';

const workflow = [
  ['1', '模板中心', '维护住宅开发默认模板、业态库、科目和税率规则。', '/templates'],
  ['2', '新建项目', '选择模板，确认业态，生成项目测算框架。', '/projects/new'],
  ['3', '项目列表', '进入已有项目，继续维护概况、收入、成本和税金。', '/projects'],
  ['4', '目标成本测算', '进入项目后填明细表，由目标成本页和汇总表自动归集。', '/projects']
] as const;

const currentScope = [
  '地产公司内部使用',
  '住宅/商业/车位/配套业态',
  '项目概况、收入、成本、税费、分摊、汇总',
  '模板驱动，新建项目复制模板快照',
  '登录后才能查看和编辑'
];

export default function WorkspacePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}><div className="container" style={{ maxWidth: 1200 }}>
    <div className="page-header"><div><p className="eyebrow">地产公司业务体系</p><h1 className="title">目标成本测算模块</h1><p className="subtitle">当前只保留地产公司里的目标成本测算，不再展示上下游预留模块。后续其他业务单独上线，再通过账号、项目、公司和数据接口打通。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn btn-primary">进入项目列表</Link><Link href="/templates" className="btn">模板中心</Link></div></div>

    <section className="card" style={{ marginBottom: 14 }}><h2>当前上线范围</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>{currentScope.map((item) => <span key={item} style={{ border: '1px solid #d9e2ec', borderRadius: 999, padding: '8px 12px', background: '#fff', fontWeight: 800 }}>{item}</span>)}</div></section>

    <section className="card"><h2>使用流程</h2><p className="meta">先把第一个产品做深、做稳：模板 → 项目 → 概况 → 明细 → 汇总。</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>{workflow.map(([step, name, desc, href]) => <Link key={name} href={href} style={{ border: '1px solid #d9e2ec', borderRadius: 14, padding: 16, background: '#fff', display: 'block' }}><div style={{ width: 30, height: 30, borderRadius: 8, background: '#e9f7f8', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{step}</div><b style={{ display: 'block', marginTop: 12 }}>{name}</b><p className="meta" style={{ marginTop: 8 }}>{desc}</p><span style={{ color: '#0b7285', fontWeight: 900 }}>进入 ›</span></Link>)}</div></section>
  </div></main>;
}
