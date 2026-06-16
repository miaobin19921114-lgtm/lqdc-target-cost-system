import './globals.css';
import type { Metadata } from 'next';
import { AccountBar } from '@/components/AccountBar';

export const metadata: Metadata = {
  title: '源信达地产目标成本测算系统',
  description: '面向个人和小团队的地产项目目标成本测算、收入测算、税金测算和版本管理系统'
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
