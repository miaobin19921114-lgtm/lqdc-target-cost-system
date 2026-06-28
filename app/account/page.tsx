import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function roleName(role: string) {
  if (role === 'admin') return '管理员';
  if (role === 'editor') return '编辑者';
  return '查看者';
}

export default async function AccountPage() {
  const userId = cookies().get('lqdc_session')?.value;
  const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, role: true, createdAt: true }
  }) : null;

  if (!user) return <main className="page">账户不存在或登录已失效，请重新登录。</main>;

  const rows = [
    ['姓名', user.name || '-'],
    ['邮箱', user.email || '-'],
    ['手机号', user.phone || '-'],
    ['角色', roleName(user.role)],
    ['创建时间', user.createdAt.toLocaleString('zh-CN')]
  ];

  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 960 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">个人账户</p>
          <h1 className="title">{user.name || user.email}</h1>
          <p className="subtitle">这里用于查看当前登录账户、进入模板中心和退出登录。后续可继续增加个人模板、地区指标库和账户设置。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/projects" className="btn btn-primary">返回项目中心</Link>
          <Link href="/templates" className="btn">模板中心</Link>
          <Link href="/projects" className="btn">项目列表</Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>账户信息</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <tbody>
              {rows.map(([name, value]) => <tr key={name}>
                <td style={{ padding: 12, borderBottom: '1px solid var(--border)', color: 'var(--muted)', width: 160 }}>{name}</td>
                <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{value}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>快捷入口</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
          <Link href="/projects" className="btn btn-primary">项目中心</Link>
          <Link href="/projects/new" className="btn">新建项目</Link>
          <Link href="/projects" className="btn">项目列表</Link>
          <Link href="/templates" className="btn">个人模板</Link>
          <form action="/api/auth/logout" method="post" style={{ margin: 0 }}>
            <button className="btn" style={{ width: '100%' }}>退出登录</button>
          </form>
        </div>
      </section>
    </div>
  </main>;
}
