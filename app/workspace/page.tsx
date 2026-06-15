import Link from 'next/link';

export const dynamic = 'force-dynamic';

const sectors = [
  ['房建地产', '住宅、商业、综合体、产业园配套'],
  ['厂房园区', '厂房、仓储、工业园、产线配套'],
  ['市政道路', '道路、桥梁、管网、场平、照明'],
  ['公路铁路', '公路、高铁、站场、隧道、交通工程'],
  ['海外工程', '材料站、总包、供应链、属地化经营']
];

const modules = [
  ['投资测算', '拿地测算、货值、现金流、利润率、敏感性分析', '待接入'],
  ['目标成本测算', '概况表、收入、成本、税费、分摊、汇总', '/projects'],
  ['设计管理', '任务书、方案、施工图、设计变更、限额设计', '待接入'],
  ['招采合同', '总包、专业分包、材料设备、供应商、合同台账', '待接入'],
  ['工程建造', '总包管理、分包履约、进度、质量安全、签证变更', '待接入'],
  ['动态成本', '合同、变更、签证、结算、目标成本对比', '待接入'],
  ['营销销售', '产品定位、价格表、去化、渠道、回款、佣金', '待接入'],
  ['招商运营', '商户资源、租金测算、租约、开业筹备、运营收入', '待接入'],
  ['综管行政', '证照报批、会议纪要、事项跟踪、资料归档', '待接入'],
  ['财务资金', '付款申请、发票、应收应付、现金流、融资、税务清算', '待接入'],
  ['AI知识库', '规范政策、成本库、合同条款、历史项目、AI问答', '待接入'],
  ['后台模板中心', '业态模板、科目模板、规则、税率、默认口径', '/templates']
] as const;

export default function WorkspacePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}><div className="container" style={{ maxWidth: 1400 }}>
    <div className="page-header"><div><p className="eyebrow">平台首页</p><h1 className="title">地产工程全链路业务平台</h1><p className="subtitle">登录后先进入业务板块中心，再按房建、厂房、市政、公路铁路等项目类型进入对应模块。当前优先上线目标成本测算模块。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn btn-primary">进入成本测算</Link><Link href="/templates" className="btn">模板中心</Link></div></div>

    <section className="card" style={{ marginBottom: 14 }}><h2>项目类型 / 业务场景</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>{sectors.map(([name, desc]) => <div key={name} style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 14, background: '#fcfdff' }}><b>{name}</b><p className="meta" style={{ marginTop: 6 }}>{desc}</p></div>)}</div></section>

    <section className="card"><h2>业务模块中心</h2><p className="meta">模块先预留入口，不一次性做重。成本测算先跑通，后续逐步接入总包、分包、设计、营销、招商、综管和财务。</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>{modules.map(([name, desc, href]) => typeof href === 'string' && href.startsWith('/') ? <Link key={name} href={href} style={{ border: '1px solid #d9e2ec', borderRadius: 14, padding: 16, background: '#fff', display: 'block' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{name}</b><span style={{ color: '#0b7285', fontWeight: 900 }}>进入 ›</span></div><p className="meta" style={{ marginTop: 8 }}>{desc}</p></Link> : <div key={name} style={{ border: '1px dashed #c9d6e2', borderRadius: 14, padding: 16, background: '#f8fafc' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{name}</b><span className="meta">{href}</span></div><p className="meta" style={{ marginTop: 8 }}>{desc}</p></div>)}</div></section>
  </div></main>;
}
