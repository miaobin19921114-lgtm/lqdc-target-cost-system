import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const toneStyle: Record<Tone, { border: string; background: string; color: string }> = {
  info: { border: '#d0ebff', background: '#f8fbff', color: '#0b7285' },
  success: { border: '#b2f2bb', background: '#f0fff4', color: '#2b8a3e' },
  warning: { border: '#ffd8a8', background: '#fff9db', color: '#d9480f' },
  danger: { border: '#ffc9c9', background: '#fff5f5', color: '#c92a2a' },
  neutral: { border: '#d9e2ec', background: '#f8fafc', color: '#475467' }
};

export function versionStatusLabel(status?: string | null) {
  if (status === 'locked') return '已锁定';
  if (status === 'final') return '已定版';
  if (status === 'draft') return '可编辑';
  return status || '未设置';
}

export function isLockedStatus(status?: string | null) {
  return status === 'locked' || status === 'final';
}

export function StatusNotice({ title, children, tone = 'info', style }: { title: ReactNode; children?: ReactNode; tone?: Tone; style?: React.CSSProperties }) {
  const toneValue = toneStyle[tone];
  return <section className="card" style={{ marginBottom: 14, borderColor: toneValue.border, background: toneValue.background, ...style }}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: toneValue.color, marginTop: 8, flex: '0 0 auto' }} />
      <div>
        <b style={{ color: toneValue.color }}>{title}</b>
        {children ? <div className="meta" style={{ marginTop: 6, lineHeight: 1.7 }}>{children}</div> : null}
      </div>
    </div>
  </section>;
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, background: '#fbfdff', textAlign: 'center' }}>
    <b>{title}</b>
    {children ? <p className="meta" style={{ margin: '8px auto 0', maxWidth: 680, lineHeight: 1.7 }}>{children}</p> : null}
    {action ? <div className="actions" style={{ marginTop: 12, justifyContent: 'center' }}>{action}</div> : null}
  </div>;
}

export function VersionContextBar({
  projectName,
  versionName,
  versionStatus,
  editable,
  extra
}: {
  projectName: string;
  versionName?: string | null;
  versionStatus?: string | null;
  editable?: boolean;
  extra?: Array<readonly [string, ReactNode]>;
}) {
  const locked = isLockedStatus(versionStatus) || editable === false;
  return <section className="card" style={{ marginBottom: 14, borderColor: locked ? '#ffc9c9' : '#d0ebff', background: locked ? '#fff5f5' : '#f8fbff' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
      <div><div className="meta">当前项目</div><b>{projectName}</b></div>
      <div><div className="meta">当前版本</div><b>{versionName || '暂无版本'}</b></div>
      <div><div className="meta">版本状态</div><b>{versionStatusLabel(versionStatus)}</b></div>
      <div><div className="meta">编辑状态</div><b>{locked ? '只读' : '可编辑'}</b></div>
      {extra?.map(([label, value]) => <div key={label}><div className="meta">{label}</div><b>{value}</b></div>)}
    </div>
    {locked ? <p className="meta" style={{ margin: '8px 0 0', color: '#c92a2a' }}>当前版本已锁定，页面展示结果可查看，涉及保存、恢复、刷新或改写数据的操作不可执行。</p> : null}
  </section>;
}
