import { prisma } from '@/lib/prisma';
import { getV60CostDictionaryRows } from '@/data/cost-dictionary-v60';
import { buildV60PrefabricatedRows } from '@/data/cost-dictionary-v60-prefabricated';
import { buildV60InstallationRows } from '@/data/cost-dictionary-v60-install';
import { buildV60EquipmentRows } from '@/data/cost-dictionary-v60-equipment';
import { buildV60FitoutRows } from '@/data/cost-dictionary-v60-fitout';
import { buildV60HeatingRows } from '@/data/cost-dictionary-v60-heating';
import { buildV60OutdoorPipeRows } from '@/data/cost-dictionary-v60-outdoor-pipe';

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

function rowPassesProjectConfig(project: any, row: any) {
  const table = clean(row.sourceTable);
  const text = `${clean(row.applicableProductType)} ${clean(row.secondSubject)} ${clean(row.thirdSubject)} ${clean(row.detailSubject)} ${clean(row.remark)}`;

  if (hasAny(text, ['装配式', 'PC预制构件', '预制构件', '预制楼梯', '预制外墙', '预制内墙', '叠合板', '灌浆套筒', '灌浆料', '构件运输', '构件吊装'])) {
    return Boolean(project.isPrefabricated) && prefabricatedScopeAllows(project.prefabricatedScope, row);
  }

  if (hasAny(text, ['地暖盘管', '地暖保温板', '地暖反射膜', '地暖钢丝网', '豆石混凝土回填', '户内采暖地面精装工程'])) {
    return Boolean(project.heatingEnabled && project.residentialFitoutDelivery && project.heatingType === '地暖');
  }

  if (hasAny(text, ['采暖', '换热', '热量表', '温控阀', '分集水器', '散热器']) && (table === '安装明细表' || table === '设备明细表')) {
    return Boolean(project.heatingEnabled);
  }

  if (hasAny(text, ['户内批量精装修', '户内墙面', '户内地面', '户内天棚', '客餐厅', '卧室精装修', '厨房精装修', '卫生间精装修', '阳台精装修', '户内门及门套', '橱柜', '浴室柜', '洁具五金', '开关插座面板', '户内灯具'])) {
    return Boolean(project.residentialFitoutDelivery);
  }

  if (hasAny(text, ['商业公区精装修', '商业大堂', '商业走廊', '商业电梯厅', '商业卫生间', '商业吊顶', '商业墙面', '商业地面', '商业灯具'])) return Boolean(project.commercialPublicFitout);
  if (hasAny(text, ['商铺交付标准', '商铺统一装修'])) return project.shopDeliveryStandard !== '毛坯';
  if (hasAny(text, ['地库品质提升', '地库墙面美化', '柱面美化', '顶棚喷涂', '入口门厅包装', '归家通道包装', '灯箱', '导视'])) return Boolean(project.basementQualityUpgrade);
  if (hasAny(text, ['物业用房精装修'])) return Boolean(project.propertyFitout);
  if (hasAny(text, ['社区用房精装修'])) return Boolean(project.communityFitout);
  if (hasAny(text, ['配套用房精装修'])) return Boolean(project.supportFitout);
  if (hasAny(text, ['售楼部精装修', '售楼部硬装', '售楼部软装'])) return Boolean(project.hasSalesOffice);
  if (hasAny(text, ['样板间精装修', '样板间硬装', '样板间软装', '家具家电'])) return Boolean(project.hasShowFlat);

  if (hasAny(text, ['软装']) && table === '精装修明细表') {
    const fitoutType = `${project.residentialFitoutType || ''} ${project.salesOfficeFitoutType || ''} ${project.showFlatFitoutType || ''}`;
    return hasAny(fitoutType, ['软装', '硬装+软装', '全部', '家具家电']);
  }

  return true;
}

function applyConfig(project: any, rows: any[]) {
  return rows.map((row) => rowPassesProjectConfig(project, row) ? row : {
    ...row,
    enabled: '否',
    remark: `${clean(row.remark)}｜按项目概况配置暂不启用`.replace(/^｜/, '')
  });
}

export async function rebuildProjectCostDictionary(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const baseRows = getV60CostDictionaryRows().filter((row) =>
    row.sourceTable !== '安装明细表' &&
    row.sourceTable !== '设备明细表' &&
    row.sourceTable !== '精装修明细表' &&
    row.sourceTable !== '室外管网明细表'
  );

  const prefabricatedOffset = Math.max(0, ...baseRows.map((row) => row.rowIndex || 0)) + 1;
  const prefabricatedRows = buildV60PrefabricatedRows(prefabricatedOffset);
  const installOffset = prefabricatedOffset + prefabricatedRows.length;
  const installRows = buildV60InstallationRows(installOffset);
  const equipmentOffset = installOffset + installRows.length;
  const equipmentRows = buildV60EquipmentRows(equipmentOffset);
  const fitoutOffset = equipmentOffset + equipmentRows.length;
  const fitoutRows = buildV60FitoutRows(fitoutOffset);
  const heatingOffset = fitoutOffset + fitoutRows.length;
  const heatingRows = buildV60HeatingRows(heatingOffset);
  const outdoorPipeOffset = heatingOffset + heatingRows.length;
  const outdoorPipeRows = buildV60OutdoorPipeRows(outdoorPipeOffset);

  const presetRows = applyConfig(project, [...baseRows, ...prefabricatedRows, ...installRows, ...equipmentRows, ...fitoutRows, ...heatingRows, ...outdoorPipeRows])
    .map((row) => ({ ...row, projectId }));

  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: presetRows })
  ]);
}
