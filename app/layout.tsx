import './globals.css';
import type { Metadata } from 'next';
import { AccountBar } from '@/components/AccountBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '地产成本智算平台',
  description: '面向个人和小团队的地产成本、招采、合约知识库与项目测算工具'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AccountBar />
        {children}
      </body>
    </html>
  );
}
