import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function status(ok: boolean) {
  return ok ? { text: '正常', color: '#2f9e44' } : { text: '需补充', color: '#e03131' };
}

export default async function SummaryCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, costs: true, revenues: true, taxes: true }
  });

  const checks = [
    { name: '当前启用版本', ok: Boolean(version), note: version?.name || '未找到启用版本' },
    { name: '项目概况指标', ok: Boolean(project.totalBuildingArea || project.saleableArea), note: `总建面：${project.totalBuildingArea || '-'}；可售面积：${project.saleableArea || '-'}` },
    { name: '业态数据', ok: Boolean(version?.products.length), note: `业态数量：${version?.products.length || 0}` },
    { name: '成本明细', ok: Boolean(version?.costs.length), note: `成本行数：${version?.costs.length || 0}` },
    { name: '收入明细', ok: Boolean(version?.revenues.length), note: `收入行数：${version?.revenues.length || 0}` },
    { name: '税金参数', ok: Boolean(version?.taxes), note: version?.taxes ? '已配置税金参数' : '未配置税金参数' }
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">汇总联动校验</p><h1 className="title">{project.name}</h1><p className="subtitle">轻量版已恢复：检查当前版本、概况、业态、成本、收入、税金是否具备汇总计算基础。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary" href={`/projects/${project.id}/summary`}>目标成本汇总表</Link><Link className="btn" href={`/projects/${project.id}/tax-details`}>税金明细</Link><Link className="btn" href={`/projects/${project.id}`}>返回工作台</Link></div></div>
    <section className="card"><h2>联动检查项</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((item) => { const s = status(item.ok); return <tr key={item.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{item.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: s.color, fontWeight: 900 }}>{s.text}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{item.note}</td></tr>; })}</tbody></table></div></section>
    <section className="card" style={{ marginTop: 16 }}><h2>下一步恢复方向</h2><p>后续再补充：收入汇总与明细一致性、成本汇总与末级明细一致性、税金明细与汇总表一致性、分业态成本分摊一致性。</p></section>
  </div></main>;
}
