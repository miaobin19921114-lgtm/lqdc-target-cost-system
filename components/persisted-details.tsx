'use client';

import { type CSSProperties, type ReactNode, type SyntheticEvent, useEffect, useState } from 'react';

export function PersistedDetails({
  storageKey,
  defaultOpen = true,
  style,
  children
}: {
  storageKey: string;
  defaultOpen?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === 'open') setOpen(true);
      if (saved === 'closed') setOpen(false);
    } catch {
      // Ignore localStorage errors in private mode or restricted browsers.
    }
  }, [storageKey]);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    try {
      window.localStorage.setItem(storageKey, nextOpen ? 'open' : 'closed');
    } catch {
      // Ignore localStorage errors in private mode or restricted browsers.
    }
  }

  return <details open={open} onToggle={handleToggle} style={style}>{children}</details>;
}
