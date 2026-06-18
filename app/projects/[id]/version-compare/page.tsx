import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function statusText(status: string) {
  if (status === 'locked') return '已锁定';
  if (status === 'final') return '定稿';
  return '草稿';
}

function fmtDate(value: Date) {
  return new Date(value).toLocaleString('zh-CN');
}

export default async function VersionComparePage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const versions = await prisma.projectVersion.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true, costs: true, revenues: true } } }
  });

  const currentVersion = versions.find((version) => version.id === project.activeVersionId) || versions[0];
  const previousVersion = versions.find((version) => version.id !== currentVersion?.id);

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">版本对比</p><h1 className="title">{project.name}</h1><p className="subtitle">轻量版已恢复：先展示当前版本、上一版本和版本数据完整度。复杂利润差异后续再恢复。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/versions`} className="btn btn-primary">返回版本中心</Link><Link href={`/projects/${project.id}/summary`} className="btn">目标成本汇总</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <div className="summary-strip"><div className="stat"><div className="stat-label">当前版本</div><div className="stat-value" style={{ fontSize: 18 }}>{currentVersion?.name || '-'}</div></div><div className="stat"><div className="stat-label">上一版本</div><div className="stat-value" style={{ fontSize: 18 }}>{previousVersion?.name || '-'}</div></div><div className="stat"><div className="stat-label">版本数量</div><div className="stat-value">{versions.length}</div></div><div className="stat"><div className="stat-label">当前状态</div><div className="stat-value" style={{ fontSize: 18 }}>{currentVersion ? statusText(currentVersion.status) : '-'}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}><h2>版本列表</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['版本', '阶段', '状态', '业态数', '成本行', '收入行', '创建时间'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{versions.length ? versions.map((version) => <tr key={version.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{version.id === project.activeVersionId ? '当前｜' : ''}{version.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{version.stage || '-'}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{statusText(version.status)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{version._count.products}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{version._count.costs}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{version._count.revenues}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmtDate(version.createdAt)}</td></tr>) : <tr><td colSpan={7} style={{ padding: 12, color: 'var(--muted)' }}>暂无版本。</td></tr>}</tbody></table></div></section>
  </div></main>;
}
