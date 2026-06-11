import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="hero">
      <section className="hero-card">
        <p className="eyebrow">龙泉地产</p>
        <h1 className="title">目标成本测算系统</h1>
        <p className="subtitle">
          已完成线上基础环境搭建：项目管理、数据库、登录入口、Excel 导入导出入口已跑通。
          下一步将按最终 V57 模板固化收入、成本、税金、分摊和汇总逻辑。
        </p>
        <div className="actions">
          <Link href="/login" className="btn btn-primary">登录系统</Link>
          <Link href="/projects" className="btn">查看项目</Link>
        </div>
      </section>
    </main>
  );
}
