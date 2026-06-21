import { parseTemplateAllocationRules } from './template-allocation-rules';

export type ProjectAllocationPurpose = 'operating' | 'landVat' | 'incomeTax';

export type ProjectAllocationRuleRow = {
  costCode: string | null;
  allocationMethod?: string | null;
  remark?: string | null;
};

export function buildProjectAllocationRuleMap(rows: ProjectAllocationRuleRow[]) {
  return new Map(rows.filter((row) => row.costCode).map((row) => [row.costCode as string, row]));
}

export function readProjectAllocationMethod(
  costCode: string,
  fallbackMethod: string | null | undefined,
  ruleMap: Map<string, ProjectAllocationRuleRow>,
  purpose: ProjectAllocationPurpose
) {
  const rule = ruleMap.get(costCode);
  const parsed = parseTemplateAllocationRules(rule?.allocationMethod || fallbackMethod, rule?.remark);
  if (purpose === 'landVat') return parsed.landVatAllocationMethod || parsed.operatingAllocationMethod || fallbackMethod || rule?.allocationMethod || null;
  if (purpose === 'incomeTax') return parsed.incomeTaxAllocationMethod || parsed.operatingAllocationMethod || fallbackMethod || rule?.allocationMethod || null;
  return parsed.operatingAllocationMethod || fallbackMethod || rule?.allocationMethod || null;
}

export function readAllocationRuleLabel(row: ProjectAllocationRuleRow | undefined, purpose: ProjectAllocationPurpose) {
  const parsed = parseTemplateAllocationRules(row?.allocationMethod, row?.remark);
  if (purpose === 'landVat') return parsed.landVatAllocationMethod || '继承经营分摊规则';
  if (purpose === 'incomeTax') return parsed.incomeTaxAllocationMethod || '继承经营分摊规则';
  return parsed.operatingAllocationMethod || row?.allocationMethod || '系统默认';
}
