import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 860 }}>
      <section className="card" style={{ borderColor: '#d0d5dd' }}>
        <p className="eyebrow">后续版本能力</p>
        <h1 className="title">后续版本能力</h1>
        <p className="subtitle">该功能不属于 V1.0.0 范围，后续版本再开放。</p>
        <div className="actions">
          <Link href="/projects" className="btn btn-primary">返回项目测算中心</Link>
        </div>
      </section>
    </div>
  </main>;
}
