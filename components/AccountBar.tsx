import Link from 'next/link';
import { cookies } from 'next/headers';
import type { CSSProperties } from 'react';

export function AccountBar() {
  const userId = cookies().get('lqdc_session')?.value;
  if (!userId) return null;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#102a43', color: '#fff', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link href="/projects" style={{ color: '#fff', fontWeight: 900, whiteSpace: 'nowrap' }}>地产成本智算平台</Link>
          <span style={{ opacity: .55 }}>｜</span>
          <span style={{ opacity: .82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>个人工作台</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/projects" style={navLink}>项目中心</Link>
          <Link href="/knowledge" style={navLink}>个人知识库</Link>
          <Link href="/templates" style={navLink}>系统模板</Link>
          <Link href="/account" style={navLink}>个人账户</Link>
          <form action="/api/auth/logout" method="post" style={{ margin: 0 }}>
            <button type="submit" style={{ ...navLink, border: '1px solid rgba(255,255,255,.28)', cursor: 'pointer' }}>退出登录</button>
          </form>
        </nav>
      </div>
    </div>
  );
}

const navLink: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontSize: 13,
  lineHeight: '28px',
  minHeight: 28,
  padding: '0 10px',
  borderRadius: 8,
  background: 'rgba(255,255,255,.08)',
  whiteSpace: 'nowrap'
};
