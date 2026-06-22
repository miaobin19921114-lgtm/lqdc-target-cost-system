export const versionStageOptions = [
  { value: 'INVESTMENT', label: '投拓版', description: '面积、单方、含量、固定金额为主' },
  { value: 'CONCEPT', label: '概念方案版', description: '初步业态面积、初步指标、经验含量' },
  { value: 'SCHEME', label: '方案版', description: '方案面积、专项指标、业态拆分' },
  { value: 'DRAWING', label: '施工图版', description: '图纸工程量、施工图指标' },
  { value: 'TENDER', label: '招采版', description: '清单工程量、控制价、中标价、合同价' },
  { value: 'DYNAMIC', label: '动态版', description: '合同、变更、签证、付款、动态成本' },
  { value: 'SETTLEMENT', label: '结算版', description: '结算书、审定金额、最终成本' }
] as const;

export type VersionStageCode = typeof versionStageOptions[number]['value'];

export const defaultVersionStage: VersionStageCode = 'INVESTMENT';

const stageValues = versionStageOptions.map((stage) => stage.value) as VersionStageCode[];

const legacyStageMap: Record<string, VersionStageCode> = {
  投拓: 'INVESTMENT',
  投拓版: 'INVESTMENT',
  投拓阶段: 'INVESTMENT',
  定位: 'CONCEPT',
  定位版: 'CONCEPT',
  定位阶段: 'CONCEPT',
  概念: 'CONCEPT',
  概念版: 'CONCEPT',
  概念方案: 'CONCEPT',
  概念方案版: 'CONCEPT',
  方案: 'SCHEME',
  方案版: 'SCHEME',
  方案阶段: 'SCHEME',
  扩初: 'DRAWING',
  扩初版: 'DRAWING',
  扩初阶段: 'DRAWING',
  施工图: 'DRAWING',
  施工图版: 'DRAWING',
  施工图阶段: 'DRAWING',
  招采: 'TENDER',
  招采版: 'TENDER',
  招采阶段: 'TENDER',
  动态: 'DYNAMIC',
  动态版: 'DYNAMIC',
  动态成本: 'DYNAMIC',
  动态成本版: 'DYNAMIC',
  动态成本阶段: 'DYNAMIC',
  结算: 'SETTLEMENT',
  结算版: 'SETTLEMENT',
  结算阶段: 'SETTLEMENT'
};

export function isVersionStageCode(value: string): value is VersionStageCode {
  return stageValues.includes(value as VersionStageCode);
}

export function normalizeVersionStage(value?: string | null): VersionStageCode {
  const raw = String(value || '').trim();
  if (isVersionStageCode(raw)) return raw;
  return legacyStageMap[raw] || defaultVersionStage;
}

export function getVersionStageLabel(value?: string | null) {
  const normalized = normalizeVersionStage(value);
  return versionStageOptions.find((stage) => stage.value === normalized)?.label || '投拓版';
}

export function getVersionStageDescription(value?: string | null) {
  const normalized = normalizeVersionStage(value);
  return versionStageOptions.find((stage) => stage.value === normalized)?.description || '';
}
