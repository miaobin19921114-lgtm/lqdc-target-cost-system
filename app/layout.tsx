import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '九坤地产目标成本测算系统',
  description: '地产开发项目目标成本测算、收入测算、税金测算和版本管理系统'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
