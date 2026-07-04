'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  formId: string;
  endpoint: string;
  locked?: boolean;
  successMessage?: string;
  children?: React.ReactNode;
};

const metricCenterListSections = new Set(['productObjectMetrics', 'buildingMetrics', 'unitPlanMetrics']);

function setPath(target: Record<string, any>, path: string, value: unknown) {
  const parts = path.split('.');
  let cursor: any = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const next = parts[index + 1];
    if (/^\d+$/.test(next)) cursor[part] = cursor[part] || [];
    else cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function hasFilledValue(row: Record<string, unknown>) {
  return Object.values(row || {}).some((value) => value !== null && value !== undefined && value !== '' && value !== false);
}

function compactMetricCenterPayload(payload: Record<string, any>) {
  for (const section of metricCenterListSections) {
    if (Array.isArray(payload[section])) payload[section] = payload[section].filter(hasFilledValue);
  }
  return payload;
}

function inputValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (input instanceof HTMLInputElement && input.type === 'checkbox') return input.checked;
  if (input instanceof HTMLInputElement && input.type === 'number') return input.value === '' ? null : Number(input.value);
  return input.value;
}

export function ProfileSectionForm({ formId, endpoint, locked = false, successMessage = '已保存。', children }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'success' | 'danger' | 'info'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) {
      setTone('danger');
      setMessage('当前版本已锁定，本分区不可保存。');
      return;
    }
    if (isPending || isSaving) return;
    const form = event.currentTarget;
    const payload: Record<string, any> = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[name], textarea[name], select[name]').forEach((input) => {
      if (input.disabled) return;
      setPath(payload, input.name, inputValue(input));
    });
    setIsSaving(true);
    setTone('info');
    setMessage('保存中...');
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(compactMetricCenterPayload(payload))
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        setTone('danger');
        setMessage(result?.error?.message || '保存失败。');
        return;
      }
      setTone('success');
      setMessage(successMessage);
      startTransition(() => router.refresh());
    } catch {
      setTone('danger');
      setMessage('保存失败，请检查网络或稍后重试。');
    } finally {
      setIsSaving(false);
    }
  }

  const color = tone === 'danger' ? '#c92a2a' : tone === 'success' ? '#2b8a3e' : '#0b7285';
  return <form id={formId} onSubmit={submit}>
    {children}
    {message ? <div role="status" className="meta" style={{ marginTop: 10, color }}>{message}</div> : null}
  </form>;
}

export function MetricCenterSyncAction({ endpoint, locked }: { endpoint: string; locked?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  async function run() {
    if (locked || isPending) return;
    const response = await fetch(endpoint, { method: 'POST' });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      setMessage(result?.error?.message || '基础指标映射刷新失败。');
      return;
    }
    const count = result?.data?.syncedCount;
    setMessage(typeof count === 'number' ? `已同步 ${count} 条基础指标映射。` : '已刷新基础指标映射。');
    startTransition(() => router.refresh());
  }

  return <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
    <button type="button" className="btn btn-primary" disabled={locked || isPending} onClick={run}>同步到工程量基础指标</button>
    {message ? <span className="meta" style={{ color: message.includes('失败') ? '#c92a2a' : '#2b8a3e' }}>{message}</span> : null}
  </span>;
}

export function ProfileObjectAction({
  endpoint,
  objectCode,
  objectName,
  objectType,
  objectCategory,
  isEnabled,
  locked,
  disabled,
  label
}: {
  endpoint: string;
  objectCode: string;
  objectName: string;
  objectType: string;
  objectCategory?: string | null;
  isEnabled: boolean;
  locked?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  async function run() {
    if (locked || disabled || isPending) return;
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        objects: [{ objectCode, objectName, objectType, objectCategory, isEnabled, operationReason: '项目概况五分区页面调整' }]
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      setMessage(result?.error?.message || '操作失败。');
      return;
    }
    setMessage('已更新。');
    startTransition(() => router.refresh());
  }

  return <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
    <button type="button" className={isEnabled ? 'btn btn-primary' : 'btn'} disabled={locked || disabled || isPending} onClick={run} style={{ minHeight: 30, padding: '4px 10px' }}>{label}</button>
    {message ? <span className="meta">{message}</span> : null}
  </span>;
}
