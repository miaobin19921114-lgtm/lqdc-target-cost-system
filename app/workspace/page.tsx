import Link from 'next/link';

export const dynamic = 'force-dynamic';

const tree = [
  {
    title: '甲方 / 业主 / 平台公司',
    desc: '项目统筹、投资、资金、成本、合同、销售运营。',
    units: [
      { name: '地产公司', slug: 'developer', business: ['投资测算', '目标成本测算', '设计管理', '招采合同', '动态成本', '营销销售', '财务资金'] },
      { name: '城投 / 平台公司', slug: 'platform', business: ['市政项目库', '资金计划', '招采合同', '工程进度', '竣工移交'] },
      { name: '产业园业主', slug: 'industrialOwner', business: ['厂房建设', '招商运营', '资产运营', '物业管理'] }
    ]
  },
  {
    title: '设计咨询单位',
    desc: '方案、施工图、咨询、造价、监理、招标代理。',
    units: [
      { name: '规划/建筑设计院', slug: 'design', business: ['方案设计', '施工图设计', '限额设计', '图纸变更'] },
      { name: '造价咨询公司', slug: 'costConsultant', business: ['清单控制价', '目标成本复核', '结算审核', '全过程咨询'] },
      { name: '监理/项目管理公司', slug: 'supervisor', business: ['进度质量安全', '签证审核', '现场协调'] }
    ]
  },
  {
    title: '施工总包及专业分包',
    desc: '总包履约、专业分包、材料设备、进度、签证、结算。',
    units: [
      { name: '总承包单位', slug: 'contractor', business: ['总包合同', '进度计划', '产值上报', '变更签证', '结算预测'] },
      { name: '土建/安装/装饰分包', slug: 'subcontractor', business: ['专业合同', '工程量确认', '质量安全', '付款申请'] },
      { name: '园林/道路/管网分包', slug: 'landscapeRoad', business: ['景观工程', '道路总平', '综合管网', '围墙出入口'] }
    ]
  },
  {
    title: '材料设备供应链',
    desc: '砂石、商混、沥青、防水、门窗、电梯、机电设备。',
    units: [
      { name: '材料供应商', slug: 'materialSupplier', business: ['材料报价', '采购合同', '到货验收', '库存台账'] },
      { name: '设备厂家', slug: 'equipmentSupplier', business: ['电梯设备', '消防设备', '人防设备', '充电桩设备'] },
      { name: '海外材料站', slug: 'overseasMaterial', business: ['砂石站', '商混站', '沥青站', '供应链客户'] }
    ]
  },
  {
    title: '营销招商运营',
    desc: '销售去化、渠道、招商资源、租约、运营收入。',
    units: [
      { name: '营销代理/渠道', slug: 'marketing', business: ['价格表', '认购签约', '回款', '佣金', '营销费用'] },
      { name: '招商公司', slug: 'investment', business: ['商户资源', '租金测算', '租约管理', '开业筹备'] },
      { name: '物业/运营公司', slug: 'property', business: ['物业移交', '运营收入', '资产管理'] }
    ]
  },
  {
    title: '综合财务后台',
    desc: '行政综管、证照、付款、发票、现金流、税务清算。',
    units: [
      { name: '综合管理', slug: 'administration', business: ['证照报批', '会议纪要', '事项跟踪', '资料归档'] },
      { name: '财务资金', slug: 'finance', business: ['付款申请', '发票管理', '应收应付', '融资现金流'] },
      { name: '税务清算', slug: 'tax', business: ['增值税', '土增税', '企业所得税', '清算分摊'] }
    ]
  }
];

const projectTypes = ['房建地产', '厂房园区', '市政道路', '公路铁路', '高铁站场', '海外工程'];

export default function WorkspacePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}><div className="container" style={{ maxWidth: 1480 }}>
    <div className="page-header"><div><p className="eyebrow">平台首页</p><h1 className="title">上下游业务目录树</h1><p className="subtitle">先按产业链关系选择单位类型，再进入该单位对应业务。房建、厂房、道路、公路、高铁等项目都可以挂在同一套目录树下。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/projects" className="btn btn-primary">进入成本测算</Link><Link href="/templates" className="btn">模板中心</Link></div></div>

    <section className="card" style={{ marginBottom: 14 }}><h2>项目类型</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{projectTypes.map((item) => <span key={item} style={{ border: '1px solid #d9e2ec', borderRadius: 999, padding: '8px 12px', background: '#fff', fontWeight: 800 }}>{item}</span>)}</div></section>

    <section className="card"><h2>产业链目录</h2><p className="meta">点击单位类型，先进入该单位业务页，再进入公司和业务模块。当前只把“目标成本测算”和“模板中心”接通。</p><div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
      {tree.map((group, index) => <details key={group.title} open={index < 2} style={{ border: '1px solid #d9e2ec', borderRadius: 14, background: '#fff', overflow: 'hidden' }}><summary style={{ cursor: 'pointer', padding: 14, background: '#f8fafc', fontWeight: 900, fontSize: 16 }}><span style={{ color: '#0b7285', marginRight: 8 }}>{index + 1}</span>{group.title}<span className="meta" style={{ marginLeft: 10 }}>{group.desc}</span></summary><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, padding: 14 }}>{group.units.map((unit) => {
        const box = <div style={{ border: '1px solid #eef2f6', borderRadius: 12, padding: 14, background: '#f0fbfc', height: '100%' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{unit.name}</b><span style={{ color: '#0b7285', fontWeight: 900 }}>进入单位业务页 ›</span></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{unit.business.map((biz) => <span key={biz} style={{ border: '1px solid #d9e2ec', borderRadius: 999, padding: '5px 8px', fontSize: 12, background: '#fff' }}>{biz}</span>)}</div></div>;
        return <Link key={unit.name} href={`/workspace/units/${unit.slug}`} style={{ display: 'block' }}>{box}</Link>;
      })}</div></details>)}
    </div></section>
  </div></main>;
}
