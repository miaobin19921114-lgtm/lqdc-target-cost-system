import Link from 'next/link';

export const dynamic = 'force-dynamic';

const knowledgeGroups = [
  {
    title: '成本指标库',
    desc: '沉淀不同地区、业态、档次的单方指标、科目口径和目标成本经验值。',
    items: ['单价指标库', '建安指标库', '业态指标库', '成本科目口径', '目标成本模板库']
  },
  {
    title: '工程量知识库',
    desc: '沉淀常用工程量、含量指标、清单做法和图纸测算规则。',
    items: ['工程量指标库', '清单做法库', '含量指标库', '图纸测算规则库', '工程量复核清单']
  },
  {
    title: '招采知识库',
    desc: '沉淀招标文件、清标问题、评标办法、询价记录和供应商资料。',
    items: ['招标文件库', '清标问题库', '评标办法库', '询价比价库', '供应商/分包库']
  },
  {
    title: '合约知识库',
    desc: '沉淀合同模板、合同条款、付款条件、变更签证和结算案例。',
    items: ['合同模板库', '合同条款库', '付款条件库', '变更签证案例库', '结算争议案例库']
  },
  {
    title: '审批表知识库',
    desc: '沉淀投决、目标成本、招采、合同、付款等审批表模板。',
    items: ['投决审批表', '目标成本审批表', '招采审批表', '合同审批表', '付款审批表']
  },
  {
    title: 'AI资料库',
    desc: '后续用于投喂个人AI助手，形成可检索、可问答、可生成报告的资料底座。',
    items: ['项目资料库', '市场资料库', '政策税务库', '个人经验库', 'AI提示词库']
  }
] as const;

export default function KnowledgePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 1280 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">个人知识库</p>
          <h1 className="title">成本 / 招采 / 合约知识库中心</h1>
          <p className="subtitle">这里沉淀跨项目复用的个人资料和经验，后续接入上传、标签、全文检索、AI问答和项目调用。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/projects" className="btn">返回项目中心</Link>
          <Link href="/templates" className="btn">系统模板</Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16, borderColor: '#c5eef3' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {[
            ['资料上传', '待接入'],
            ['标签分类', '待接入'],
            ['全文检索', '待接入'],
            ['AI问答', '待接入'],
            ['项目调用', '待接入']
          ].map(([name, status]) => <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: '#fff' }}>
            <div className="meta">{status}</div>
            <b style={{ display: 'block', marginTop: 6 }}>{name}</b>
          </div>)}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {knowledgeGroups.map((group) => <section key={group.title} className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0 }}>{group.title}</h2>
            <span className="badge">待接入</span>
          </div>
          <p className="meta" style={{ minHeight: 46 }}>{group.desc}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {group.items.map((item) => <span key={item} style={{ border: '1px solid #c5eef3', background: '#e9f7f8', color: '#0f4c5c', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>{item}</span>)}
          </div>
        </section>)}
      </div>
    </div>
  </main>;
}
