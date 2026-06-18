import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';
import { suggestQuantityFromOverview } from '@/lib/overview-quantity';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { getCostSettings, getProfessionalCostGroupName, normalizeCostGroupName, shouldGenerateProfessionalCostGroup } from '@/lib/cost-product-settings';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function ensurePresetRows(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  const presetRows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  if (!presetRows.length || count >= 100) return;
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

type DetailEntry = {
  entryId: string;
  dict: any;
  saved: any;
  amount: number;
  groupName: string;
};

type Group = {
  id: string;
  name: string;
  amount: number;
  rows: number;
  filled: number;
  entries: DetailEntry[];
};

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const inputStyle = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
const stickyCode = { ...cell, position: 'sticky' as const, left: 0, zIndex: 2, background: '#fff', fontWeight: 900, color: '#0f4c5c' };
const stickyName = { ...cell, position: 'sticky' as const, left: 94, zIndex: 2, background: '#fff', fontWeight: 800 };

function entryKey(entryId: string, field: string) {
  return `${field}-${entryId}`;
}

function normalize(value: string | null | undefined) {
  return String(value || '').trim();
}

function hasAny(text: string | null | undefined, words: string[]) {
  const value = normalize(text);
  return words.some((word) => value.includes(word));
}

function groupKey(code: string | null | undefined, groupName: string) {
  return `${code || ''}__${normalizeCostGroupName(groupName)}`;
}

function productTokens(name: string) {
  const tokens = [name];
  if (hasAny(name, ['商业街']) && hasAny(name, ['一层', '二层', '三层', '1层', '2层', '3层', '首层', '二楼', '三楼'])) tokens.push('商业街');
  if (hasAny(name, ['住宅', '高层', '洋房', '别墅', '合院', '叠拼', '小高'])) tokens.push('住宅', '高层', '洋房', '别墅', '合院');
  if (hasAny(name, ['商业', '底商', '商铺', '集中商业', '商业街'])) tokens.push('商业', '底商', '商铺', '商业街');
  if (hasAny(name, ['地下', '车位', '车库', '地库', '人防'])) tokens.push('地下', '地下车库', '地下车位', '车位', '车库', '地库', '人防');
  if (hasAny(name, ['配套', '物业', '社区', '会所', '养老', '托育', '文化', '设备用房'])) tokens.push('配套', '物业', '社区', '会所');
  return Array.from(new Set(tokens));
}

function matchesInactiveProductName(text: string | null | undefined, inactiveNames: Set<string>) {
  const value = normalize(text);
  if (!value) return false;
  return Array.from(inactiveNames).some((name) => value === name || value === `业态-${name}` || value === `区域-${name}` || value.includes(name));
}

function appliesToProduct(row: any, product: any) {
  const applicable = normalize(row.applicableProductType);
  if (!applicable) return true;
  if (hasAny(applicable, ['全项目', '项目整体', '项目共用'])) return false;
  return productTokens(product.name).some((token) => applicable.includes(token));
}

function getOrCreateGroup(groupMap: Map<string, Group>, groupName: string) {
  const normalized = normalizeCostGroupName(groupName);
  const id = `group-${normalized}`;
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

export async function ProfessionalDetailPage(props: DetailPageProps) {
  const project = await prisma.project.findUnique({ where: { id: props.projectId } });
  if (!project) return <main className="page">项目不存在</main>;

  await ensurePresetRows(project.id);
  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true }
  });
  const activeProducts = (version?.products || []).filter((item) => item.isActive);
  const inactiveProductNames = new Set((version?.products || []).filter((item) => !item.isActive).map((item) => item.name));

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: props.projectId, enabled: { not: '否' }, sourceTable: props.eyebrow },
    orderBy: { rowIndex: 'asc' }
  });
  const rawLeafRows = dictionaryRows.filter((row) => row.detailSubject);
  const rawCosts = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id, professionalGroup: props.professionalGroup },
    include: { costSubject: true, productType: true },
    orderBy: { sortOrder: 'asc' }
  }) : [];
  const costs = rawCosts.filter((row) => costShouldRemainInProfessional(row, props.professionalGroup, inactiveProductNames));
  const hiddenCostRows = rawCosts.length - costs.length;

  const costByCodeAndGroup = new Map<string, any>();
  costs.forEach((row) => costByCodeAndGroup.set(groupKey(row.costSubject.code, row.regionOrProductType || '项目整体共用'), row));

  const groupMap = new Map<string, Group>();
  let hiddenDictionaryRows = 0;
  let redirectedProductRows = 0;
  for (const dict of rawLeafRows) {
    if (matchesInactiveProductName(dict.applicableProductType, inactiveProductNames)) {
      hiddenDictionaryRows += 1;
      continue;
    }

    const targetGroupNames = new Set<string>();
    if (hasAny(dict.applicableProductType, ['全项目', '项目整体', '项目共用'])) {
      targetGroupNames.add('项目整体共用');
    } else {
      for (const product of activeProducts) {
        if (!appliesToProduct(dict, product)) continue;
        const setting = getCostSettings(product);
        const groupName = getProfessionalCostGroupName(product);
        if (!shouldGenerateProfessionalCostGroup(props.professionalGroup, groupName)) {
          hiddenDictionaryRows += 1;
          continue;
        }
        targetGroupNames.add(groupName);
        if (!setting.standalone || groupName !== product.name) redirectedProductRows += 1;
      }
    }

    if (!targetGroupNames.size) {
      hiddenDictionaryRows += 1;
      continue;
    }

    for (const groupName of Array.from(targetGroupNames)) {
      const group = getOrCreateGroup(groupMap, groupName);
      const saved = dict.costCode ? costByCodeAndGroup.get(groupKey(dict.costCode, group.name)) : null;
      const amount = Number(saved?.taxInclusiveAmount || 0);
      const entryId = `${dict.id}__${group.id}`;
      group.entries.push({ entryId, dict, saved, amount, groupName: group.name });
      group.amount += amount;
      group.rows += 1;
      group.filled += amount > 0 ? 1 : 0;
    }
  }

  const visibleGroups = Array.from(groupMap.values()).filter((group) => group.rows > 0);
  const visibleRows = visibleGroups.reduce((sum, group) => sum + group.rows, 0);
  const filledRows = visibleGroups.reduce((sum, group) => sum + group.filled, 0);
  const totalInclusive = visibleGroups.reduce((sum, group) => sum + group.amount, 0);
  const activeCostCodes = new Set<string>(visibleGroups.flatMap((group) => group.entries.map((entry) => entry.dict.costCode).filter((code): code is string => Boolean(code))));
  const activeCosts = costs.filter((row) => activeCostCodes.has(row.costSubject.code));
  const totalExclusive = activeCosts.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = activeCosts.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);

  return <main className="page"><div className="container" style={{ maxWidth: 1680 }}>
    <div className="page-header"><div><p className="eyebrow">{props.eyebrow}</p><h1 className="title">{project.name}</h1><p className="subtitle">{props.subtitle} 当前按“启用业态 + 成本归属规则”分组展示；未启用业态、虚拟归属组和跨专业归属组不生成分组。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总</Link><Link href={`/projects/${project.id}/cost-mapping`} className="btn">导入科目映射</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态维护</Link><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {props.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>{props.title}已批量保存。</div> : null}
    {hiddenDictionaryRows || hiddenCostRows || redirectedProductRows ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffd8a8', background: '#fff9db' }}>已隐藏未启用/虚拟归属/跨专业科目 {hiddenDictionaryRows} 行、成本行 {hiddenCostRows} 行；有 {redirectedProductRows} 个业态明细按成本归属规则重定向。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">含税合计</div><div className="stat-value">{fmt(totalInclusive)}</div></div><div className="stat"><div className="stat-label">不含税金额</div><div className="stat-value">{fmt(totalExclusive)}</div></div><div className="stat"><div className="stat-label">税额</div><div className="stat-value">{fmt(totalTax)}</div></div><div className="stat"><div className="stat-label">已填 / 明细行</div><div className="stat-value">{filledRows} / {visibleRows}</div></div></div>
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}><div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><b>{props.title}｜成本归属分组填报</b><div className="meta">业态清单不增不减；商业楼层维度归商业街，非主楼纯地库归非主楼地下室，公共配套/所在主体不生成独立专业成本组。</div></div><button form={`${props.returnPath}-batch`} className="btn btn-primary" style={{ minHeight: 34 }}>整表批量保存</button></div><form id={`${props.returnPath}-batch`} action={`/api/projects/${project.id}/professional-costs/batch`} method="post" /><input form={`${props.returnPath}-batch`} type="hidden" name="professionalGroup" value={props.professionalGroup} /><input form={`${props.returnPath}-batch`} type="hidden" name="returnPath" value={props.returnPath} />
      <div style={{ maxHeight: '72vh', overflow: 'auto', padding: 12 }}>
        {visibleGroups.length === 0 ? <p className="meta">{props.emptyText} 请先在项目概况/业态维护中启用对应业态。</p> : visibleGroups.map((group) => <details key={group.id} open style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: '#fff' }}><summary style={{ cursor: 'pointer', padding: 12, background: '#e9f7f8', display: 'grid', gridTemplateColumns: '1fr 130px 150px 150px', gap: 10, alignItems: 'center', fontWeight: 900 }}><span>成本归属｜{group.name}</span><span>已填 {group.filled}/{group.rows}</span><span style={{ textAlign: 'right' }}>{fmt(group.amount)}</span><span style={{ textAlign: 'right' }}>展开/收起</span></summary><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1700, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#fff' }}>{['编码', '末级科目', '专业/部位', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '不含税金额', '税额', '分摊方式', '备注', '状态'].map((head, index) => <th key={head} style={{ ...(index === 0 ? stickyCode : index === 1 ? stickyName : cell), textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead><tbody>{group.entries.map((entry, index) => { const dict = entry.dict; const saved = entry.saved; const amount = entry.amount; const suggestion = suggestQuantityFromOverview(project, dict); const quantity = saved ? Number(saved.quantity || 0) : suggestion.quantity; const unit = saved?.unit || suggestion.unit || dict.unit || ''; const unitPrice = Number(saved?.taxInclusiveUnitPrice || 0); const isFilled = amount > 0; const taxRateText = saved ? `${Number(saved.taxRate || 0) * 100}%` : dict.defaultTaxRate || '9%'; return <tr key={entry.entryId} style={{ background: isFilled ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}><td style={stickyCode}>{dict.costCode || '-'}</td><td style={stickyName}>{dict.detailSubject || '-'}</td><td style={cell}>{dict.thirdSubject || dict.secondSubject || '-'}</td><td style={cell}><input form={`${props.returnPath}-batch`} type="hidden" name="dictionaryRowId" value={entry.entryId} />{saved ? <input form={`${props.returnPath}-batch`} type="hidden" name={entryKey(entry.entryId, 'costLineId')} value={saved.id} /> : null}<input form={`${props.returnPath}-batch`} type="hidden" name={entryKey(entry.entryId, 'regionOrProductType')} value={entry.groupName} /><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'measureBasis')} defaultValue={saved?.measureBasis || dict.measureBasis || ''} style={{ ...inputStyle, minWidth: 180 }} />{!saved && suggestion.source ? <div className="meta">默认取数：{suggestion.source}</div> : null}</td><td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'quantity')} type="number" step="0.01" defaultValue={quantity || ''} placeholder="工程量" style={inputStyle} /></td><td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'unit')} defaultValue={unit} style={{ ...inputStyle, minWidth: 70 }} /></td><td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'taxInclusiveUnitPrice')} type="number" step="0.01" defaultValue={unitPrice || ''} placeholder="单价" style={inputStyle} /></td><td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'taxRate')} defaultValue={taxRateText} style={{ ...inputStyle, minWidth: 68 }} /></td><td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxExclusiveAmount || 0)}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(saved?.taxAmount || 0)}</td><td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'allocationMethod')} defaultValue={saved?.allocationMethod || dict.targetAllocationMethod || '建筑面积分摊'} style={{ ...inputStyle, minWidth: 140 }} /></td><td style={{ ...cell, padding: 0 }}><input form={`${props.returnPath}-batch`} name={entryKey(entry.entryId, 'remark')} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...inputStyle, minWidth: 130 }} /></td><td style={{ ...cell, color: isFilled ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{isFilled ? '已填' : (suggestion.quantity ? '已带入' : '未填')}</td></tr>; })}</tbody></table></div></details>)}
      </div></section>
  </div></main>;
}
