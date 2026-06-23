'use client';

import { useMemo, useState } from 'react';

const boxStyle = { border: '1px solid #d9e2ec', borderRadius: 12, padding: 10, background: '#fff', minHeight: 40 };

export function ProductScopeSelect({
  name,
  label,
  products,
  value,
  note,
  formId = 'overview-form'
}: {
  name: string;
  label: string;
  products: string[];
  value?: string | null;
  note?: string;
  formId?: string;
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

  function clearAll() {
    setSelected(new Set());
  }

  function selectAll() {
    setSelected(new Set(products));
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#475467', fontWeight: 650 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
      <span>{label}</span>
      {products.length ? <span style={{ color: '#667085', fontWeight: 400 }}>已选 {selected.size}</span> : null}
    </div>
    <input form={formId} type="hidden" name={name} value={selectedText} />
    <div style={boxStyle}>
      {products.length ? <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
          <button type="button" onClick={selectAll} style={{ border: '1px solid #d0ebff', background: '#e7f5ff', color: '#0b7285', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>全选</button>
          <button type="button" onClick={clearAll} style={{ border: '1px solid #e5e7eb', background: '#f8fafc', color: '#475467', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>清空</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {products.map((item) => {
            const checked = selected.has(item);
            return <button key={item} type="button" onClick={() => toggle(item)} style={{ border: checked ? '1px solid #228be6' : '1px solid #d9e2ec', background: checked ? '#e7f5ff' : '#fff', color: checked ? '#1864ab' : '#475467', borderRadius: 999, padding: '6px 11px', fontSize: 13, cursor: 'pointer', fontWeight: checked ? 700 : 500 }}>
              {checked ? '✓ ' : ''}{item}
            </button>;
          })}
        </div>
      </> : <span style={{ color: '#98a2b3' }}>请先启用业态</span>}
    </div>
    {note ? <span className="meta" style={{ fontWeight: 400 }}>{note}</span> : null}
  </div>;
}
