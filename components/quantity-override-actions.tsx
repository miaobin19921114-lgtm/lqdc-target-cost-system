'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const inputStyle = { height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px', width: 118 };
const disabledInputStyle = { ...inputStyle, background: '#f2f4f7', color: '#667085' };

type Props = {
  projectId: string;
  versionId: string;
  costLineId: string;
  currentQuantity: string;
  hasOverride: boolean;
  locked: boolean;
};

export function QuantityOverrideActions({ projectId, versionId, costLineId, currentQuantity, hasOverride, locked }: Props) {
  const router = useRouter();
  const [manualValue, setManualValue] = useState(hasOverride ? currentQuantity : '');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const disabled = locked || isPending;

  function refresh(messageText: string) {
    setMessage(messageText);
    startTransition(() => router.refresh());
  }

  async function saveOverride() {
    if (locked) return;
    if (manualValue.trim() === '') {
      setMessage('请输入手算覆盖值；空值表示未覆盖。');
      return;
    }
    if (!reason.trim()) {
      setMessage('请填写手算原因。');
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/versions/${versionId}/cost-lines/${costLineId}/quantity`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: manualValue, overrideReason: reason.trim() })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      setMessage(result?.error?.message || '保存手算覆盖失败。');
      return;
    }
    refresh('已保存手算覆盖。');
  }

  async function clearOverride() {
    if (locked || !hasOverride) return;
    const response = await fetch(`/api/projects/${projectId}/versions/${versionId}/cost-lines/${costLineId}/restore-auto`, { method: 'POST' });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      setMessage(result?.error?.message || '恢复系统值失败。');
      return;
    }
    setManualValue('');
    refresh('已恢复系统值。');
  }

  return <div style={{ display: 'grid', gridTemplateColumns: '118px minmax(130px, 1fr)', gap: 6, alignItems: 'center' }}>
    <input
      type="number"
      step="0.01"
      value={manualValue}
      onChange={(event) => setManualValue(event.target.value)}
      disabled={disabled}
      placeholder="空值未覆盖"
      style={disabled ? disabledInputStyle : inputStyle}
      aria-label="手算覆盖值"
    />
    <input
      value={reason}
      onChange={(event) => setReason(event.target.value)}
      disabled={disabled}
      placeholder="手算原因"
      style={{ ...(disabled ? disabledInputStyle : inputStyle), width: '100%', minWidth: 130 }}
      aria-label="手算原因"
    />
    <button type="button" className="btn btn-primary" onClick={saveOverride} disabled={disabled} style={{ minHeight: 30, padding: '4px 10px' }}>保存覆盖</button>
    <button type="button" className="btn" onClick={clearOverride} disabled={disabled || !hasOverride} style={{ minHeight: 30, padding: '4px 10px' }}>恢复系统值</button>
    {locked ? <div className="meta" style={{ gridColumn: '1 / -1', color: '#c92a2a' }}>当前版本已锁定</div> : message ? <div className="meta" style={{ gridColumn: '1 / -1' }}>{message}</div> : null}
  </div>;
}
