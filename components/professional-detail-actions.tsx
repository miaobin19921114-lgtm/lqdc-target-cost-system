'use client';

import { useEffect, useState } from 'react';

type MetricsPayload = {
  project?: Record<string, number>;
  products?: Array<Record<string, number | string>>;
};

type MeasureBasisRule = {
  id: string;
  costCode: string;
  basisName: string;
  metricKey?: string | null;
  metricScope?: string | null;
  quantityUnit?: string | null;
  pricingUnit?: string | null;
  defaultCoefficient?: number | null;
  quantityFormula?: string | null;
  amountFormula?: string | null;
  applicableProductType?: string | null;
  priority?: number;
  isDefault?: boolean;
  remark?: string | null;
  stageMatched?: boolean;
};

type RulesPayload = {
  stage?: string;
  rules?: MeasureBasisRule[];
};

type Suggestion = { quantity: number; unit: string; source: string; coefficient: number };

const splitSeparators = /[\/、,，;；\n]+/;

function clean(input: unknown) {
  return String(input || '').trim();
}

function toNumber(input: unknown) {
  const value = Number(input || 0);
  return Number.isFinite(value) ? value : 0;
}

function splitMeasureBasis(input: string) {
  const parts = clean(input).split(splitSeparators).map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(parts));
}

function findProduct(payload: MetricsPayload, groupName: string) {
  const value = clean(groupName);
  return (payload.products || []).find((product) => {
    const name = clean(product.name);
    return Boolean(name) && (value.includes(name) || name.includes(value));
  });
}

function pick(value: unknown, unit: string, source: string, coefficient = 1): Suggestion {
  return { quantity: toNumber(value), unit, source, coefficient };
}

function findCostCode(rowText: string) {
  const matches = rowText.match(/\d{2}(?:\.\d{2}){1,4}/g) || [];
  return matches.sort((a, b) => b.length - a.length)[0] || '';
}

function buildRuleMap(rules: MeasureBasisRule[]) {
  const map = new Map<string, MeasureBasisRule[]>();
  rules.forEach((rule) => {
    const list = map.get(rule.costCode) || [];
    list.push(rule);
    map.set(rule.costCode, list);
  });
  map.forEach((list) => list.sort((a, b) => Number(b.stageMatched) - Number(a.stageMatched) || Number(b.isDefault) - Number(a.isDefault) || (a.priority || 100) - (b.priority || 100)));
  return map;
}

function rulesForCostCode(costCode: string, ruleMap: Map<string, MeasureBasisRule[]>) {
  if (!costCode) return [];
  const direct = ruleMap.get(costCode);
  if (direct?.length) return direct;
  const prefixes = Array.from(ruleMap.keys()).filter((code) => costCode.startsWith(`${code}.`) || code.startsWith(`${costCode}.`));
  prefixes.sort((a, b) => b.length - a.length);
  return prefixes.flatMap((code) => ruleMap.get(code) || []);
}

function applyRuleSuggestion(payload: MetricsPayload, rule: MeasureBasisRule | undefined, groupName: string): Suggestion | null {
  if (!rule) return null;
  const project = payload.project || {};
  const product = findProduct(payload, groupName);
  const coefficient = toNumber(rule.defaultCoefficient) || 1;
  const quantityUnit = clean(rule.quantityUnit);

  if (rule.metricKey) {
    const rawMetricKey = clean(rule.metricKey);
    const metricKey = rawMetricKey.replace(/^product\./, '');
    const isProductScope = rule.metricScope === 'product' || rawMetricKey.startsWith('product.');
    const sourceName = isProductScope ? `业态指标：${rawMetricKey}` : `项目指标：${rawMetricKey}`;
    const value = isProductScope && product ? toNumber(product[metricKey]) : toNumber(project[rawMetricKey]);
    return pick(value, quantityUnit, `规则库：${rule.basisName}；${sourceName}`, coefficient);
  }

  if (clean(rule.quantityFormula) === '1') return pick(1, quantityUnit || '项', `规则库：${rule.basisName}`, coefficient);
  if (/manual|手动|fixed|合同|金额/i.test(clean(rule.quantityFormula) + clean(rule.basisName))) return pick(0, quantityUnit, `规则库：${rule.basisName}；需手动录入基数或金额`, coefficient);
  return null;
}

function suggestByBasis(payload: MetricsPayload, basis: string, groupName: string, rowText: string): Suggestion {
  const project = payload.project || {};
  const product = findProduct(payload, groupName);
  const text = `${basis} ${groupName} ${rowText}`;
  const productMetric = (key: string) => product ? toNumber(product[key]) : 0;
  const projectMetric = (key: string) => toNumber(project[key]);

  if (/固定金额|总价|合同金额|项/.test(text)) return pick(1, '项', '固定金额/合同金额', 1);
  if (/出入口|大门|门岗/.test(text)) return pick(projectMetric('gateCount') || projectMetric('formalGateCount'), '个', '概况表：出入口数量');
  if (/临时出入口/.test(text)) return pick(projectMetric('temporaryGateCount'), '个', '概况表：临时出入口数量');
  if (/正式出入口/.test(text)) return pick(projectMetric('formalGateCount'), '个', '概况表：正式出入口数量');
  if (/周界|围墙|围挡/.test(text)) return pick(projectMetric('sitePerimeter'), 'm', '概况表：周界长度');
  if (/临设|临建/.test(text)) return pick(projectMetric('temporaryFacilityArea'), '㎡', '概况表：临设面积');
  if (/场平|场地平整|三通一平/.test(text)) return pick(projectMetric('siteLevelingArea') || projectMetric('landArea'), '㎡', '概况表：场平/土地面积');

  if (/硬景|铺装/.test(text)) return pick(projectMetric('hardscapeArea'), '㎡', '概况表：硬景面积');
  if (/软景/.test(text)) return pick(projectMetric('softscapeArea'), '㎡', '概况表：软景面积');
  if (/绿化|绿地/.test(text)) return pick(projectMetric('greenArea') || projectMetric('softscapeArea'), '㎡', '概况表：绿地/软景面积');
  if (/景观|园林|综合管网|室外管网|管线/.test(text)) return pick(projectMetric('landscapeArea'), '㎡', '概况表：景观面积');
  if (/消防道路/.test(text)) return pick(projectMetric('fireRoadArea'), '㎡', '概况表：消防道路面积');
  if (/沥青/.test(text)) return pick(projectMetric('asphaltRoadArea') || projectMetric('roadArea'), '㎡', '概况表：沥青/道路面积');
  if (/道路|总平|交安|标识/.test(text)) return pick(projectMetric('roadArea'), '㎡', '概况表：道路面积');

  if (/地下车库|非主楼|纯地库|车库面积/.test(text)) return pick(projectMetric('basementParkingArea'), '㎡', '概况表：地下车库面积');
  if (/主楼地下|主楼地下室/.test(text)) return pick(projectMetric('mainBuildingUndergroundArea'), '㎡', '概况表：主楼地下室面积');
  if (/非人防/.test(text)) return pick(projectMetric('nonCivilDefenseArea'), '㎡', '概况表：非人防面积');
  if (/人防/.test(text)) return pick(projectMetric('civilDefenseArea') || projectMetric('undergroundArea'), '㎡', '概况表：人防面积');
  if (/地下室|地下建筑/.test(text)) return pick(projectMetric('undergroundArea'), '㎡', '概况表：地下建筑面积');

  if (/物业/.test(text)) return pick(projectMetric('propertyManagementArea'), '㎡', '概况表：物业用房面积');
  if (/社区/.test(text)) return pick(projectMetric('communityServiceArea'), '㎡', '概况表：社区用房面积');
  if (/大堂|入户大堂/.test(text)) return pick(projectMetric('lobbyArea'), '㎡', '概况表：一楼入户大堂面积');
  if (/公区|走道|电梯厅/.test(text)) return pick(projectMetric('publicArea'), '㎡', '概况表：公区面积');

  if (/桩基|桩基础/.test(text)) return pick(projectMetric('pileFoundationArea') || projectMetric('baseArea'), '㎡', '概况表：桩基/基底面积');
  if (/基底|占地|基础底板/.test(text)) return pick(projectMetric('baseArea'), '㎡', '概况表：基底/占地面积');
  if (/土方|挖方|填方/.test(text)) return pick(projectMetric('earthworkVolume'), 'm³', '概况表：土方量');
  if (/防水/.test(text)) return pick(projectMetric('waterproofArea'), '㎡', '概况表：防水面积');
  if (/屋面/.test(text)) return pick(projectMetric('roofArea'), '㎡', '概况表：屋面面积');
  if (/保温/.test(text)) return pick(projectMetric('insulationArea'), '㎡', '概况表：保温面积');
  if (/外墙|幕墙|立面/.test(text)) return pick(projectMetric('facadeArea'), '㎡', '概况表：外墙面积');
  if (/门窗|窗/.test(text)) return pick(projectMetric('windowArea'), '㎡', '概况表：门窗面积');
  if (/栏杆|栏板|扶手/.test(text)) return pick(projectMetric('railingLength'), 'm', '概况表：栏杆长度');

  if (/配电房|变配电/.test(text)) return pick(projectMetric('powerRoomCount'), '个', '概况表：配电房数量');
  if (/泵房|水泵房/.test(text)) return pick(projectMetric('pumpRoomCount'), '个', '概况表：水泵房数量');
  if (/消防水池|水池/.test(text)) return pick(projectMetric('firePoolVolume'), 'm³', '概况表：消防水池容积');
  if (/电梯/.test(text)) return pick(projectMetric('elevatorCount') || projectMetric('unitCount'), '台', '概况表：电梯数量');
  if (/单元/.test(text)) return pick(projectMetric('unitCount'), '个', '概况表：单元数量');
  if (/户数|套数/.test(text)) return pick(projectMetric('householdCount'), '户', '概况表：户数/套数');
  if (/充电桩|充电/.test(text)) return pick(projectMetric('chargingPileCount'), '个', '概况表：充电桩总数');
  if (/车位/.test(text)) return pick(projectMetric('parkingCount'), '个', '概况表：总车位数');
  if (/楼栋|栋数/.test(text)) return pick(projectMetric('buildingCount'), '栋', '概况表：楼栋数量');
  if (/标准层/.test(text)) return pick(projectMetric('standardFloorArea'), '㎡', '概况表：标准层面积');

  if (/可售/.test(text)) return pick(productMetric('saleableArea') || projectMetric('saleableArea'), '㎡', product ? `业态：${product.name}可售面积` : '概况表：可售面积');
  if (/计容/.test(text)) return pick(productMetric('capacityArea') || projectMetric('capacityBuildingArea'), '㎡', product ? `业态：${product.name}计容面积` : '概况表：计容建筑面积');
  if (/地上|上部|主体|建筑面积/.test(text)) return pick(productMetric('buildingArea') || projectMetric('aboveGroundArea') || projectMetric('totalBuildingArea'), '㎡', product ? `业态：${product.name}建筑面积` : '概况表：建筑面积');
  if (/土地|用地|红线/.test(text)) return pick(projectMetric('redLineArea') || projectMetric('landArea'), '㎡', '概况表：用地红线/土地面积');

  return pick(0, '', '未匹配到概况表指标');
}

function fieldName(entryId: string, field: string) {
  return `${field}-${entryId}`;
}

function ensureMeasureSource(select: HTMLSelectElement) {
  const next = select.nextElementSibling as HTMLElement | null;
  if (next?.dataset?.measureSource === '1') return next;
  const source = document.createElement('div');
  source.className = 'meta';
  source.dataset.measureSource = '1';
  select.insertAdjacentElement('afterend', source);
  return source;
}

function bindMeasureSelect(select: HTMLSelectElement, payload: MetricsPayload) {
  const entryId = select.dataset.entryId || select.name.replace(/^measureBasis-/, '');
  select.dataset.entryId = entryId;
  ensureMeasureSource(select);
  if (select.dataset.measureBound !== 'true') {
    select.addEventListener('change', () => updateRow(select, payload));
    select.dataset.measureBound = 'true';
  }
  updateRow(select, payload);
}

function updateRow(select: HTMLSelectElement, payload: MetricsPayload) {
  const entryId = select.dataset.entryId || select.name.replace(/^measureBasis-/, '');
  const formId = select.getAttribute('form') || '';
  const form = formId ? document.getElementById(formId) as HTMLFormElement | null : select.form;
  const row = select.closest('tr');
  const groupInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'regionOrProductType')}"]`);
  const measureInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'measureValue')}"]`);
  const coefficientInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'coefficient')}"]`);
  const quantityInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'quantity')}"]`);
  const overrideInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'quantityOverride')}"]`);
  const unitInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'unit')}"]`);
  const source = row?.querySelector<HTMLElement>('[data-measure-source]');
  const rowText = row?.textContent || '';
  const selectedOption = select.selectedOptions[0];
  const rule: MeasureBasisRule | undefined = selectedOption?.dataset?.ruleId ? {
    id: selectedOption.dataset.ruleId,
    costCode: selectedOption.dataset.costCode || '',
    basisName: selectedOption.value,
    metricKey: selectedOption.dataset.metricKey || null,
    metricScope: selectedOption.dataset.metricScope || 'project',
    quantityUnit: selectedOption.dataset.quantityUnit || null,
    pricingUnit: selectedOption.dataset.pricingUnit || null,
    defaultCoefficient: toNumber(selectedOption.dataset.defaultCoefficient) || 1,
    quantityFormula: selectedOption.dataset.quantityFormula || null,
    amountFormula: selectedOption.dataset.amountFormula || null,
    stageMatched: selectedOption.dataset.stageMatched === 'true'
  } : undefined;
  const suggestion = applyRuleSuggestion(payload, rule, groupInput?.value || '') || suggestByBasis(payload, select.value, groupInput?.value || '', rowText);

  if (measureInput) measureInput.value = suggestion.quantity ? String(suggestion.quantity) : '';
  if (coefficientInput) coefficientInput.value = String(suggestion.coefficient || 1);
  if (unitInput && suggestion.unit) unitInput.value = suggestion.unit;
  if (quantityInput && !overrideInput?.checked) quantityInput.value = suggestion.quantity ? String(Math.round((suggestion.quantity * (suggestion.coefficient || 1) + Number.EPSILON) * 100) / 100) : '';
  if (source) source.textContent = suggestion.source ? `默认取数：${suggestion.source}` : '';
}

function addOption(select: HTMLSelectElement, value: string, label: string, rule?: MeasureBasisRule) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  if (rule) {
    option.dataset.ruleId = rule.id;
    option.dataset.costCode = rule.costCode;
    option.dataset.metricKey = rule.metricKey || '';
    option.dataset.metricScope = rule.metricScope || 'project';
    option.dataset.quantityUnit = rule.quantityUnit || '';
    option.dataset.pricingUnit = rule.pricingUnit || '';
    option.dataset.defaultCoefficient = String(rule.defaultCoefficient || 1);
    option.dataset.quantityFormula = rule.quantityFormula || '';
    option.dataset.amountFormula = rule.amountFormula || '';
    option.dataset.stageMatched = String(Boolean(rule.stageMatched));
  }
  select.appendChild(option);
}

function applyRulesToSelect(select: HTMLSelectElement, rowText: string, ruleMap: Map<string, MeasureBasisRule[]>, originalValues: string[]) {
  const costCode = findCostCode(rowText);
  const rules = rulesForCostCode(costCode, ruleMap);
  const existingValue = select.value || originalValues[0] || '';
  select.innerHTML = '';
  const seen = new Set<string>();

  rules.forEach((rule, index) => {
    if (seen.has(rule.basisName)) return;
    seen.add(rule.basisName);
    const suffix = rule.stageMatched ? '（阶段规则）' : index === 0 ? '（规则库默认）' : '';
    addOption(select, rule.basisName, `${rule.basisName}${suffix}`, rule);
  });

  originalValues.forEach((value, index) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    addOption(select, value, index === 0 && !rules.length ? `${value}（默认）` : value);
  });

  if (!select.options.length) addOption(select, '', '请选择测算依据');
  select.value = Array.from(select.options).some((option) => option.value === existingValue) ? existingValue : select.options[0].value;
}

async function enhanceMeasureBasis(scopeId: string) {
  const root = document.querySelector<HTMLElement>(`[data-detail-scope="${scopeId}"]`);
  if (!root || root.dataset.measureEnhanced === 'true') return;
  const projectId = location.pathname.split('/').filter(Boolean)[1];
  if (!projectId) return;
  const [metricsResponse, rulesResponse] = await Promise.all([
    fetch(`/api/projects/${projectId}/measure-metrics`, { cache: 'no-store' }),
    fetch(`/api/projects/${projectId}/measure-basis-rules`, { cache: 'no-store' })
  ]);
  if (!metricsResponse.ok) return;
  const payload = await metricsResponse.json() as MetricsPayload;
  const rulesPayload = rulesResponse.ok ? await rulesResponse.json() as RulesPayload : { rules: [] };
  const ruleMap = buildRuleMap(rulesPayload.rules || []);

  root.querySelectorAll<HTMLInputElement>('input[name^="measureBasis-"]').forEach((input) => {
    const originalValue = input.value || input.defaultValue || '';
    const options = splitMeasureBasis(originalValue);
    const entryId = input.name.replace(/^measureBasis-/, '');
    const select = document.createElement('select');
    select.name = input.name;
    select.dataset.entryId = entryId;
    select.setAttribute('form', input.getAttribute('form') || '');
    Object.assign(select.style, input.style);
    select.style.minWidth = '160px';
    const values = options.length ? options : [originalValue].filter(Boolean);
    applyRulesToSelect(select, input.closest('tr')?.textContent || '', ruleMap, values);
    input.replaceWith(select);
    bindMeasureSelect(select, payload);
  });

  root.querySelectorAll<HTMLSelectElement>('select[name^="measureBasis-"]').forEach((select) => {
    const values = Array.from(select.options).map((option) => option.value).filter(Boolean);
    applyRulesToSelect(select, select.closest('tr')?.textContent || '', ruleMap, values);
    bindMeasureSelect(select, payload);
  });

  root.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    if (!target.name?.startsWith('coefficient-')) return;
    const entryId = target.name.replace(/^coefficient-/, '');
    const formId = target.getAttribute('form') || '';
    const form = formId ? document.getElementById(formId) as HTMLFormElement | null : target.form;
    const measureInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'measureValue')}"]`);
    const quantityInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'quantity')}"]`);
    const overrideInput = form?.querySelector<HTMLInputElement>(`[name="${fieldName(entryId, 'quantityOverride')}"]`);
    if (quantityInput && !overrideInput?.checked) {
      const quantity = toNumber(measureInput?.value) * (toNumber(target.value) || 1);
      quantityInput.value = quantity ? String(Math.round((quantity + Number.EPSILON) * 100) / 100) : '';
    }
  });

  root.dataset.measureEnhanced = 'true';
}

export function ProfessionalDetailFoldControls({ scopeId }: { scopeId: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    enhanceMeasureBasis(scopeId).catch(() => undefined);
  }, [scopeId]);

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

export function GroupSaveButton({ formId, groupId, label = '保存本组', disabled = false }: { formId: string; groupId: string; label?: string; disabled?: boolean }) {
  return <button type="submit" form={formId} name="saveGroupId" value={groupId} className="btn" disabled={disabled} title={disabled ? '当前版本已锁定，仅支持查看。' : undefined} onClick={(event) => event.stopPropagation()} style={{ minHeight: 30, padding: '4px 10px' }}>{label}</button>;
}
