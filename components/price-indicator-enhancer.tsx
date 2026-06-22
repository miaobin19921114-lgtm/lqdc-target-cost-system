'use client';

import { useEffect } from 'react';

type PriceIndicator = {
  costCode: string;
  indicatorName: string;
  productType?: string;
  stage?: string;
  standardLevel?: string;
  quantityUnit?: string;
  pricingUnit?: string;
  taxInclusiveUnitPrice: number;
  taxRate: number;
  confidence?: number;
  sourceName?: string;
  sourceType?: string;
  city?: string;
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

function priceValue(indicator: PriceIndicator) {
  return String(Math.round((Number(indicator.taxInclusiveUnitPrice || 0) + Number.EPSILON) * 100) / 100);
}

function displayPrice(indicator: PriceIndicator) {
  return indicator.pricingUnit?.includes('万元/')
    ? `${Math.round((indicator.taxInclusiveUnitPrice / 10000) * 100) / 100}${indicator.pricingUnit}`
    : `${Math.round(indicator.taxInclusiveUnitPrice * 100) / 100}${indicator.pricingUnit || ''}`;
}

function formatTaxRate(indicator: PriceIndicator) {
  return `${Math.round(Number(indicator.taxRate || 0.09) * 10000) / 100}%`;
}

function sourceText(indicator: PriceIndicator) {
  const confidence = indicator.confidence ? `｜可信度${Math.round(indicator.confidence * 100)}%` : '';
  const city = indicator.city ? `｜${indicator.city}` : '';
  const standard = indicator.standardLevel ? `｜${indicator.standardLevel}` : '';
  return `推荐单价：${displayPrice(indicator)}｜${indicator.indicatorName}${city}${standard}${indicator.sourceName ? `｜${indicator.sourceName}` : ''}${confidence}`;
}

function ensureSource(input: HTMLInputElement) {
  const next = input.nextElementSibling as HTMLElement | null;
  if (next?.dataset?.priceSource === '1') return next;

  const source = document.createElement('div');
  source.className = 'meta';
  source.dataset.priceSource = '1';
  source.style.display = 'flex';
  source.style.alignItems = 'center';
  source.style.gap = '6px';
  source.style.flexWrap = 'wrap';
  source.style.marginTop = '4px';

  const text = document.createElement('span');
  text.dataset.priceSourceText = '1';
  source.appendChild(text);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '应用推荐';
  button.dataset.priceApply = '1';
  button.className = 'btn';
  button.style.minHeight = '24px';
  button.style.padding = '2px 8px';
  button.style.fontSize = '12px';
  source.appendChild(button);

  input.insertAdjacentElement('afterend', source);
  return source;
}

function updateAmountPreview(input: HTMLInputElement, entryId: string, form: HTMLFormElement | null) {
  const quantityInput = form?.querySelector<HTMLInputElement>(`[name='${fieldName(entryId, 'quantity')}']`);
  const taxRateInput = form?.querySelector<HTMLInputElement>(`[name='${fieldName(entryId, 'taxRate')}']`);
  const quantity = toNumber(quantityInput?.value);
  const unitPrice = toNumber(input.value);
  const taxRateRaw = clean(taxRateInput?.value);
  const taxRateValue = toNumber(taxRateRaw.replace('%', ''));
  const taxRate = taxRateRaw.includes('%') ? taxRateValue / 100 : taxRateValue > 1 ? taxRateValue / 100 : taxRateValue || 0.09;
  const taxInclusiveAmount = Math.round(((quantity * unitPrice) / 10000 + Number.EPSILON) * 100) / 100;
  const taxExclusiveAmount = Math.round((taxInclusiveAmount / (1 + taxRate) + Number.EPSILON) * 100) / 100;
  const taxAmount = Math.round((taxInclusiveAmount - taxExclusiveAmount + Number.EPSILON) * 100) / 100;
  const source = input.nextElementSibling as HTMLElement | null;
  const old = source?.querySelector('[data-price-amount-preview]');
  old?.remove();
  if (!source || !quantity || !unitPrice) return;
  const preview = document.createElement('span');
  preview.dataset.priceAmountPreview = '1';
  preview.textContent = `预计金额：${taxInclusiveAmount}万元，税额${taxAmount}万元`;
  source.appendChild(preview);
}

function applyIndicatorToRow(input: HTMLInputElement, indicator: PriceIndicator, force = false) {
  const entryId = entryIdFromInput(input);
  const formId = input.getAttribute('form') || '';
  const form = formId ? document.getElementById(formId) as HTMLFormElement | null : input.form;
  const unitInput = form?.querySelector<HTMLInputElement>(`[name='${fieldName(entryId, 'unit')}']`);
  const taxRateInput = form?.querySelector<HTMLInputElement>(`[name='${fieldName(entryId, 'taxRate')}']`);
  const currentPrice = toNumber(input.value);

  if (force || !currentPrice) input.value = priceValue(indicator);
  if (unitInput && (force || !clean(unitInput.value)) && indicator.quantityUnit) unitInput.value = indicator.quantityUnit;
  if (taxRateInput && (force || !clean(taxRateInput.value))) taxRateInput.value = formatTaxRate(indicator);
  updateAmountPreview(input, entryId, form);
}

function applyPrice(input: HTMLInputElement, indicators: PriceIndicator[]) {
  const row = input.closest('tr');
  if (!row) return;
  const rowText = row.textContent || '';
  const costCode = findCostCode(rowText);
  const indicator = matchIndicator(costCode, rowText, indicators);
  if (!indicator) return;

  const source = ensureSource(input);
  const text = source.querySelector<HTMLElement>('[data-price-source-text]');
  const button = source.querySelector<HTMLButtonElement>('[data-price-apply]');
  if (text) text.textContent = sourceText(indicator);
  if (button && button.dataset.bound !== 'true') {
    button.dataset.bound = 'true';
    button.addEventListener('click', () => applyIndicatorToRow(input, indicator, true));
  }

  applyIndicatorToRow(input, indicator, false);
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
      input.addEventListener('input', () => {
        const entryId = entryIdFromInput(input);
        const formId = input.getAttribute('form') || '';
        const form = formId ? document.getElementById(formId) as HTMLFormElement | null : input.form;
        updateAmountPreview(input, entryId, form);
      });
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
