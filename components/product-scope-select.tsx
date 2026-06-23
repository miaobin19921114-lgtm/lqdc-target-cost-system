'use client';

import { useMemo, useState } from 'react';

const boxStyle = { border: '1px solid #d9e2ec', borderRadius: 8, padding: 8, background: '#fff', minHeight: 34 };

export function ProductScopeSelect({
  name,
  label,
  products,
  value,
  note
}: {
  name: string;
  label: string;
  products: string[];
  value?: string | null;
  note?: string;
}) {
  const initial = useMemo(() => new Set(String(value || '').split(/[，,]/).map((item) => item.trim()).filter(Boolean)), [value]);
  const [selected, setSelected] = useState<Set<string>>(initial);
  const selectedText = Array.from(selected).join(',');

  function toggle(item: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>
    <span>{label}</span>
    <input form="overview-form" type="hidden" name={name} value={selectedText} />
    <div style={boxStyle}>
      {products.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {products.map((item) => <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={selected.has(item)} onChange={() => toggle(item)} />{item}
        </label>)}
      </div> : <span style={{ color: '#98a2b3' }}>请先启用业态</span>}
    </div>
    {note ? <span className="meta">{note}</span> : null}
  </div>;
}
