import Link from 'next/link';

export default function ExportPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen p-6">
      <section className="max-w-2xl mx-auto bg-white border rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Excel 导入导出</h1>
        <p className="text-gray-500 mt-2">当前为入口占位。后续会按最终目标成本测算模板解析和导出。</p>
        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 border rounded-lg">上传 Excel</button>
          <a href={`/api/export?projectId=${params.id}`} className="px-4 py-2 bg-brand text-white rounded-lg">导出示例 Excel</a>
        </div>
        <Link href={`/projects/${params.id}`} className="block mt-6 text-brand">返回工作台</Link>
      </section>
    </main>
  );
}
