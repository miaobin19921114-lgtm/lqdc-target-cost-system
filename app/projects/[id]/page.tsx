import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const modules = ['项目概况', '业态面积', '收入测算', '目标成本测算', '明细测算', '成本分摊', '税金计算', '目标成本汇总表', 'Excel导入', 'Excel导出'];

export default async function ProjectWorkBench({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, include: { versions: true } });
  if (!project) return <main className="p-6">项目不存在</main>;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-gray-500 mt-1">{project.city} · {project.district}</p>
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          {modules.map((name) => (
            <div key={name} className="bg-white border rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold">{name}</h2>
              <p className="text-sm text-gray-500 mt-2">入口已预留，后续接入定稿模板。</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/projects" className="text-brand">返回项目列表</Link>
        </div>
      </div>
    </main>
  );
}
