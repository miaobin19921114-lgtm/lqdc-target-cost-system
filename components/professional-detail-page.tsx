import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV60CostDictionaryRows } from '@/data/cost-dictionary-v60';
import { buildV60InstallationRows } from '@/data/cost-dictionary-v60-install';
import { buildV60EquipmentRows } from '@/data/cost-dictionary-v60-equipment';
import { buildV60FitoutRows } from '@/data/cost-dictionary-v60-fitout';
import { buildV60HeatingRows } from '@/data/cost-dictionary-v60-heating';
import { suggestQuantityFromOverview } from '@/lib/overview-quantity';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getCostSettings, getProfessionalCostGroupName, normalizeCostGroupName, shouldGenerateProfessionalCostGroup } from '@/lib/cost-product-settings';
import { GroupSaveButton, ProfessionalDetailFoldControls } from '@/components/professional-detail-actions';
import { projectNavGroups } from '@/components/project-navigation';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function ensurePresetRows(projectId: string) {
  const baseRows = getV60CostDictionaryRows().filter((row) => row.sourceTable !== '安装明细表' && row.sourceTable !== '设备明细表' && row.sourceTable !== '精装修明细表');
  const installOffset = Math.max(0, ...baseRows.map((row) => row.rowIndex || 0)) + 1;
  const installRows = buildV60InstallationRows(installOffset);
  const equipmentOffset = installOffset + installRows.length;
  const equipmentRows = buildV60EquipmentRows(equipmentOffset);
  const fitoutOffset = equipmentOffset + equipmentRows.length;
  const fitoutRows = buildV60FitoutRows(fitoutOffset);
  const heatingOffset = fitoutOffset + fitoutRows.length;
  const heatingRows = buildV60HeatingRows(heatingOffset);
  const presetRows = [...baseRows, ...installRows, ...equipmentRows, ...fitoutRows, ...heatingRows].map((row) => ({ ...row, projectId }));
  if (!presetRows.length) return;

  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  const v60BuildingRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '土建明细表', detailSubject: '高层工程桩', costCode: { startsWith: '03.02.01.' }, unit: 'm' } });
  const v60LocationRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '土建明细表', applicableProductType: '地下车位 / 非主楼纯地下车库', detailSubject: '消防水池防水' } });
  const v60SectionRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '土建明细表', applicableProductType: '高层住宅', secondSubject: '基础工程', thirdSubject: '桩基及基础工程', detailSubject: '高层工程桩' } });
  const v60InstallationRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '安装明细表', applicableProductType: '高层住宅', secondSubject: '给排水工程', thirdSubject: '给排水安装工程', detailSubject: '高层室内给水管道' } });
  const v60EquipmentRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '设备明细表', applicableProductType: '高层住宅', secondSubject: '电梯及垂直交通设备', thirdSubject: '高层电梯', detailSubject: '客梯' } });
  const v60FitoutRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '精装修明细表', applicableProductType: '高层住宅', secondSubject: '公区精装修', thirdSubject: '首层入户大堂精装修', detailSubject: '首层入户大堂精装修' } });
  const v60HeatingRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '精装修明细表', applicableProductType: '高层住宅', secondSubject: '户内采暖地面精装工程', detailSubject: '高层地暖盘管' } });
  const legacyOverallDeviceRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '土建明细表', applicableProductType: '项目整体共摊土建', detailSubject: '配电房防潮处理' } });
  const legacySectionRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '土建明细表', applicableProductType: '高层住宅', secondSubject: '桩基及基础工程', detailSubject: '高层工程桩' } });
  const legacyInstallationRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '安装明细表', applicableProductType: '住宅/商业/地下车库/配套', secondSubject: '安装工程' } });
  const legacyEquipmentRows = await prisma.costDictionaryRow.count({ where: { projectId, sourceTable: '设备明细表', applicableProductType: '住宅/商业/地下车库/配套', secondSubject: '设备工程' } });
  if (count >= 100 && v60BuildingRows > 0 && v60LocationRows > 0 && v60SectionRows > 0 && v60InstallationRows > 0 && v60EquipmentRows > 0 && v60FitoutRows > 0 && v60HeatingRows > 0 && legacyOverallDeviceRows === 0 && legacySectionRows === 0 && legacyInstallationRows === 0 && legacyEquipmentRows === 0) return;

  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: presetRows })
  ]);
}

type DetailPageProps = {
  projectId: string;
  saved?: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  professionalGroup: string;
  returnPath: string;
  dictionaryKeywords: string[];
  emptyText: string;
  selectPlaceholder: string;
  detailPlaceholder: string;
  measurePlaceholder: string;
  note: string;
};

type DetailEntry = { entryId: string; dict: any; saved: any; amount: number; groupName: string; groupId: string };
type Group = { id: string; name: string; amount: number; rows: number; filled: number; entries: DetailEntry[] };
type SubjectThirdGroup = { id: string; name: string; amount: number; rows: number; filled: number; entries: DetailEntry[] };
type SubjectSecondGroup = { id: string; name: string; amount: number; rows: number; filled: number; children: Map<string, SubjectThirdGroup> };
type SubjectSecondGroupView = Omit<SubjectSecondGroup, 'children'> & { childRows: SubjectThirdGroup[] };

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const inputStyle = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
const stickyCode = { ...cell, position: 'sticky' as const, left: 0, zIndex: 2, background: '#fff', fontWeight: 900, color: '#0f4c5c' };
const stickyName = { ...cell, position: 'sticky' as const, left: 94, zIndex: 2, background: '#fff', fontWeight: 800 };

function entryKey(entryId: string, field: string) { return `${field}-${entryId}`; }
function normalize(value: string | null | undefined) { return String(value || '').trim(); }
function hasAny(text: string | null | undefined, words: string[]) { const value = normalize(text); return words.some((word) => value.includes(word)); }
function groupKey(code: string | null | undefined, groupName: string) { return `${code || ''}__${normalizeCostGroupName(groupName)}`; }
function safeDomId(input: string) { return input.replace(/\s+/g, '-'); }

const DEFAULT_PRODUCT_ORDER = ['项目整体共用', '高层住宅', '小高层住宅', '高层', '小高层', '洋房', '叠拼', '合院', '别墅', '底商', '商业街', '集中商业', '商业', '会所商业', '非主楼地下室', '主楼地下室', '地下车位', '地下车库', '地库', '人防地下室', '人防', '物业/社区/配套用房', '物业', '社区', '配套', '会所'];
const RESIDENTIAL_SPECIFIC = ['高层住宅', '小高层住宅', '洋房', '叠拼', '合院', '别墅'];
const BASEMENT_ALIASES = ['地下车位', '地下车库', '非主楼地下室', '非主楼纯地下车库', '非主楼纯地库', '纯地库', '地库'];
const CIVIL_DEFENSE_ALIASES = ['人防', '人防地下室', '人防车位'];
const COMMERCIAL_ALIASES = ['商业', '底商', '商铺', '商业街', '集中商业', '会所商业'];
const SUPPORT_ALIASES = ['物业/社区/配套用房', '物业', '社区', '配套', '会所', '养老', '托育', '公建', '设备用房'];

function defaultProductOrderRank(name: string) {
  const value = normalizeCostGroupName(name);
  if (!value) return 999;
  const index = DEFAULT_PRODUCT_ORDER.findIndex((item) => value === item || value.includes(item) || item.includes(value));
  return index >= 0 ? index : 999;
}

function strictProductTokens(product: any) {
  const name = normalize(product?.name);
  const groupName = normalizeCostGroupName(getProfessionalCostGroupName(product));
  const tokens = new Set<string>();
  if (name) tokens.add(normalizeCostGroupName(name));
  if (groupName) tokens.add(groupName);
  if (hasAny(name, ['小高层'])) { tokens.add('小高层住宅'); tokens.add('小高层'); tokens.add('住宅'); }
  else if (hasAny(name, ['高层住宅']) || name === '高层') { tokens.add('高层住宅'); tokens.add('高层'); tokens.add('住宅'); }
  else if (hasAny(name, ['洋房'])) { tokens.add('洋房'); tokens.add('住宅'); }
  else if (hasAny(name, ['叠拼'])) { tokens.add('叠拼'); tokens.add('住宅'); }
  else if (hasAny(name, ['合院'])) { tokens.add('合院'); tokens.add('住宅'); }
  else if (hasAny(name, ['别墅'])) { tokens.add('别墅'); tokens.add('住宅'); }
  if (hasAny(name, COMMERCIAL_ALIASES) || COMMERCIAL_ALIASES.some((item) => groupName.includes(item))) {
    tokens.add('商业');
    if (hasAny(name, ['底商'])) tokens.add('底商');
    if (hasAny(name, ['商业街'])) tokens.add('商业街');
    if (hasAny(name, ['集中商业'])) tokens.add('集中商业');
  }
  if (groupName === '非主楼地下室' || hasAny(name, BASEMENT_ALIASES)) { BASEMENT_ALIASES.forEach((item) => tokens.add(item)); tokens.add('非主楼地下室'); }
  if (groupName === '人防地下室' || hasAny(name, CIVIL_DEFENSE_ALIASES)) { CIVIL_DEFENSE_ALIASES.forEach((item) => tokens.add(item)); tokens.add('人防地下室'); }
  if (groupName === '主楼地下室') tokens.add('主楼地下室');
  if (hasAny(name, SUPPORT_ALIASES) || SUPPORT_ALIASES.some((item) => groupName.includes(item))) SUPPORT_ALIASES.forEach((item) => tokens.add(item));
  return Array.from(tokens).map(normalizeCostGroupName).filter(Boolean);
}

function findMatchedProductRank(name: string, activeProducts: any[]) {
  const value = normalizeCostGroupName(name);
  const matched = activeProducts.map((product, index) => {
    const productName = normalizeCostGroupName(product?.name);
    const groupName = normalizeCostGroupName(getProfessionalCostGroupName(product));
    const matchedProduct = Boolean(productName && (value === productName || value.includes(productName) || productName.includes(value))) || Boolean(groupName && (value === groupName || value.includes(groupName) || groupName.includes(value)));
    if (!matchedProduct) return null;
    return { index, rank: Math.min(defaultProductOrderRank(productName), defaultProductOrderRank(groupName)) };
  }).filter((item): item is { index: number; rank: number } => Boolean(item));
  if (!matched.length) return null;
  matched.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return matched[0];
}

function productGroupRank(name: string, activeProducts: any[] = []) {
  const value = normalizeCostGroupName(name);
  if (!value) return 9999;
  if (hasAny(value, ['项目整体', '项目共用', '整体共用', '全项目'])) return 0;
  const matched = findMatchedProductRank(value, activeProducts);
  if (matched) return 100 + matched.rank;
  const defaultRank = defaultProductOrderRank(value);
  if (defaultRank < 999) return 100 + defaultRank;
  if (hasAny(value, ['住宅', '高层', '洋房', '别墅', '合院', '叠拼', '小高'])) return 1000 + defaultRank;
  if (hasAny(value, COMMERCIAL_ALIASES)) return 2000 + defaultRank;
  if (hasAny(value, ['地下', '地下室', '地库', '车库', '车位', '人防'])) return 3000 + defaultRank;
  if (hasAny(value, SUPPORT_ALIASES)) return 4000 + defaultRank;
  return 9000;
}

function sortVisibleGroups(groups: Group[], activeProducts: any[]) {
  return groups.sort((a, b) => productGroupRank(a.name, activeProducts) - productGroupRank(b.name, activeProducts) || a.name.localeCompare(b.name, 'zh-CN'));
}

function matchesInactiveProductName(text: string | null | undefined, inactiveNames: Set<string>) {
  const value = normalize(text);
  if (!value) return false;
  return Array.from(inactiveNames).some((name) => value === name || value === `业态-${name}` || value === `区域-${name}` || value.includes(name));
}

function scopedKeywordMatch(applicable: string, tokens: string[], keywords: string[]) {
  if (!keywords.some((word) => applicable.includes(word))) return null;
  return keywords.some((word) => tokens.includes(normalizeCostGroupName(word)) || tokens.some((token) => token.includes(word)));
}

function appliesToProduct(row: any, product: any) {
  const applicable = normalizeCostGroupName(row.applicableProductType);
  if (!applicable) return true;
  if (hasAny(applicable, ['全项目', '项目整体', '项目共用'])) return false;
  const tokens = strictProductTokens(product);
  if (tokens.includes(applicable)) return true;
  const specificResidential = RESIDENTIAL_SPECIFIC.find((item) => applicable.includes(item));
  if (specificResidential) return tokens.includes(specificResidential);
  if (applicable === '住宅') return tokens.some((token) => RESIDENTIAL_SPECIFIC.includes(token) || token === '住宅');
  const basementMatch = scopedKeywordMatch(applicable, tokens, BASEMENT_ALIASES);
  if (basementMatch !== null) return basementMatch;
  const civilDefenseMatch = scopedKeywordMatch(applicable, tokens, CIVIL_DEFENSE_ALIASES);
  if (civilDefenseMatch !== null) return civilDefenseMatch;
  const commercialMatch = scopedKeywordMatch(applicable, tokens, COMMERCIAL_ALIASES);
  if (commercialMatch !== null) return commercialMatch;
  const supportMatch = scopedKeywordMatch(applicable, tokens, SUPPORT_ALIASES);
  if (supportMatch !== null) return supportMatch;
  return tokens.some((token) => token.length >= 3 && (applicable === token || applicable.includes(token) || token.includes(applicable)));
}

function rowPassesProjectConfig(project: any, row: any) {
  const table = normalize(row.sourceTable);
  const second = normalize(row.secondSubject);
  const third = normalize(row.thirdSubject);
  const detail = normalize(row.detailSubject);
  const scope = normalizeCostGroupName(row.applicableProductType);
  const text = `${scope} ${second} ${third} ${detail} ${normalize(row.remark)}`;

  if (hasAny(text, ['地暖盘管', '地暖保温板', '地暖反射膜', '地暖钢丝网', '豆石混凝土回填', '户内采暖地面精装工程'])) {
    return Boolean(project.heatingEnabled && project.residentialFitoutDelivery && project.heatingType === '地暖');
  }
  if (hasAny(text, ['采暖', '换热', '热量表', '温控阀', '分集水器', '散热器'])) {
    if (table === '安装明细表' || table === '设备明细表') return Boolean(project.heatingEnabled);
  }
  if (hasAny(text, ['户内批量精装修', '户内墙面', '户内地面', '户内天棚', '客餐厅', '卧室精装修', '厨房精装修', '卫生间精装修', '阳台精装修', '户内门及门套', '橱柜', '浴室柜', '洁具五金', '开关插座面板', '户内灯具'])) {
    return Boolean(project.residentialFitoutDelivery);
  }
  if (hasAny(text, ['商业公区精装修', '商业大堂', '商业走廊', '商业电梯厅', '商业卫生间', '商业吊顶', '商业墙面', '商业地面', '商业灯具'])) {
    return Boolean(project.commercialPublicFitout);
  }
  if (hasAny(text, ['商铺交付标准', '商铺统一装修'])) {
    return project.shopDeliveryStandard !== '毛坯';
  }
  if (hasAny(text, ['地库品质提升', '地库墙面美化', '柱面美化', '顶棚喷涂', '入口门厅包装', '归家通道包装', '灯箱', '导视'])) {
    return Boolean(project.basementQualityUpgrade);
  }
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

function getOrCreateGroup(groupMap: Map<string, Group>, groupName: string) {
  const normalized = normalizeCostGroupName(groupName);
  const id = `group-${safeDomId(normalized)}`;
  const found = groupMap.get(normalized);
  if (found) return found;
  const created: Group = { id, name: normalized, amount: 0, rows: 0, filled: 0, entries: [] };
  groupMap.set(normalized, created);
  return created;
}

function costShouldRemainInProfessional(row: any, professionalGroup: string, inactiveNames: Set<string>) {
  if (row.productTypeId && !row.productType?.isActive) return false;
  if (matchesInactiveProductName(row.regionOrProductType, inactiveNames)) return false;
  const groupName = normalizeCostGroupName(row.regionOrProductType || '项目整体共用');
  return shouldGenerateProfessionalCostGroup(professionalGroup, groupName);
}

function getOrCreateSecond(map: Map<string, SubjectSecondGroup>, name: string) {
  const key = normalize(name) || '未分类二级';
  const found = map.get(key);
  if (found) return found;
  const created: SubjectSecondGroup = { id: `subject-second-${safeDomId(key)}`, name: key, amount: 0, rows: 0, filled: 0, children: new Map() };
  map.set(key, created);
  return created;
}

function getOrCreateThird(second: SubjectSecondGroup, name: string) {
  const key = normalize(name) || second.name || '未分类三级';
  const found = second.children.get(key);
  if (found) return found;
  const created: SubjectThirdGroup = { id: `${second.id}-third-${safeDomId(key)}`, name: key, amount: 0, rows: 0, filled: 0, entries: [] };
  second.children.set(key, created);
  return created;
}

function buildSubjectTree(entries: DetailEntry[]): SubjectSecondGroupView[] {
  const secondMap = new Map<string, SubjectSecondGroup>();
  for (const entry of entries) {
    const second = getOrCreateSecond(secondMap, entry.dict.secondSubject || '未分类');
    const third = getOrCreateThird(second, entry.dict.thirdSubject || entry.dict.secondSubject || '未分类');
    const filled = entry.amount > 0;
    second.amount += entry.amount;
    second.rows += 1;
    second.filled += filled ? 1 : 0;
    third.amount += entry.amount;
    third.rows += 1;
    third.filled += filled ? 1 : 0;
    third.entries.push(entry);
  }
  return Array.from(secondMap.values()).map((second) => ({ id: second.id, name: second.name, amount: second.amount, rows: second.rows, filled: second.filled, childRows: Array.from(second.children.values()) }));
}

function renderTopNav(projectId: string, projectName: string, activePath: string, title: string) {
  return <nav style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f6', background: '#f8fafc', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><b>{projectName}</b><span className="meta">{title}</span></div>
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: 8 }}>{projectNavGroups.map((group) => <div key={group.title} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, padding: 6, border: '1px solid #eef2f6', borderRadius: 10, background: '#f8fafc' }}><span style={{ fontSize: 12, fontWeight: 900, color: '#667085', whiteSpace: 'nowrap' }}>{group.title}</span>{group.items.map(([name, href]) => { if (!href) return null; const active = href === activePath; const target = href.startsWith('/') ? href : `/projects/${projectId}/${href}`; return <Link key={`${group.title}-${name}`} href={target} style={{ whiteSpace: 'nowrap', padding: '7px 10px', borderRadius: 8, fontSize: 13, background: active ? '#e6fcf5' : '#fff', color: active ? '#087f5b' : '#102033', border: active ? '1px solid #96f2d7' : '1px solid #eef2f6', fontWeight: active ? 900 : 500 }}>{name}</Link>; })}</div>)}</div>
  </nav>;
}

export async function ProfessionalDetailPage(props: DetailPageProps) {
  const project = await prisma.project.findUnique({ where: { id: props.projectId } });
  if (!project) return <main className="page">项目不存在</main>;

  await ensurePresetRows(project.id);
  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: { orderBy: { createdAt: 'asc' } } }
  });
  const activeProducts = (version?.products || []).filter((item) => item.isActive);
  const inactiveProductNames = new Set((version?.products || []).filter((item) => !item.isActive).map((item) => item.name));

  const dictionaryRows = await prisma.costDictionaryRow.findMany({ where: { projectId: props.projectId, enabled: { not: '否' }, sourceTable: props.eyebrow }, orderBy: { rowIndex: 'asc' } });
  const rawLeafRows = dictionaryRows.filter((row) => row.detailSubject && rowPassesProjectConfig(project, row));
  const rawCosts = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id, professionalGroup: props.professionalGroup }, include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } }) : [];
  const costs = rawCosts.filter((row) => costShouldRemainInProfessional(row, props.professionalGroup, inactiveProductNames));
  const hiddenCostRows = rawCosts.length - costs.length;
  const hiddenByConfigRows = dictionaryRows.filter((row) => row.detailSubject && !rowPassesProjectConfig(project, row)).length;

  const costByCodeAndGroup = new Map<string, any>();
  costs.forEach((row) => costByCodeAndGroup.set(groupKey(row.costSubject.code, row.regionOrProductType || '项目整体共用'), row));

  const groupMap = new Map<string, Group>();
  let hiddenDictionaryRows = hiddenByConfigRows;
  let redirectedProductRows = 0;
  for (const dict of rawLeafRows) {
    if (matchesInactiveProductName(dict.applicableProductType, inactiveProductNames)) { hiddenDictionaryRows += 1; continue; }
    const targetGroupNames = new Set<string>();
    if (hasAny(dict.applicableProductType, ['全项目', '项目整体', '项目共用'])) targetGroupNames.add('项目整体共用');
    else {
      for (const product of activeProducts) {
        if (!appliesToProduct(dict, product)) continue;
        const setting = getCostSettings(product);
        const groupName = getProfessionalCostGroupName(product);
        if (!shouldGenerateProfessionalCostGroup(props.professionalGroup, groupName)) { hiddenDictionaryRows += 1; continue; }
        targetGroupNames.add(groupName);
        if (!setting.standalone || groupName !== product.name) redirectedProductRows += 1;
      }
    }
    if (!targetGroupNames.size) { hiddenDictionaryRows += 1; continue; }
    for (const groupName of Array.from(targetGroupNames)) {
      const group = getOrCreateGroup(groupMap, groupName);
      const saved = dict.costCode ? costByCodeAndGroup.get(groupKey(dict.costCode, group.name)) : null;
      const amount = Number(saved?.taxInclusiveAmount || 0);
      const entryId = `${dict.id}__${group.id}`;
      group.entries.push({ entryId, dict, saved, amount, groupName: group.name, groupId: group.id });
      group.amount += amount;
      group.rows += 1;
      group.filled += amount > 0 ? 1 : 0;
    }
  }

  const visibleGroups = sortVisibleGroups(Array.from(groupMap.values()).filter((group) => group.rows > 0), activeProducts);
  const visibleRows = visibleGroups.reduce((sum, group) => sum + group.rows, 0);
  const filledRows = visibleGroups.reduce((sum, group) => sum + group.filled, 0);
  const totalInclusive = visibleGroups.reduce((sum, group) => sum + group.amount, 0);
  const activeCostCodes = new Set<string>(visibleGroups.flatMap((group) => group.entries.map((entry) => entry.dict.costCode).filter((code): code is string => Boolean(code))));
  const activeCosts = costs.filter((row) => activeCostCodes.has(row.costSubject.code));
  const totalExclusive = activeCosts.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = activeCosts.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const scopeId = `professional-${project.id}-${props.returnPath}`;
  const formId = `${props.returnPath}-batch`;

  function renderEntryTable(entries: DetailEntry[], saveScopes: string[]) {
    return <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 1900, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ background: '#fff' }}>{['编码', '末级科目', '专业/部位', '测算依据', '测算指标', '含量/系数', '工程量/计费基数', '单位', '含税单价', '税率', '含税金额', '不含税金额', '税额', '分摊方式', '备注', '状态'].map((head, index) => <th key={head} style={{ ...(index === 0 ? stickyCode : index === 1 ? stickyName : cell), textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead>
        <tbody>{entries.map((entry, index) => {
          const dict = entry.dict;
          const saved = entry.saved;
          const amount = entry.amount;
          const suggestion = suggestQuantityFromOverview(project, dict);
          const measureValue = saved ? Number(saved.measureValue || saved.quantity || 0) : suggestion.quantity;
          const coefficient = saved ? Number(saved.coefficient || 1) : 1;
          const quantity = saved ? Number(saved.quantity || 0) : round2(measureValue * coefficient);
          const unit = saved?.unit || dict.unit || suggestion.unit || '';
          const unitPrice = Number(saved?.taxInclusiveUnitPrice || 0);
          const isFilled = amount > 0;
          const taxRateText = saved ? `${Number(saved.taxRate || 0) * 100}%` : dict.defaultTaxRate || '9%';
          const rowScopes = Array.from(new Set([entry.groupId, ...saveScopes]));
          const measureBasisValue = saved?.measureBasis || dict.measureBasis || '';
          const measureBasisOptions = Array.from(new Set(String(measureBasisValue).split(/[\/、,，;；\n]+/).map((item) => item.trim()).filter(Boolean)));
          return <tr key={entry.entryId} style={{ background: isFilled ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
            <td style={stickyCode}>{dict.costCode || '-'}</td>
            <td style={stickyName}>{dict.detailSubject || '-'}</td>
            <td style={cell}>{dict.thirdSubject || dict.secondSubject || '-'}</td>
            <td style={cell}><input form={formId} type="hidden" name="dictionaryRowId" value={entry.entryId} />{rowScopes.map((scope) => <input key={scope} form={formId} type="hidden" name={entryKey(entry.entryId, 'saveScope')} value={scope} />)}{saved ? <input form={formId} type="hidden" name={entryKey(entry.entryId, 'costLineId')} value={saved.id} /> : null}<input form={formId} type="hidden" name={entryKey(entry.entryId, 'regionOrProductType')} value={entry.groupName} /><select form={formId} name={entryKey(entry.entryId, 'measureBasis')} defaultValue={measureBasisOptions[0] || measureBasisValue} style={{ ...inputStyle, minWidth: 160 }}>{(measureBasisOptions.length ? measureBasisOptions : [measureBasisValue || '固定金额']).map((option, optionIndex) => <option key={option} value={option}>{optionIndex === 0 ? `${option}（默认）` : option}</option>)}</select>{!saved && suggestion.source ? <div className="meta" data-measure-source="1">默认取数：{suggestion.source}</div> : <div className="meta" data-measure-source="1" />}</td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'measureValue')} type="number" step="0.01" defaultValue={measureValue || ''} placeholder="测算指标" style={inputStyle} /></td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'coefficient')} type="number" step="0.0001" defaultValue={coefficient || 1} placeholder="含量/系数" style={inputStyle} /></td>
            <td style={{ ...cell, padding: 0 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 58px', gap: 4, alignItems: 'center' }}><input form={formId} name={entryKey(entry.entryId, 'quantity')} type="number" step="0.01" defaultValue={quantity || ''} placeholder="自动=指标×系数" style={inputStyle} /><label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 12, color: '#667085' }}><input form={formId} name={entryKey(entry.entryId, 'quantityOverride')} type="checkbox" defaultChecked={Boolean(saved?.quantityOverride)} style={{ width: 14, height: 14, padding: 0 }} />手动</label></div></td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'unit')} defaultValue={unit} data-detail-unit={unit} style={{ ...inputStyle, minWidth: 70 }} /></td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'taxInclusiveUnitPrice')} type="number" step="0.01" defaultValue={unitPrice || ''} placeholder="单价" style={inputStyle} /></td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'taxRate')} defaultValue={taxRateText} style={{ ...inputStyle, minWidth: 68 }} /></td>
            <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
            <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxExclusiveAmount || 0)}</td>
            <td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxAmount || 0)}</td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'allocationMethod')} defaultValue={saved?.allocationMethod || dict.targetAllocationMethod || '建筑面积分摊'} style={{ ...inputStyle, minWidth: 140 }} /></td>
            <td style={{ ...cell, padding: 0 }}><input form={formId} name={entryKey(entry.entryId, 'remark')} defaultValue={saved?.remark || dict.remark || ''} placeholder="备注" style={{ ...inputStyle, minWidth: 130 }} /></td>
            <td style={{ ...cell, color: isFilled ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{isFilled ? '已填' : (suggestion.quantity ? '已带入' : '未填')}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>;
  }

  return <main className="page" style={{ padding: 0 }}>
    <div data-detail-scope={scopeId} style={{ maxWidth: 1840, margin: '0 auto', padding: 12 }}>
      {renderTopNav(project.id, project.name, props.returnPath, props.title)}
      <div className="container" style={{ maxWidth: 'none', width: '100%', padding: 0 }}>
        <div className="page-header"><div><p className="eyebrow">{props.eyebrow}</p><h1 className="title">{project.name}</h1><p className="subtitle">{props.subtitle} 底层按“测算指标 × 含量/系数 = 工程量/计费基数”计算；工程量单位优先按末级科目单位，勾选手动后才按手填工程量保存。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总</Link><Link href={`/projects/${project.id}/cost-mapping`} className="btn">导入科目映射</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
        {props.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>{props.title}已保存。</div> : null}
        {hiddenDictionaryRows || hiddenCostRows || redirectedProductRows ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8', background: '#fff9db' }}>已隐藏未启用/配置未触发/跨专业科目 {hiddenDictionaryRows} 行、成本行 {hiddenCostRows} 行；有 {redirectedProductRows} 个业态明细按成本归属规则重定向。</div> : null}
        <div className="summary-strip"><div className="stat"><div className="stat-label">含税合计</div><div className="stat-value">{fmt(totalInclusive)}</div></div><div className="stat"><div className="stat-label">不含税金额</div><div className="stat-value">{fmt(totalExclusive)}</div></div><div className="stat"><div className="stat-label">税额</div><div className="stat-value">{fmt(totalTax)}</div></div><div className="stat"><div className="stat-label">已填 / 明细行</div><div className="stat-value">{filledRows} / {visibleRows}</div></div></div>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}><div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><b>{props.title}｜业态归属 + 科目树填报</b><div className="meta">顶层排序：项目整体共用、住宅、商业、地下室/车位、配套、其他；启用业态优先按地产产品逻辑顺序显示，二级、三级科目均可单独保存。</div></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}><ProfessionalDetailFoldControls scopeId={scopeId} /><button form={formId} className="btn btn-primary" style={{ minHeight: 34 }}>整表批量保存</button></div></div><form id={formId} action={`/api/projects/${project.id}/professional-costs/batch`} method="post" /><input form={formId} type="hidden" name="professionalGroup" value={props.professionalGroup} /><input form={formId} type="hidden" name="returnPath" value={props.returnPath} />
          <div style={{ maxHeight: '72vh', overflow: 'auto', padding: 12 }}>
            {visibleGroups.length === 0 ? <p className="meta">{props.emptyText} 请先在项目概况/业态维护中启用对应业态，或检查概况表配置开关。</p> : visibleGroups.map((group) => <details key={group.id} data-cost-detail-group open style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 12, background: '#e9f7f8', display: 'grid', gridTemplateColumns: '1fr 130px 150px 120px 120px', gap: 10, alignItems: 'center', fontWeight: 900 }}><span>成本归属｜{group.name}</span><span>已填 {group.filled}/{group.rows}</span><span style={{ textAlign: 'right' }}>{fmt(group.amount)}</span><span style={{ textAlign: 'right' }}><GroupSaveButton formId={formId} groupId={group.id} label="保存归属组" /></span><span style={{ textAlign: 'right' }}>展开/收起</span></summary><div style={{ padding: 10 }}>{buildSubjectTree(group.entries).map((second) => <details key={`${group.id}-${second.id}`} data-cost-detail-group open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden', background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 10, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 130px 150px 120px 120px', gap: 10, alignItems: 'center', fontWeight: 800 }}><span>二级｜{second.name}</span><span>已填 {second.filled}/{second.rows}</span><span style={{ textAlign: 'right' }}>{fmt(second.amount)}</span><span style={{ textAlign: 'right' }}><GroupSaveButton formId={formId} groupId={`${group.id}__${second.id}`} label="保存二级" /></span><span style={{ textAlign: 'right' }}>展开/收起</span></summary><div style={{ padding: 8 }}>{second.childRows.map((third) => <details key={`${group.id}-${third.id}`} data-cost-detail-group open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden', background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 10, background: '#fcfdff', display: 'grid', gridTemplateColumns: '1fr 130px 150px 120px 120px', gap: 10, alignItems: 'center' }}><b>三级｜{third.name}</b><span>已填 {third.filled}/{third.rows}</span><span style={{ textAlign: 'right' }}>{fmt(third.amount)}</span><span style={{ textAlign: 'right' }}><GroupSaveButton formId={formId} groupId={`${group.id}__${second.id}__${third.id}`} label="保存三级" /></span><span style={{ textAlign: 'right' }}>展开/收起</span></summary>{renderEntryTable(third.entries, [`${group.id}__${second.id}`, `${group.id}__${second.id}__${third.id}`])}</details>)}</div></details>)}</div></details>)}
          </div>
        </section>
      </div>
    </div>
  </main>;
}
