import type { ReactNode } from 'react';

export type StatusTone = 'neutral' | 'green' | 'blue' | 'cyan' | 'purple' | 'orange' | 'warning' | 'red' | 'gray';

export type StatusMeta = {
  label: string;
  tone: StatusTone;
  description: string;
};

const unknownMeta: StatusMeta = { label: '按当前口径', tone: 'neutral', description: '按后端返回的当前测算口径展示。' };

const quantitySourceMap: Record<string, StatusMeta> = {
  locked: { label: '已锁定', tone: 'neutral', description: '当前工程量已锁定，后续推算和导入不会覆盖。' },
  locked_confirmed: { label: '已锁定', tone: 'neutral', description: '当前工程量已锁定，后续推算和导入不会覆盖。' },
  drawing_measured: { label: '图纸算量', tone: 'blue', description: '当前工程量来自图纸算量结果。' },
  excel_imported: { label: 'Excel 导入', tone: 'purple', description: '当前工程量来自 Excel 导入。' },
  manual_override: { label: '手工覆盖', tone: 'orange', description: '当前工程量由用户手工录入，系统推算值不会自动覆盖。' },
  manual_entered: { label: '手工覆盖', tone: 'orange', description: '当前工程量由用户手工录入，系统推算值不会自动覆盖。' },
  user_project_manual: { label: '手工覆盖', tone: 'orange', description: '当前工程量由用户手工录入，系统推算值不会自动覆盖。' },
  from_engineering_metric: { label: '工程量指标', tone: 'cyan', description: '当前工程量来自工程量指标。' },
  inferred_by_indicator_content: { label: '系统推算', tone: 'green', description: '当前工程量由指标基数和含量规则推算。' },
  auto_calculated: { label: '系统推算', tone: 'green', description: '当前工程量由指标基数和含量规则推算。' },
  template_default: { label: '模板默认', tone: 'gray', description: '当前使用模板默认工程量，建议复核。' }
};

const statusMap: Record<string, StatusMeta> = {
  normal: { label: '正常', tone: 'green', description: '工程量和金额具备生成条件。' },
  missing_basis: { label: '缺少指标基数', tone: 'warning', description: '请先在项目指标或工程量指标中补充对应基数。' },
  missing_content_rule: { label: '缺少含量规则', tone: 'warning', description: '请先维护该科目的含量规则，或手工录入工程量。' },
  missing_unit_price: { label: '缺少单价', tone: 'warning', description: '请补充含税单价后重新生成金额。' },
  imported_amount: { label: '导入金额', tone: 'purple', description: '当前金额来自导入结果。' }
};

const priceSourceMap: Record<string, StatusMeta> = {
  system_default: { label: '系统默认', tone: 'gray', description: '当前单价来自系统默认值。' },
  region_price_library: { label: '地区价格库', tone: 'cyan', description: '当前单价来自地区价格库。' },
  user_project_manual: { label: '项目手工', tone: 'orange', description: '当前单价由项目手工维护。' },
  historical_project: { label: '历史项目', tone: 'blue', description: '当前单价参考历史项目。' },
  excel_imported: { label: 'Excel 导入', tone: 'purple', description: '当前单价来自 Excel 导入。' },
  contract_price: { label: '合同价', tone: 'blue', description: '当前单价来自合同价。' },
  market_inquiry: { label: '市场询价', tone: 'green', description: '当前单价来自市场询价。' },
  supplier_quote: { label: '供应商报价', tone: 'green', description: '当前单价来自供应商报价。' }
};

const toneStyle: Record<StatusTone, { background: string; color: string; border: string }> = {
  neutral: { background: '#f2f4f7', color: '#475467', border: '#d0d5dd' },
  green: { background: '#f0fff4', color: '#2b8a3e', border: '#b2f2bb' },
  blue: { background: '#e7f5ff', color: '#0b7285', border: '#a5d8ff' },
  cyan: { background: '#e6fcf5', color: '#087f5b', border: '#96f2d7' },
  purple: { background: '#f3f0ff', color: '#6741d9', border: '#d0bfff' },
  orange: { background: '#fff4e6', color: '#d9480f', border: '#ffd8a8' },
  warning: { background: '#fff9db', color: '#d9480f', border: '#ffd43b' },
  red: { background: '#fff5f5', color: '#c92a2a', border: '#ffc9c9' },
  gray: { background: '#f8fafc', color: '#667085', border: '#d9e2ec' }
};

function clean(value?: string | null) {
  return String(value || '').trim();
}

function byCode(map: Record<string, StatusMeta>, code?: string | null, fallback = unknownMeta) {
  const value = clean(code);
  return map[value] || fallback;
}

export function formatQuantitySource(code?: string | null) {
  return byCode(quantitySourceMap, code);
}

export function formatQuantityStatus(code?: string | null) {
  const value = clean(code);
  return statusMap[value] || quantitySourceMap[value] || unknownMeta;
}

export function formatAmountStatus(code?: string | null) {
  return byCode(statusMap, code, { label: '金额正常', tone: 'green', description: '金额已按当前量价口径生成。' });
}

export function formatUnitPriceSource(code?: string | null) {
  return byCode(priceSourceMap, code, { label: clean(code) || '单价来源未明', tone: 'gray', description: '当前单价来源未明确返回。' });
}

export function CostStatusBadge({ meta, title }: { meta: StatusMeta; title?: string }) {
  const style = toneStyle[meta.tone];
  return <span title={title || meta.description} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${style.border}`, background: style.background, color: style.color, padding: '3px 8px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{meta.label}</span>;
}

export function missingLabels(input: { quantityStatus?: string | null; amountStatus?: string | null; missingFields?: Array<string | null | undefined> }) {
  const labels = new Set<string>();
  const addStatus = (code?: string | null) => {
    const value = clean(code);
    if (value === 'missing_basis') labels.add('缺少指标基数');
    if (value === 'missing_content_rule') labels.add('缺少含量规则');
    if (value === 'missing_unit_price') labels.add('缺少单价');
  };
  addStatus(input.quantityStatus);
  addStatus(input.amountStatus);
  for (const field of input.missingFields || []) {
    const text = clean(field);
    if (/指标基数|基础指标/.test(text)) labels.add('缺少指标基数');
    else if (/含量规则/.test(text)) labels.add('缺少含量规则');
    else if (/单价/.test(text)) labels.add('缺少单价');
    else if (text) labels.add(text.replace(/^待补/, '缺少'));
  }
  return [...labels];
}

export function nextActionForStatus(input: { quantitySource?: string | null; quantityStatus?: string | null; amountStatus?: string | null; missingFields?: Array<string | null | undefined> }) {
  const labels = missingLabels(input);
  if (labels.includes('缺少指标基数')) return '请先在项目指标或工程量指标中补充对应基数。';
  if (labels.includes('缺少含量规则')) return '请先维护该科目的含量规则，或手工录入工程量。';
  if (labels.includes('缺少单价')) return '请补充含税单价后重新生成金额。';
  const source = clean(input.quantitySource);
  if (source === 'template_default') return '当前使用模板默认工程量，建议复核。';
  if (source === 'manual_override' || source === 'manual_entered' || source === 'user_project_manual') return '当前工程量由用户手工录入，系统推算值不会自动覆盖。';
  if (source === 'locked' || source === 'locked_confirmed') return '当前工程量已锁定，后续推算和导入不会覆盖。';
  return '当前测算依据完整，可继续汇总或复核金额。';
}

export function parseCalculationRemark(value?: string | null): { missingFields: string[]; quantitySource?: string | null; quantityStatus?: string | null; quantityFormula?: string | null; amountStatus?: string | null } {
  if (!value) return { missingFields: [] };
  try {
    const parsed = JSON.parse(value);
    return {
      missingFields: Array.isArray(parsed?.missingFields) ? parsed.missingFields.map((item: unknown) => String(item)) : [],
      quantitySource: parsed?.quantitySource || null,
      quantityStatus: parsed?.quantityStatus || null,
      quantityFormula: parsed?.quantityFormula || null,
      amountStatus: parsed?.amountStatus || null
    };
  } catch {
    return { missingFields: [] };
  }
}

export function StatusLine({ children }: { children: ReactNode }) {
  return <div className="meta" style={{ marginTop: 5, lineHeight: 1.6, whiteSpace: 'normal' }}>{children}</div>;
}
