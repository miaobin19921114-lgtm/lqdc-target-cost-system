import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SensitivityPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const scenarios = [
    { name: '售价下降 5%', effect: '收入下降，净利率承压', level: '重点关注' },
    { name: '建安成本上升 5%', effect: '目标成本上升，利润减少', level: '重点关注' },
    { name: '土地成本上升 3%', effect: '土增税和净利同步受影响', level: '关注' },
    { name: '去化周期延长 3 个月', effect: '财务费用和资金压力上升', level: '关注' }
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1100 }}>
    <div className="page-header"><div><p className="eyebrow">敏感性测算</p><h1 className="title">{project.name}</h1><p className="subtitle">页面入口已恢复。当前先展示常用敏感性场景，后续再恢复自动联动收入、成本、税费、利润的量化测算。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    <section className="card"><h2>常用敏感性场景</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr>{['场景', '影响方向', '关注等级'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{scenarios.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.effect}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900, color: row.level === '重点关注' ? '#e03131' : '#f08c00' }}>{row.level}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
