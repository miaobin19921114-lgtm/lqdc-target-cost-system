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

function setPath(target: Record<string, any>, path: string, value: unknown) {
  const parts = path.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function inputValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (input instanceof HTMLInputElement && input.type === 'checkbox') return input.checked;
  if (input instanceof HTMLInputElement && input.type === 'number') return input.value === '' ? null : Number(input.value);
  return input.value;
}

export function ProfileSectionForm({ formId, endpoint, locked = false, successMessage = '已保存。', children }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || isPending) return;
    const form = event.currentTarget;
    const payload: Record<string, any> = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[name], textarea[name], select[name]').forEach((input) => {
      if (input.disabled) return;
      setPath(payload, input.name, inputValue(input));
    });
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      setMessage(result?.error?.message || '保存失败。');
      return;
    }
    setMessage(successMessage);
    startTransition(() => router.refresh());
  }

  return <form id={formId} onSubmit={submit}>
    {children}
    {message ? <div className="meta" style={{ marginTop: 10, color: message.includes('失败') ? '#c92a2a' : '#2b8a3e' }}>{message}</div> : null}
  </form>;
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
