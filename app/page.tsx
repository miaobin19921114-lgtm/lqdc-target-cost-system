import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="hero">
      <section className="hero-card">
        <p className="eyebrow">源信达</p>
        <h1 className="title">地产目标成本测算系统</h1>
        <p className="subtitle">
          面向个人和小团队，专注地产项目概况、业态模板、收入明细、目标成本、税金分摊和汇总管理。
          登录后才能查看项目数据。
        </p>
        <div className="actions">
          <Link href="/login" className="btn btn-primary">登录系统</Link>
        </div>
      </section>
    </main>
  );
}
