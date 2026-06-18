export type ProductCostSettingInput = {
  name: string;
  remark?: string | null;
};

export type ProductCostSettings = {
  standalone: boolean;
  groupName: string;
  note: string;
};

const SETTING_PREFIX = '成本测算设置｜';

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function normalizeCostGroupName(groupName: string | null | undefined) {
  const name = String(groupName || '').trim();
  if (!name) return '项目整体共用';
  if (hasAny(name, ['非主楼纯地库', '纯地库'])) return '非主楼地下室';
  return name;
}

export function isVirtualCostGroup(groupName: string | null | undefined) {
  const name = normalizeCostGroupName(groupName);
  return name === '公共配套/所在主体' || name === '所在主体';
}

export function isInternalBusinessDimension(productName: string | null | undefined) {
  const name = String(productName || '').trim();
  return /^商业街.*(一层|二层|三层|1层|2层|3层|首层|二楼|三楼)$/.test(name);
}

export function getProfessionalCostGroupName(product: ProductCostSettingInput) {
  const setting = getCostSettings(product);
  if (isInternalBusinessDimension(product.name)) return '商业街';
  return normalizeCostGroupName(setting.standalone ? product.name : setting.groupName);
}

export function shouldGenerateProfessionalCostGroup(professionalGroup: string | null | undefined, groupName: string | null | undefined) {
  const group = normalizeCostGroupName(groupName);
  const professional = String(professionalGroup || '');
  if (isVirtualCostGroup(group)) return false;
  if (professional.includes('土建')) {
    return !hasAny(group, ['景观', '道路总平', '管网', '围墙', '出入口', '安装', '设备工程']);
  }
  return true;
}

export function defaultCostSettings(product: ProductCostSettingInput): ProductCostSettings {
  const name = product.name || '';

  if (isInternalBusinessDimension(name)) {
    return { standalone: false, groupName: '商业街', note: '楼层是商业街内部经营维度，不作为独立成本业态组。' };
  }
  if (hasAny(name, ['非主楼纯地库', '纯地库'])) {
    return { standalone: false, groupName: '非主楼地下室', note: '非主楼纯地库与非主楼地下室按同一工程成本对象归集。' };
  }
  if (hasAny(name, ['地下产权车位', '地下使用权车位', '地下车位', '车库', '非人防车位'])) {
    return { standalone: false, groupName: '非主楼地下室', note: '车位是收入对象，工程成本默认归非主楼地下室/地库。' };
  }
  if (hasAny(name, ['人防车位'])) {
    return { standalone: false, groupName: '人防地下室', note: '人防车位是收入或权益对象，工程成本默认归人防地下室。' };
  }
  if (hasAny(name, ['地上车位'])) {
    return { standalone: false, groupName: '道路总平/景观', note: '地上车位通常不单独形成建造成本对象，归道路、铺装和标识。' };
  }
  if (hasAny(name, ['储藏室', '储物间'])) {
    return { standalone: false, groupName: '主楼地下室', note: '储藏室通常位于主楼或地下室，默认归主楼地下室。' };
  }
  if (hasAny(name, ['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '设备用房'])) {
    return { standalone: false, groupName: '公共配套/所在主体', note: '配套用房默认归所在主体，不单独生成专业成本组；独立楼可改为单独测算。' };
  }
  if (hasAny(name, ['门卫', '岗亭', '公厕'])) {
    return { standalone: false, groupName: '道路总平/围墙出入口', note: '小型附属用房默认归总平、围墙或出入口工程。' };
  }
  if (hasAny(name, ['充电桩'])) {
    return { standalone: false, groupName: '安装/设备工程', note: '充电桩不是业态，成本归安装或设备工程。' };
  }
  return { standalone: true, groupName: name || '项目整体共用', note: '默认作为工程成本测算对象。' };
}

export function parseCostSettingsRemark(remark?: string | null): Partial<ProductCostSettings> {
  const line = String(remark || '').split('\n').find((item) => item.startsWith(SETTING_PREFIX));
  if (!line) return {};
  const standaloneText = line.match(/单独测算=([^｜\n]+)/)?.[1];
  const groupName = line.match(/归属=([^｜\n]+)/)?.[1];
  return {
    standalone: standaloneText ? standaloneText === '是' : undefined,
    groupName: groupName ? normalizeCostGroupName(groupName) : undefined
  };
}

export function getCostSettings(product: ProductCostSettingInput): ProductCostSettings {
  const defaults = defaultCostSettings(product);
  const override = parseCostSettingsRemark(product.remark);
  const groupName = normalizeCostGroupName(override.groupName || defaults.groupName);
  return {
    standalone: override.standalone ?? defaults.standalone,
    groupName,
    note: defaults.note
  };
}

export function writeCostSettingsRemark(oldRemark: string | null | undefined, standalone: boolean, groupName: string) {
  const kept = String(oldRemark || '')
    .split('\n')
    .filter((line) => line && !line.startsWith(SETTING_PREFIX));
  const settingLine = `${SETTING_PREFIX}单独测算=${standalone ? '是' : '否'}｜归属=${normalizeCostGroupName(groupName || '项目整体共用')}`;
  return [settingLine, ...kept].join('\n');
}
