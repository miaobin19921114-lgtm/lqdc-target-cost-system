'use client';

import { type DetailsHTMLAttributes, type ReactNode, type SyntheticEvent, useEffect, useState } from 'react';

type PersistedDetailsProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'open' | 'onToggle'> & {
  storageKey: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function PersistedDetails({
  storageKey,
  defaultOpen = true,
  children,
  ...detailsProps
}: PersistedDetailsProps) {
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

  return <details {...detailsProps} open={open} onToggle={handleToggle}>{children}</details>;
}
