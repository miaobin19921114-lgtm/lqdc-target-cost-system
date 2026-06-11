import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-3xl w-full bg-white rounded-2xl shadow-sm border p-8">
        <p className="text-sm text-brand font-semibold">龙泉地产</p>
        <h1 className="text-3xl font-bold mt-2">目标成本测算系统</h1>
        <p className="mt-4 text-gray-600">当前为基础线上运行环境：登录、项目列表、Excel 导入导出入口已搭建。后续可继续固化最终 Excel 模板业务规则。</p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="px-5 py-3 rounded-lg bg-brand text-white">登录系统</Link>
          <Link href="/projects" className="px-5 py-3 rounded-lg border">查看项目</Link>
        </div>
      </section>
    </main>
  );
}
