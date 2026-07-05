'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TrashProject = {
  id: string;
  name: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  versionCount?: number;
  versionsCount?: number;
};

type EmptyState = {
  reason: string;
  nextAction: string;
};

type TrashResponse = {
  success?: boolean;
  projects?: TrashProject[];
  emptyState?: EmptyState | null;
  error?: { message?: string };
};

const trashUpdatedEvent = 'project-trash-updated';

function formatDate(value?: string | null) {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function readError(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return fallback;
}

export function MoveProjectToTrashButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit() {
    setStatus('saving');
    setMessage('正在移入回收站...');
    const form = new FormData();
    form.set('deleteReason', reason);

    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, { method: 'POST', body: form });
      if (!response.ok) throw new Error('项目移入回收站失败。');

      setStatus('success');
      setMessage('项目已移入回收站。');
      setOpen(false);
      setReason('');
      window.dispatchEvent(new Event(trashUpdatedEvent));
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '项目移入回收站失败。');
    }
  }

  return <>
    <button type="button" className="btn" style={{ color: '#c92a2a', background: '#fff5f5', borderColor: '#ffc9c9' }} onClick={() => { setOpen(true); setStatus('idle'); setMessage(''); }}>移入回收站</button>
    {message ? <span className="meta" style={{ color: status === 'error' ? '#c92a2a' : '#2b8a3e' }}>{message}</span> : null}
    {open ? <div role="dialog" aria-modal="true" aria-label="确认移入回收站" style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(16,32,51,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: 'min(520px, 100%)', background: '#fff', margin: 0 }}>
        <p className="eyebrow">确认操作</p>
        <h2 style={{ marginTop: 0 }}>移入回收站</h2>
        <p className="meta">项目“{projectName}”将从正常项目列表移除，可在回收站中恢复。不会物理删除数据。</p>
        <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>
          <span style={{ fontWeight: 800 }}>移入原因（可选）</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="可选" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10, resize: 'vertical' }} />
        </label>
        {message ? <div style={{ marginTop: 12, color: status === 'error' ? '#c92a2a' : '#2b8a3e' }}>{message}</div> : null}
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" disabled={status === 'saving'} onClick={() => setOpen(false)}>取消</button>
          <button type="button" className="btn btn-primary" disabled={status === 'saving'} onClick={submit}>{status === 'saving' ? '移入中...' : '确认移入回收站'}</button>
        </div>
      </div>
    </div> : null}
  </>;
}

export function ProjectTrashPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<TrashProject[]>([]);
  const [emptyState, setEmptyState] = useState<EmptyState | null>(null);
  const [message, setMessage] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function loadTrash() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/projects/trash', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as TrashResponse;
      if (!response.ok || body.success === false) throw new Error(readError(body, '回收站读取失败。'));
      setProjects(body.projects || []);
      setEmptyState(body.emptyState || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '回收站读取失败。');
    } finally {
      setLoading(false);
    }
  }

  async function restore(projectId: string) {
    setRestoringId(projectId);
    setMessage('正在恢复项目...');
    try {
      const response = await fetch(`/api/projects/${projectId}/restore`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) throw new Error(readError(body, '项目恢复失败。'));

      setMessage('项目已恢复。');
      await loadTrash();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '项目恢复失败。');
    } finally {
      setRestoringId(null);
    }
  }

  useEffect(() => {
    if (open) void loadTrash();
  }, [open]);

  useEffect(() => {
    function handleTrashUpdated() {
      if (open) void loadTrash();
    }
    window.addEventListener(trashUpdatedEvent, handleTrashUpdated);
    return () => window.removeEventListener(trashUpdatedEvent, handleTrashUpdated);
  }, [open]);

  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
    <button type="button" className="btn" onClick={() => setOpen((value) => !value)}>{open ? '收起项目回收站' : '查看项目回收站'}</button>
    {open ? <section className="card" style={{ width: 'min(760px, calc(100vw - 32px))', margin: 0, textAlign: 'left', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div>
          <p className="eyebrow">项目回收站</p>
          <h2 style={{ margin: 0 }}>已移入回收站项目</h2>
        </div>
        <button type="button" className="btn" disabled={loading} onClick={loadTrash}>{loading ? '刷新中...' : '刷新'}</button>
      </div>
      {message ? <div style={{ marginBottom: 10, color: message.includes('失败') ? '#c92a2a' : '#2b8a3e' }}>{message}</div> : null}
      {loading ? <p className="meta">正在读取回收站...</p> : null}
      {!loading && projects.length === 0 ? <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
        <b>{emptyState?.reason || '回收站暂无项目'}</b>
        <p className="meta" style={{ marginBottom: 0 }}>{emptyState?.nextAction || '删除项目后会在这里显示，可在此恢复。'}</p>
      </div> : null}
      {!loading && projects.length > 0 ? <div style={{ display: 'grid', gap: 10 }}>
        {projects.map((project) => <article key={project.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
          <div>
            <b>{project.name}</b>
            <div className="meta">移入时间：{formatDate(project.deletedAt)} · 版本数：{project.versionCount ?? project.versionsCount ?? 0}</div>
            <div className="meta">移入原因：{project.deleteReason || '未填写'}</div>
          </div>
          <button type="button" className="btn btn-primary" disabled={restoringId === project.id} onClick={() => restore(project.id)}>{restoringId === project.id ? '恢复中...' : '恢复项目'}</button>
        </article>)}
      </div> : null}
    </section> : null}
  </div>;
}
