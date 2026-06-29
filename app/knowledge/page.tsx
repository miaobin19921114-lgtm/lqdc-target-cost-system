import Link from 'next/link';
import { NON_V1_SCOPE_MESSAGE } from '@/lib/v1-maintenance-copy';

export const dynamic = 'force-dynamic';

export default function KnowledgePage() {
  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 860 }}>
      <section className="card" style={{ borderColor: '#d0d5dd' }}>
        <p className="eyebrow">后续版本能力</p>
        <h1 className="title">后续版本能力</h1>
        <p className="subtitle">{NON_V1_SCOPE_MESSAGE}</p>
        <div className="actions">
          <Link href="/projects" className="btn btn-primary">返回项目中心</Link>
        </div>
      </section>
    </div>
  </main>;
}
