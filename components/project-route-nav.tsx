'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { projectNavLabelMap } from '@/components/project-navigation';

export function ProjectRouteNav({ projectId, projectName }: { projectId: string; projectName: string }) {
  const segment = useSelectedLayoutSegment();
  if (!segment) return null;

  const current = projectNavLabelMap[segment] || '项目页面';

  return <div className="no-print" style={{ background: '#eef3f8', borderBottom: '1px solid #d9e2ec' }}>
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ color: '#667085', fontSize: 13, lineHeight: 1.8 }}>
        <Link href="/projects" style={{ color: '#0b7285', fontWeight: 800 }}>项目中心</Link>
        <span> › </span>
        <Link href={`/projects/${projectId}`} style={{ color: '#0b7285', fontWeight: 800 }}>项目测算中心</Link>
        <span> › </span>
        <b style={{ color: '#102033' }}>{current}</b>
        <span style={{ color: '#98a2b3' }}>　{projectName}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/projects/${projectId}`} className="btn">返回项目测算中心</Link>
        <Link href={`/projects/${projectId}/dashboard-lite`} className="btn">返回经营总控</Link>
        <Link href="/projects" className="btn">返回项目中心</Link>
      </div>
    </div>
  </div>;
}
