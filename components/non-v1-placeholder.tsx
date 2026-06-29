import Link from 'next/link';

export function NonV1Placeholder({ projectId }: { projectId: string }) {
  return (
    <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <section className="card" style={{ borderColor: '#d0d5dd' }}>
          <p className="eyebrow">后续版本能力</p>
          <h1 className="title">后续版本能力</h1>
          <p className="subtitle">该功能不属于 V1.0.0 范围，后续版本再开放。当前 V1.0.0 仅保留地产目标成本测算主流程。</p>
          <p className="meta">如需继续测算，请使用项目概况、目标成本测算、收入明细、成本明细、税金测算、业态利润分析或 Excel 工作台。</p>
          <div className="actions">
            <Link href={`/projects/${projectId}`} className="btn btn-primary">返回项目测算中心</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
