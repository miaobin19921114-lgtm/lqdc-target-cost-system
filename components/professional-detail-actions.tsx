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

export function DetailSideNavToggle() {
  const [collapsed, setCollapsed] = useState(false);

  function toggleSideNav() {
    const nextCollapsed = !collapsed;
    document.querySelectorAll<HTMLElement>('[data-detail-shell]').forEach((item) => {
      item.dataset.sideCollapsed = nextCollapsed ? 'true' : 'false';
    });
    setCollapsed(nextCollapsed);
  }

  return <button type="button" className="btn" onClick={toggleSideNav} style={{ minHeight: 30, padding: '4px 10px', whiteSpace: 'nowrap' }}>{collapsed ? '展开导航' : '收起导航'}</button>;
}

export function LandFeeFormulaHelper({ formId }: { formId: string }) {
  void formId;
  return null;
}

export function GroupSaveButton({ formId, groupId, label = '保存本组' }: { formId: string; groupId: string; label?: string }) {
  return <button type="submit" form={formId} name="saveGroupId" value={groupId} className="btn" onClick={(event) => event.stopPropagation()} style={{ minHeight: 30, padding: '4px 10px' }}>{label}</button>;
}
