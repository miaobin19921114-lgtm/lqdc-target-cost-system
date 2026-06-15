import Link from 'next/link';

export const dynamic = 'force-dynamic';

const activeModule = {
  name: '目标成本测算',
  desc: '项目概况、业态、收入、目标成本、明细、税费、分摊、汇总导出。',
  href: '/projects'
};

const productSuite = [
  ['投资测算', '拿地测算、货值测算、现金流、利润率、敏感性分析'],
  ['设计管理', '设计任务书、方案、施工图、设计变更、限额设计'],
  ['招采合同', '总包招标、专业分包、材料设备、供应商、合同台账'],
  ['工程管理', '总包履约、专业分包、进度计划、质量安全、现场签证'],
  ['动态成本', '合同金额、已发生、待发生、变更签证、结算预测'],
  ['营销销售', '产品定位、价格表、销售去化、渠道、认购签约、回款'],
  ['招商运营', '招商资源、租金测算、租约管理、开业筹备、运营收入'],
  ['财务资金', '资金计划、付款申请、发票、应收应付、融资、税务清算'],
  ['AI知识库', '政策规范、成本数据库、合同条款、历史项目、AI问答']
] as const;

const workflow = [
  ['1', '模板中心', '维护住宅开发默认模板、业态库、科目和税率规则。', '/templates'],
  ['2', '新建项目', '选择模板，确认业态，生成项目测算框架。', '/projects/new'],
  ['3', '项目列表', '进入已有项目，继续维护概况、收入、成本和税金。', '/projects'],
  ['4', '目标成本测算', '进入项目后填明细表，由目标成本页和汇总表自动归集。', '/projects']
] as const;

export default function WorkspacePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">地产公司产品</p><h1 className="title">地产公司经营管理产品体系</h1><p className="subtitle">当前先上线目标成本测算。投资、设计、招采、工程、营销、招商、财务等属于后续地产公司产品模块，未来单独开发，再通过账号、项目、公司和数据接口打通。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn btn-primary">进入目标成本测算</Link><Link href="/templates" className="btn">模板中心</Link></div></div>

    <section className="card" style={{ marginBottom: 14 }}><h2>当前已上线模块</h2><Link href={activeModule.href} style={{ display: 'block', border: '1px solid #b6e4ea', borderRadius: 14, padding: 18, background: '#f0fbfc', marginTop: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><b style={{ fontSize: 18 }}>{activeModule.name}</b><span style={{ color: '#0b7285', fontWeight: 900 }}>进入 ›</span></div><p className="meta" style={{ marginTop: 8 }}>{activeModule.desc}</p></Link></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>地产公司后续产品模块</h2><p className="meta">这些不作为当前预留入口开发，只作为产品边界说明；后面按单独模块逐个上线。</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginTop: 12 }}>{productSuite.map(([name, desc]) => <div key={name} style={{ border: '1px dashed #c9d6e2', borderRadius: 14, padding: 16, background: '#fff' }}><b>{name}</b><p className="meta" style={{ marginTop: 8 }}>{desc}</p><span className="meta">后续单独上线</span></div>)}</div></section>

    <section className="card"><h2>目标成本测算使用流程</h2><p className="meta">当前第一期先做深这一条线：模板 → 项目 → 概况 → 明细 → 汇总。</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>{workflow.map(([step, name, desc, href]) => <Link key={name} href={href} style={{ border: '1px solid #d9e2ec', borderRadius: 14, padding: 16, background: '#fff', display: 'block' }}><div style={{ width: 30, height: 30, borderRadius: 8, background: '#e9f7f8', color: '#0f4c5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{step}</div><b style={{ display: 'block', marginTop: 12 }}>{name}</b><p className="meta" style={{ marginTop: 8 }}>{desc}</p><span style={{ color: '#0b7285', fontWeight: 900 }}>进入 ›</span></Link>)}</div></section>
  </div></main>;
}
