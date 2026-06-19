import { prisma } from '@/lib/prisma';
import { getV60CostDictionaryRows } from '@/data/cost-dictionary-v60';
import { buildV60PrefabricatedRows } from '@/data/cost-dictionary-v60-prefabricated';
import { buildV60InstallationRows } from '@/data/cost-dictionary-v60-install';
import { buildV60EquipmentRows } from '@/data/cost-dictionary-v60-equipment';
import { buildV60FitoutRows } from '@/data/cost-dictionary-v60-fitout';
import { buildV60HeatingRows } from '@/data/cost-dictionary-v60-heating';

function clean(value: unknown) {
  return String(value || '').trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function prefabricatedScopeAllows(scopeConfig: string | null | undefined, row: any) {
  const selected = clean(scopeConfig);
  if (!selected || hasAny(selected, ['全部', '全项目'])) return true;
  const text = `${clean(row.applicableProductType)} ${clean(row.secondSubject)} ${clean(row.thirdSubject)} ${clean(row.detailSubject)}`;
  if (hasAny(text, ['高层'])) return hasAny(selected, ['高层', '住宅']);
  if (hasAny(text, ['洋房'])) return hasAny(selected, ['洋房', '住宅']);
  if (hasAny(text, ['商业', '商铺', '商业街'])) return hasAny(selected, ['商业']);
  if (hasAny(text, ['配套', '物业', '社区'])) return hasAny(selected, ['配套', '物业', '社区']);
  if (hasAny(text, ['地下室', '地库', '地下车位'])) return hasAny(selected, ['地下', '地下室', '地库']);
  return true;
}

export async function rebuildProjectCostDictionary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { isPrefabricated: true, prefabricatedScope: true }
  });
  if (!project) return;

  const baseRows = getV60CostDictionaryRows().filter((row) =>
    row.sourceTable !== '安装明细表' &&
    row.sourceTable !== '设备明细表' &&
    row.sourceTable !== '精装修明细表'
  );

  const prefabricatedOffset = Math.max(0, ...baseRows.map((row) => row.rowIndex || 0)) + 1;
  const prefabricatedRows = project.isPrefabricated
    ? buildV60PrefabricatedRows(prefabricatedOffset).filter((row) => prefabricatedScopeAllows(project.prefabricatedScope, row))
    : [];

  const installOffset = prefabricatedOffset + prefabricatedRows.length;
  const installRows = buildV60InstallationRows(installOffset);
  const equipmentOffset = installOffset + installRows.length;
  const equipmentRows = buildV60EquipmentRows(equipmentOffset);
  const fitoutOffset = equipmentOffset + equipmentRows.length;
  const fitoutRows = buildV60FitoutRows(fitoutOffset);
  const heatingOffset = fitoutOffset + fitoutRows.length;
  const heatingRows = buildV60HeatingRows(heatingOffset);

  const presetRows = [...baseRows, ...prefabricatedRows, ...installRows, ...equipmentRows, ...fitoutRows, ...heatingRows]
    .map((row) => ({ ...row, projectId }));

  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: presetRows })
  ]);
}
