'use client';

import { useFormStatus } from 'react-dom';

export function RefreshSubmitButton({ children, pendingText = '刷新中...' }: { children: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending} style={{ minWidth: 132 }}>
    {pending ? pendingText : children}
  </button>;
}
