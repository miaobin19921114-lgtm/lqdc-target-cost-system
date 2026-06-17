import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="hero">
      <section className="hero-card">
        <p className="eyebrow">地产成本智算平台</p>
        <h1 className="title">个人地产成本、招采、合约知识库与测算工具</h1>
        <p className="subtitle">
          面向个人和小团队，沉淀成本指标、工程量、招标文件、合同条款和审批表模板，
          支持项目概况、收入、目标成本、税务、投决和经营报告测算。
        </p>
        <div className="actions">
          <Link href="/login" className="btn btn-primary">进入系统</Link>
        </div>
      </section>
    </main>
  );
}
