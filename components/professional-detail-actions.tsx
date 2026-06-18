'use client';

import { useState } from 'react';

export function ProfessionalDetailFoldControls({ scopeId }: { scopeId: string }) {
  const [collapsed, setCollapsed] = useState(false);

  function toggleAll() {
    const nextOpen = collapsed;
    document.querySelectorAll<HTMLDetailsElement>(`[data-detail-scope="${scopeId}"] details[data-cost-detail-group]`).forEach((item) => {
      item.open = nextOpen;
    });
    setCollapsed(!nextOpen);
  }

  return <button type="button" className="btn" onClick={toggleAll} style={{ minHeight: 34 }}>{collapsed ? '全部展开' : '全部折叠'}</button>;
}

export function GroupSaveButton({ formId, groupId }: { formId: string; groupId: string }) {
  return <button type="submit" form={formId} name="saveGroupId" value={groupId} className="btn" onClick={(event) => event.stopPropagation()} style={{ minHeight: 30, padding: '4px 10px' }}>保存本组</button>;
}
