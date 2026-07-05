'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { projectNavLabelMap } from '@/components/project-navigation';
import { PriceIndicatorEnhancer } from '@/components/price-indicator-enhancer';

export function ProjectRouteNav({ projectId, projectName }: { projectId: string; projectName: string }) {
  const segment = useSelectedLayoutSegment();
  if (!segment) return null;

  const current = projectNavLabelMap[segment] || '项目页面';

  return <>
    <PriceIndicatorEnhancer projectId={projectId} />
    <div className="no-print project-single-nav" style={{ background: '#102a43', color: '#fff', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto', minHeight: 48, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Link href="/projects" style={{ color: '#fff', fontWeight: 900, whiteSpace: 'nowrap' }}>地产目标成本测算平台</Link>
          <span style={{ opacity: .45 }}>｜</span>
          <Link href={`/projects/${projectId}`} style={{ color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' }}>项目测算中心</Link>
          <span style={{ opacity: .45 }}>｜</span>
          <b style={{ color: '#fff', whiteSpace: 'nowrap' }}>{current}</b>
          <span style={{ opacity: .7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/projects/${projectId}`} style={topLink}>项目测算中心</Link>
          <Link href="/projects" style={topLink}>项目中心</Link>
        </div>
      </div>
    </div>
  </>;
}

const topLink = {
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
