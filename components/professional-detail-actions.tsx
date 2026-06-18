'use client';

import { useEffect, useState } from 'react';

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

function parseInputNumber(value: string | undefined | null) {
  if (!value) return 0;
  const normalized = String(value).replace('%', '').replace(/,/g, '').trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function displayNumber(value: number) {
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

export function LandFeeFormulaHelper({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    function getLandPriceBaseWan() {
      let base = 0;
      form.querySelectorAll<HTMLInputElement>('input[data-land-role="land-price-quantity"]').forEach((quantityInput) => {
        const rowId = quantityInput.dataset.rowId || '';
        const unitPriceInput = form.querySelector<HTMLInputElement>(`input[data-land-role="land-price-unit-price"][data-row-id="${rowId}"]`);
        const quantity = parseInputNumber(quantityInput.value);
        const priceWan = parseInputNumber(unitPriceInput?.value || '');
        const amount = quantity * priceWan;
        if (amount > base) base = amount;
      });
      return base;
    }

    function fillFormulaRows() {
      const baseWan = getLandPriceBaseWan();
      if (baseWan <= 0) return;
      const baseText = displayNumber(baseWan);
      form.querySelectorAll<HTMLInputElement>('input[data-land-role="rate-base"]').forEach((baseInput) => {
        const current = parseInputNumber(baseInput.value);
        if (current <= 0 || baseInput.dataset.formulaAuto === 'true') {
          baseInput.value = baseText;
          baseInput.dataset.formulaAuto = 'true';
        }
      });
      form.querySelectorAll<HTMLInputElement>('input[data-land-role="fee-rate"]').forEach((rateInput) => {
        const defaultRate = parseInputNumber(rateInput.dataset.defaultRate || '');
        const current = parseInputNumber(rateInput.value);
        if (defaultRate > 0 && current <= 0) rateInput.value = String(defaultRate);
      });
    }

    function markManualEdit(event: Event) {
      const target = event.target as HTMLInputElement | null;
      if (target?.dataset.landRole === 'rate-base') target.dataset.formulaAuto = 'false';
    }

    const landInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[data-land-role="land-price-quantity"], input[data-land-role="land-price-unit-price"]'));
    const baseInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[data-land-role="rate-base"]'));
    landInputs.forEach((item) => item.addEventListener('input', fillFormulaRows));
    baseInputs.forEach((item) => item.addEventListener('input', markManualEdit));
    fillFormulaRows();

    return () => {
      landInputs.forEach((item) => item.removeEventListener('input', fillFormulaRows));
      baseInputs.forEach((item) => item.removeEventListener('input', markManualEdit));
    };
  }, [formId]);

  return null;
}

export function GroupSaveButton({ formId, groupId, label = '保存本组' }: { formId: string; groupId: string; label?: string }) {
  return <button type="submit" form={formId} name="saveGroupId" value={groupId} className="btn" onClick={(event) => event.stopPropagation()} style={{ minHeight: 30, padding: '4px 10px' }}>{label}</button>;
}
