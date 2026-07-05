import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TemplateRulesPage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 860 }}>
      <section className="card" style={{ borderColor: '#d0d5dd' }}>
        <p className="eyebrow">模板中心</p>
        <h1 className="title">模板规则暂未开放</h1>
        <p className="subtitle">当前 V1 先使用内置住宅开发目标成本标准模板。模板规则维护将在后续版本开放。</p>
        <div className="actions">
          <Link href="/projects" className="btn btn-primary">返回项目中心</Link>
        </div>
      </section>
    </div>
  </main>;
}
