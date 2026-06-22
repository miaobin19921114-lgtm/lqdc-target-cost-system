'use client';

import { useEffect } from 'react';

type PriceIndicator = {
  costCode: string;
  indicatorName: string;
  productType?: string;
  stage?: string;
  quantityUnit?: string;
  pricingUnit?: string;
  taxInclusiveUnitPrice: number;
  taxRate: number;
  confidence?: number;
  sourceName?: string;
};

type PricePayload = { indicators?: PriceIndicator[] };

function clean(value: unknown) {
  return String(value || '').trim();
}

function toNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function findCostCode(rowText: string) {
  const matches = rowText.match(/\d{2}(?:\.\d{2}){1,4}/g) || [];
  return matches.sort((a, b) => b.length - a.length)[0] || '';
}

function matchIndicator(costCode: string, rowText: string, indicators: PriceIndicator[]) {
  const candidates = indicators.filter((item) => {
    if (!costCode) return false;
    return costCode === item.costCode || costCode.startsWith(`${item.costCode}.`) || item.costCode.startsWith(`${costCode}.`);
  });
  if (!candidates.length) return null;
  const text = clean(rowText);
  return candidates.sort((a, b) => {
    const aTextMatch = text.includes(clean(a.indicatorName)) || text.includes(clean(a.productType));
    const bTextMatch = text.includes(clean(b.indicatorName)) || text.includes(clean(b.productType));
    return Number(bTextMatch) - Number(aTextMatch) || (Number(b.confidence || 0) - Number(a.confidence || 0)) || b.costCode.length - a.costCode.length;
  })[0];
}

function entryIdFromInput(input: HTMLInputElement) {
  return input.name.replace(/^taxInclusiveUnitPrice-/, '');
}

function fieldName(entryId: string, field: string) {
  return `${field}-${entryId}`;
}

function ensureSource(input: HTMLInputElement) {
  const next = input.nextElementSibling as HTMLElement | null;
  if (next?.dataset?.priceSource === '1') return next;
  const source = document.createElement('div');
  source.className = 'meta';
  source.dataset.priceSource = '1';
  input.insertAdjacentElement('afterend', source);
  return source;
}

function applyPrice(input: HTMLInputElement, indicators: PriceIndicator[]) {
  const row = input.closest('tr');
  if (!row) return;
  const rowText = row.textContent || '';
  const costCode = findCostCode(rowText);
  const indicator = matchIndicator(costCode, rowText, indicators);
  if (!indicator) return;

  const entryId = entryIdFromInput(input);
  const formId = input.getAttribute('form') || '';
  const form = formId ? document.getElementById(formId) as HTMLFormElement | null : input.form;
  const unitInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'unit')}"]`);
  const taxRateInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'taxRate')}"]`);
  const currentPrice = toNumber(input.value);
  const source = ensureSource(input);

  if (!currentPrice) {
    input.value = String(Math.round((Number(indicator.taxInclusiveUnitPrice || 0) + Number.EPSILON) * 100) / 100);
  }
  if (unitInput && !clean(unitInput.value) && indicator.quantityUnit) unitInput.value = indicator.quantityUnit;
  if (taxRateInput && !clean(taxRateInput.value)) taxRateInput.value = `${Math.round(Number(indicator.taxRate || 0.09) * 10000) / 100}%`;

  const displayPrice = indicator.pricingUnit?.includes('万元/') ? `${Math.round(indicator.taxInclusiveUnitPrice / 10000 * 100) / 100}${indicator.pricingUnit}` : `${indicator.taxInclusiveUnitPrice}${indicator.pricingUnit || ''}`;
  source.textContent = `推荐单价：${displayPrice}｜${indicator.indicatorName}${indicator.sourceName ? `｜${indicator.sourceName}` : ''}`;
}

async function enhancePriceIndicators(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/price-indicators`, { cache: 'no-store' });
  if (!response.ok) return;
  const payload = await response.json() as PricePayload;
  const indicators = payload.indicators || [];
  if (!indicators.length) return;

  const bind = () => {
    document.querySelectorAll<HTMLInputElement>('input[name^="taxInclusiveUnitPrice-"]').forEach((input) => {
      if (input.dataset.priceBound === 'true') return;
      input.dataset.priceBound = 'true';
      applyPrice(input, indicators);
      input.addEventListener('focus', () => applyPrice(input, indicators));
    });
  };

  bind();
  const observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
}

export function PriceIndicatorEnhancer({ projectId }: { projectId: string }) {
  useEffect(() => {
    enhancePriceIndicators(projectId).catch(() => undefined);
  }, [projectId]);

  return null;
}
