import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function KnowledgePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 860 }}>
      <section className="card" style={{ borderColor: '#d0d5dd' }}>
        <p className="eyebrow">帮助文档</p>
        <h1 className="title">帮助文档暂未开放</h1>
        <p className="subtitle">当前 V1 先保留帮助文档入口。正式操作手册、模板说明和常见问题将在后续版本补齐。</p>
        <div className="actions">
          <Link href="/projects" className="btn btn-primary">返回项目中心</Link>
        </div>
      </section>
    </div>
  </main>;
}
