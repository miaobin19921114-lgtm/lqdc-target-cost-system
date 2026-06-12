import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="hero">
      <section className="hero-card">
        <p className="eyebrow">九坤地产</p>
        <h1 className="title">目标成本测算系统</h1>
        <p className="subtitle">
          已完成线上基础环境搭建：项目管理、数据库、登录入口、Excel 导入导出入口已跑通。
          当前已接入项目概况、业态面积、收入明细、目标成本、目标成本汇总和土地费用明细。
        </p>
        <div className="actions">
          <Link href="/login" className="btn btn-primary">登录系统</Link>
          <Link href="/projects" className="btn">查看项目</Link>
        </div>
      </section>
    </main>
  );
}
