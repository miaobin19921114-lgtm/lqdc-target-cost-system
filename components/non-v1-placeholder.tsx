import Link from 'next/link';
import { NON_V1_SCOPE_MESSAGE } from '@/lib/v1-maintenance-copy';

export function NonV1Placeholder({ projectId }: { projectId: string }) {
  return (
    <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <section className="card" style={{ borderColor: '#d0d5dd' }}>
          <p className="eyebrow">暂未开放</p>
          <h1 className="title">能力暂未开放</h1>
          <p className="subtitle">{NON_V1_SCOPE_MESSAGE}</p>
          <div className="actions">
            <Link href={`/projects/${projectId}`} className="btn btn-primary">返回项目测算中心</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
