import Link from 'next/link';

export const dynamic = 'force-dynamic';

const units: Record<string, { title: string; category: string; desc: string; companies: string[]; modules: { name: string; desc: string; href?: string }[] }> = {
  developer: { title: '地产公司', category: '甲方 / 业主 / 平台公司', desc: '以项目为主线管理投资、成本、设计、招采、工程、营销和财务。', companies: ['示例地产公司', '项目公司', '区域公司'], modules: [
    { name: '目标成本测算', desc: '概况、收入、目标成本、税金分摊、汇总导出', href: '/projects' },
    { name: '后台模板中心', desc: '业态模板、科目模板、规则、税率', href: '/templates' },
    { name: '投资测算', desc: '拿地、货值、利润率、现金流' },
    { name: '设计管理', desc: '任务书、方案、施工图、设计变更' },
    { name: '招采合同', desc: '总包、分包、材料设备、付款条件' },
    { name: '动态成本', desc: '合同、变更、签证、结算预测' },
    { name: '营销销售', desc: '价格表、去化、回款、佣金' },
    { name: '财务资金', desc: '付款、发票、现金流、税务清算' }
  ] },
  platform: { title: '城投 / 平台公司', category: '甲方 / 业主 / 平台公司', desc: '偏市政、公建、基础设施项目的统筹管理。', companies: ['城投公司', '交通平台公司', '园区平台公司'], modules: [
    { name: '市政项目库', desc: '道路、管网、桥梁、公建项目台账' },
    { name: '招采合同', desc: '招标、合同、付款、结算' },
    { name: '工程进度', desc: '形象进度、节点计划、现场协调' },
    { name: '资金计划', desc: '财政资金、融资、付款计划' }
  ] },
  industrialOwner: { title: '产业园业主', category: '甲方 / 业主 / 平台公司', desc: '厂房、仓储、园区配套、招商和运营管理。', companies: ['产业园公司', '厂房业主', '资产运营公司'], modules: [
    { name: '厂房建设', desc: '厂房、仓库、办公楼、配套工程' },
    { name: '招商运营', desc: '租金测算、客户跟进、租约管理' },
    { name: '资产运营', desc: '出租率、运营收入、物业费' }
  ] },
  design: { title: '规划/建筑设计院', category: '设计咨询单位', desc: '管理方案、扩初、施工图、设计变更和限额设计。', companies: ['建筑设计院', '规划院', '专项设计单位'], modules: [
    { name: '方案设计', desc: '强排、总图、产品方案、效果图' },
    { name: '施工图设计', desc: '建筑、结构、机电、景观图纸' },
    { name: '限额设计', desc: '指标控制、成本反馈、图纸优化' }
  ] },
  costConsultant: { title: '造价咨询公司', category: '设计咨询单位', desc: '清单控制价、目标成本复核、结算审核、全过程咨询。', companies: ['造价咨询公司', '全过程咨询公司', '审计单位'], modules: [
    { name: '清单控制价', desc: '工程量清单、控制价、招标限价' },
    { name: '目标成本复核', desc: '目标成本审核、指标对标' },
    { name: '结算审核', desc: '签证、变更、结算审计' }
  ] },
  supervisor: { title: '监理/项目管理公司', category: '设计咨询单位', desc: '现场进度、质量、安全、签证审核和协调。', companies: ['监理公司', '项目管理公司', '代建单位'], modules: [
    { name: '进度质量安全', desc: '现场巡检、质量安全问题闭环' },
    { name: '签证审核', desc: '现场签证、工程变更初审' },
    { name: '资料归档', desc: '监理资料、会议纪要、影像资料' }
  ] },
  contractor: { title: '总承包单位', category: '施工总包及专业分包', desc: '总包合同、进度计划、产值、变更签证和结算预测。', companies: ['总包单位', '施工联合体', 'EPC单位'], modules: [
    { name: '总包合同', desc: '合同台账、付款条件、履约节点' },
    { name: '进度计划', desc: '总控计划、月计划、形象进度' },
    { name: '产值上报', desc: '月度产值、付款申请' },
    { name: '变更签证', desc: '变更签证申报、审核、归档' }
  ] },
  subcontractor: { title: '土建/安装/装饰分包', category: '施工总包及专业分包', desc: '专业分包合同、工程量确认、质量安全和付款申请。', companies: ['土建分包', '安装分包', '精装分包'], modules: [
    { name: '专业合同', desc: '分包合同、计价方式、付款节点' },
    { name: '工程量确认', desc: '完成量、计量、结算依据' },
    { name: '质量安全', desc: '问题整改、验收记录' }
  ] },
  landscapeRoad: { title: '园林/道路/管网分包', category: '施工总包及专业分包', desc: '景观、道路总平、综合管网、围墙出入口。', companies: ['园林单位', '道路总平单位', '管网单位'], modules: [
    { name: '景观工程', desc: '硬景、软景、水系、儿童活动场地' },
    { name: '道路总平', desc: '道路、铺装、交安、标识' },
    { name: '综合管网', desc: '给排水、电力、燃气、通信' }
  ] },
  materialSupplier: { title: '材料供应商', category: '材料设备供应链', desc: '材料报价、采购合同、到货验收、库存台账。', companies: ['砂石供应商', '商混站', '沥青站', '防水材料商'], modules: [
    { name: '材料报价', desc: '价格库、报价单、询价比价' },
    { name: '采购合同', desc: '采购合同、付款条件、结算方式' },
    { name: '到货验收', desc: '收料、质检、库存台账' }
  ] },
  equipmentSupplier: { title: '设备厂家', category: '材料设备供应链', desc: '电梯、消防、人防、充电桩及机电设备。', companies: ['电梯厂家', '消防设备厂家', '充电桩厂家'], modules: [
    { name: '设备报价', desc: '设备清单、配置标准、报价对比' },
    { name: '供货安装', desc: '到货、安装、调试、验收' },
    { name: '维保资料', desc: '质保、维保、备品备件' }
  ] },
  overseasMaterial: { title: '海外材料站', category: '材料设备供应链', desc: '砂石站、商混站、沥青站、海外供应链客户。', companies: ['砂石站', '商混站', '沥青站'], modules: [
    { name: '客户管理', desc: '客户线索、报价、跟进、成交' },
    { name: '生产销售', desc: '生产日报、销售日报、库存' },
    { name: '供应链台账', desc: '材料、车辆、运输、结算' }
  ] },
  marketing: { title: '营销代理/渠道', category: '营销招商运营', desc: '价格表、认购签约、回款、佣金、营销费用。', companies: ['营销代理公司', '渠道公司', '案场团队'], modules: [
    { name: '价格表', desc: '一房一价、折扣、底价控制' },
    { name: '销售去化', desc: '认购、签约、回款、退房' },
    { name: '佣金费用', desc: '渠道佣金、营销费用、推广费' }
  ] },
  investment: { title: '招商公司', category: '营销招商运营', desc: '招商资源、租金测算、租约、开业筹备。', companies: ['招商公司', '商业运营团队', '产业招商团队'], modules: [
    { name: '商户资源', desc: '商户库、品牌库、跟进记录' },
    { name: '租金测算', desc: '租金、免租期、物业费、收入预测' },
    { name: '租约管理', desc: '合同、保证金、续租、退租' }
  ] },
  property: { title: '物业/运营公司', category: '营销招商运营', desc: '物业移交、运营收入、资产管理。', companies: ['物业公司', '商业运营公司', '资产管理公司'], modules: [
    { name: '物业移交', desc: '承接查验、移交清单、缺陷整改' },
    { name: '运营收入', desc: '物业费、停车费、租金及其他收入' },
    { name: '资产管理', desc: '资产台账、出租率、维修维护' }
  ] },
  administration: { title: '综合管理', category: '综合财务后台', desc: '证照报批、会议纪要、事项跟踪、资料归档。', companies: ['综合管理部', '报建团队', '行政资料岗'], modules: [
    { name: '证照报批', desc: '报规、报建、施工许可、竣备' },
    { name: '事项跟踪', desc: '会议纪要、任务闭环、责任人' },
    { name: '资料归档', desc: '合同、图纸、报批资料、结算资料' }
  ] },
  finance: { title: '财务资金', category: '综合财务后台', desc: '付款、发票、应收应付、融资现金流。', companies: ['财务部', '资金部', '融资团队'], modules: [
    { name: '付款申请', desc: '合同付款、审批、付款计划' },
    { name: '发票管理', desc: '销项、进项、发票台账' },
    { name: '现金流', desc: '资金计划、融资、回款、付款' }
  ] },
  tax: { title: '税务清算', category: '综合财务后台', desc: '增值税、土增税、企业所得税、清算分摊。', companies: ['税务岗', '财务税务团队', '外部税务顾问'], modules: [
    { name: '税金测算', desc: '增值税、附加税、所得税', href: '/projects' },
    { name: '土增税清算', desc: '收入、扣除项、分摊口径' },
    { name: '税务资料', desc: '发票、合同、成本归集资料' }
  ] }
};

export default function UnitPage({ params }: { params: { slug: string } }) {
  const unit = units[params.slug];
  if (!unit) return <main className="page"><div className="container"><h1>单位类型不存在</h1><Link href="/workspace" className="btn">返回目录树</Link></div></main>;
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">{unit.category}</p><h1 className="title">{unit.title}</h1><p className="subtitle">{unit.desc}</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/workspace" className="btn">返回目录树</Link><Link href="/projects" className="btn btn-primary">目标成本测算</Link></div></div>
    <section className="card" style={{ marginBottom: 14 }}><h2>公司 / 组织</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{unit.companies.map((company) => <div key={company} style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 14, background: '#fff' }}><b>{company}</b><p className="meta" style={{ marginTop: 6 }}>后续可进入该公司自己的项目、合同、任务和资料。</p></div>)}</div></section>
    <section className="card"><h2>业务入口</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>{unit.modules.map((module) => module.href ? <Link key={module.name} href={module.href} style={{ border: '1px solid #d9e2ec', borderRadius: 14, padding: 16, background: '#f0fbfc', display: 'block' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{module.name}</b><span style={{ color: '#0b7285', fontWeight: 900 }}>进入 ›</span></div><p className="meta" style={{ marginTop: 8 }}>{module.desc}</p></Link> : <div key={module.name} style={{ border: '1px dashed #c9d6e2', borderRadius: 14, padding: 16, background: '#fff' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{module.name}</b><span className="meta">待接入</span></div><p className="meta" style={{ marginTop: 8 }}>{module.desc}</p></div>)}</div></section>
  </div></main>;
}
