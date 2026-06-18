import { getHealthStatus } from '@/lib/health';

export const dynamic = 'force-dynamic';

function badgeColor(status: string) {
  if (status === 'ok') return '#2f9e44';
  if (status === 'warning') return '#f08c00';
  return '#e03131';
}

function statusText(status: string) {
  if (status === 'ok') return '正常';
  if (status === 'warning') return '提醒';
  return '异常';
}

export default async function HealthPage() {
  const health = await getHealthStatus();

  return <main className="page"><div className="container" style={{ maxWidth: 980 }}>
    <div className="page-header"><div><p className="eyebrow">系统自检</p><h1 className="title">Health Check</h1><p className="subtitle">检查数据库连接、关键环境变量和上传目录权限。</p></div><div className="actions" style={{ marginTop: 0 }}><a className="btn btn-primary" href="/api/health">查看 JSON</a><a className="btn" href="/projects">项目列表</a></div></div>
    <section className="card" style={{ marginBottom: 16 }}><h2>整体状态</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}><div><div className="meta">状态</div><div style={{ fontSize: 26, fontWeight: 900, color: badgeColor(health.status) }}>{statusText(health.status)}</div></div><div><div className="meta">服务</div><div style={{ fontWeight: 900 }}>{health.service}</div></div><div><div className="meta">运行时间</div><div style={{ fontWeight: 900 }}>{health.uptime}s</div></div><div><div className="meta">检查时间</div><div style={{ fontWeight: 900 }}>{new Date(health.timestamp).toLocaleString('zh-CN')}</div></div></div></section>
    <section className="card"><h2>检查项</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{health.checks.map((check) => <tr key={check.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{check.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: badgeColor(check.status), fontWeight: 900 }}>{statusText(check.status)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{check.message}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
