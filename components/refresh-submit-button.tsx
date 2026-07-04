'use client';

import { useFormStatus } from 'react-dom';

export function RefreshSubmitButton({ children, pendingText = '刷新中...', disabled = false }: { children: string; pendingText?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending || disabled} style={{ minWidth: 132 }}>
    {pending ? pendingText : children}
  </button>;
}
