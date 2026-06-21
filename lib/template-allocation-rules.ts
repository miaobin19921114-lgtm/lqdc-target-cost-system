export type TemplateAllocationRuleFields = {
  operatingAllocationMethod?: string | null;
  landVatAllocationMethod?: string | null;
  incomeTaxAllocationMethod?: string | null;
};

const marker = '分摊规则模板｜';

function clean(value?: string | null) {
  const text = String(value || '').trim();
  return text || null;
}

function stripMarkerLine(remark?: string | null) {
  return String(remark || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(marker))
    .join('\n')
    .trim();
}

export function parseTemplateAllocationRules(allocationMethod?: string | null, remark?: string | null): TemplateAllocationRuleFields {
  const result: TemplateAllocationRuleFields = {
    operatingAllocationMethod: clean(allocationMethod),
    landVatAllocationMethod: null,
    incomeTaxAllocationMethod: null
  };

  const line = String(remark || '').split('\n').find((item) => item.trim().startsWith(marker));
  if (!line) return result;

  line.replace(marker, '').split('｜').forEach((part) => {
    const [key, ...valueParts] = part.split('=');
    const value = clean(valueParts.join('='));
    if (key === '经营') result.operatingAllocationMethod = value || result.operatingAllocationMethod;
    if (key === '土增税') result.landVatAllocationMethod = value;
    if (key === '所得税') result.incomeTaxAllocationMethod = value;
  });

  return result;
}

export function writeTemplateAllocationRemark(remark: string | null | undefined, fields: TemplateAllocationRuleFields) {
  const baseRemark = stripMarkerLine(remark);
  const operating = clean(fields.operatingAllocationMethod);
  const landVat = clean(fields.landVatAllocationMethod);
  const incomeTax = clean(fields.incomeTaxAllocationMethod);
  const ruleLine = `${marker}经营=${operating || ''}｜土增税=${landVat || ''}｜所得税=${incomeTax || ''}`;
  return [baseRemark, ruleLine].filter(Boolean).join('\n');
}
