import Link from 'next/link';

function normalizeNext(value?: string) {
  if (!value) return '/projects';
  if (value === '/workspace') return '/projects';
  if (value.includes('/dashboard-lite')) return '/projects';
  if (value.includes('/boss-report')) return '/projects';
  if (value.includes('/sensitivity')) return '/projects';
  if (value.includes('/tax-report')) return '/projects';
  return value;
}

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; wechat?: string; next?: string } }) {
  const next = normalizeNext(searchParams?.next);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr .95fr', background: 'linear-gradient(135deg,#0f3a4a 0%,#1f6f78 48%,#eef3f8 48%,#eef3f8 100%)' }}>
      <section style={{ color: '#fff', padding: '72px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: '#12b5cb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22 }}>成</div>
        <h1 style={{ fontSize: 42, lineHeight: 1.12, margin: '24px 0 12px' }}>地产成本<br />智算平台</h1>
        <p style={{ maxWidth: 560, color: 'rgba(255,255,255,.78)', fontSize: 16 }}>面向个人和小团队的地产目标成本测算工具。V1 聚焦项目中心、项目测算中心、Excel 工作台和系统自检主流程。</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, maxWidth: 560, marginTop: 34 }}>
          {['项目测算', 'Excel 导入导出', '系统自检'].map((item) => <div key={item} style={{ border: '1px solid rgba(255,255,255,.22)', borderRadius: 14, padding: 14, background: 'rgba(255,255,255,.08)' }}>{item}</div>)}
        </div>
      </section>
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 430, background: '#fff', border: '1px solid #d9e2ec', borderRadius: 22, boxShadow: '0 24px 70px rgba(15,58,74,.18)', padding: 30 }}>
          <p style={{ margin: 0, color: '#0f4c5c', fontWeight: 900, fontSize: 13 }}>地产成本智算平台</p>
          <h2 style={{ margin: '8px 0 6px', fontSize: 28 }}>登录项目中心</h2>
          <p className="meta" style={{ marginBottom: 18 }}>支持邮箱 / 手机号 + 密码登录。登录后直接进入项目中心。</p>
          <div style={{ background: '#fff9db', border: '1px solid #ffd8a8', color: '#8a6d00', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 }}>当前版本暂未开放注册，如需新增账号请由管理员后台创建。</div>
          {searchParams?.error ? <div style={{ background: '#fff5f5', border: '1px solid #ffc9c9', color: '#c92a2a', borderRadius: 10, padding: 10, marginBottom: 12 }}>账号或密码不正确。</div> : null}
          {searchParams?.wechat === 'unconfigured' ? <div style={{ background: '#fff7e6', border: '1px solid #ffd8a8', color: '#9a5b00', borderRadius: 10, padding: 10, marginBottom: 12 }}>微信登录尚未配置 AppID / 回调地址，暂时不可用。</div> : null}
          <form action="/api/auth/login" method="post" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <input type="hidden" name="next" value={next} />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#475467' }}>邮箱 / 手机号<input name="identifier" placeholder="请输入邮箱或手机号" required style={{ height: 42, border: '1px solid #d9e2ec', borderRadius: 10, padding: '0 12px', fontSize: 15 }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#475467' }}>密码<input name="password" type="password" placeholder="请输入密码" required style={{ height: 42, border: '1px solid #d9e2ec', borderRadius: 10, padding: '0 12px', fontSize: 15 }} /></label>
            <button style={{ height: 44, border: 0, borderRadius: 12, background: '#0f4c5c', color: '#fff', fontWeight: 900, fontSize: 15 }}>登录项目中心</button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', color: '#98a2b3', fontSize: 12 }}><span style={{ height: 1, background: '#eef2f6', flex: 1 }} />其他方式<span style={{ height: 1, background: '#eef2f6', flex: 1 }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link href="/api/auth/wechat" style={{ height: 42, borderRadius: 10, border: '1px solid #d9e2ec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1b7f3a', fontWeight: 800 }}>微信登录</Link>
            <button disabled style={{ height: 42, borderRadius: 10, border: '1px solid #d9e2ec', background: '#f8fafc', color: '#98a2b3', fontWeight: 800 }}>短信验证码</button>
          </div>
          <p className="meta" style={{ marginTop: 16 }}>暂无开放注册入口。</p>
        </div>
      </section>
    </main>
  );
}
