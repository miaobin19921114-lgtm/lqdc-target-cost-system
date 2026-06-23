import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateActiveVersion } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

type CalculationRuleRow = {
  ruleKey: string;
  costCode: string | null;
  subjectName: string;
  subjectPath: string | null;
  subjectLevel: number | null;
  dataSource: string | null;
  quantityField: string | null;
  configField: string | null;
  calculationMethod: string | null;
  defaultUnit: string | null;
  defaultUnitPrice: unknown;
  defaultCoefficient: unknown;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  taxDeductionMethod: string | null;
  allowQuantityOverride: boolean | null;
  allowPriceOverride: boolean | null;
  priority: number | null;
  remark: string | null;
};

type SubjectRow = {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  fullPath: string | null;
  defaultUnit: string | null;
  defaultMeasureBasis: string | null;
  defaultAllocationMethod: string | null;
};

function short(value?: string | null) {
  return value || '-';
}

function numeric(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function anchor(text: string) {
  return encodeURIComponent(text.replace(/\s+/g, '-'));
}

function groupOf(path?: string | null) {
  const text = path || '未分组';
  return text.split(/[>／/｜|]/).map((item) => item.trim()).filter(Boolean)[0] || '未分组';
}

function has(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function fallbackRule(subject: SubjectRow, index: number): CalculationRuleRow {
  const path = subject.fullPath || subject.name;
  const text = `${subject.code} ${path} ${subject.name}`;
  let dataSource = '工程量指标 / 手工调整';
  let quantityField = subject.defaultMeasureBasis || 'buildingArea';
  let configField = '无';
  let calculationMethod = `${subject.defaultMeasureBasis || '建筑面积'} × 单价`;
  let defaultUnit = subject.defaultUnit || '元/㎡';
  let costAttributionMethod = '按成本受益对象归集';
  let allocationMethod = subject.defaultAllocationMethod || '按建筑面积分摊';
  let taxDeductionMethod = '按成本性质进入开发成本/税前扣除';
  let remark = '规则数据库尚未完成初始化时，由页面按末级科目临时生成的兜底规则。';

  if (has(text, ['土地', '契税', '土地价款'])) {
    dataSource = '概况表 / 土地费明细'; quantityField = 'landArea、landCostAmount'; calculationMethod = '直接金额 或 土地面积 × 单价'; defaultUnit = '万元'; costAttributionMethod = '项目整体'; allocationMethod = '按税务清算口径分摊'; taxDeductionMethod = '土地成本扣除项目';
  } else if (has(text, ['外立面', '外墙', '幕墙', '涂料', '真石漆', '石材', '铝板'])) {
    dataSource = '工程量指标 + 建造配置'; quantityField = 'facadeArea'; configField = '外立面档次'; calculationMethod = '外立面面积 × 档次单价'; costAttributionMethod = '按受益业态/楼栋归集'; allocationMethod = '按建筑面积或外立面面积分摊';
  } else if (has(text, ['门窗', '铝合金', '系统窗'])) {
    dataSource = '工程量指标 + 建造配置'; quantityField = 'windowArea'; configField = '门窗系统'; calculationMethod = '门窗面积 × 系统单价'; costAttributionMethod = '按受益业态/楼栋归集'; allocationMethod = '按建筑面积或门窗面积分摊';
  } else if (has(text, ['电梯'])) {
    dataSource = '工程量指标 + 建造配置'; quantityField = 'elevatorCount、unitCount'; configField = '电梯档次'; calculationMethod = '台数 × 单价'; defaultUnit = '万元/台'; costAttributionMethod = '归属对应楼栋/业态'; allocationMethod = '按楼栋或业态建筑面积分摊';
  } else if (has(text, ['充电桩', '充电'])) {
    dataSource = '工程量指标 + 业态产品'; quantityField = 'chargingPileCount、fastChargingPileCount、slowChargingPileCount'; configField = '充电桩是否单独测算'; calculationMethod = '桩数 × 单价'; defaultUnit = '元/个'; costAttributionMethod = '归属地下车位'; allocationMethod = '不参与住宅分摊或按车位分摊';
  } else if (has(text, ['景观', '绿化', '硬景', '软景', '水景'])) {
    dataSource = '工程量指标 + 建造配置'; quantityField = 'landscapeArea、hardscapeArea、softscapeArea、waterFeatureArea'; configField = '景观档次'; calculationMethod = '面积 × 档次单价'; costAttributionMethod = '项目整体'; allocationMethod = '按建筑面积或可售面积分摊';
  } else if (has(text, ['围墙', '大门', '出入口', '门岗'])) {
    dataSource = '工程量指标'; quantityField = has(text, ['大门', '出入口', '门岗']) ? 'gateCount、formalGateCount、temporaryGateCount' : 'sitePerimeter'; configField = '围墙及出入口档次'; calculationMethod = '长度/数量 × 单价'; defaultUnit = has(text, ['大门', '出入口', '门岗']) ? '万元/个' : '元/m'; costAttributionMethod = '项目整体'; allocationMethod = '按建筑面积或可售面积分摊';
  } else if (has(text, ['精装', '装修', '公区', '大堂', '样板', '售楼部'])) {
    dataSource = '工程量指标 + 建造配置'; quantityField = has(text, ['售楼部']) ? 'salesOfficeArea' : has(text, ['样板']) ? 'showFlatArea' : 'publicArea、lobbyArea、saleableArea'; configField = '装修标准 / 示范区配置'; calculationMethod = '面积 × 装修标准单价'; costAttributionMethod = has(text, ['售楼部', '样板']) ? '示范区/销售费用' : '按装修受益对象归集'; allocationMethod = '按装修受益对象或销售费用口径分摊';
  } else if (has(text, ['增值税', '土地增值税', '所得税', '税'])) {
    dataSource = '收入测算 + 成本测算 + 税务清算对象'; quantityField = '收入、进项、可扣除成本、清算对象'; configField = '税率、清算口径'; calculationMethod = '税法公式'; defaultUnit = '万元'; costAttributionMethod = '清算对象/项目整体'; allocationMethod = '按税务清算对象归集'; taxDeductionMethod = '按税法规定';
  }

  return { ruleKey: subject.code, costCode: subject.code, subjectName: subject.name, subjectPath: path, subjectLevel: subject.level, dataSource, quantityField, configField, calculationMethod, defaultUnit, defaultUnitPrice: 0, defaultCoefficient: 1, costAttributionMethod, allocationMethod, taxDeductionMethod, allowQuantityOverride: true, allowPriceOverride: true, priority: index + 1, remark };
}

function fallbackRules(subjects: SubjectRow[]) {
  const parentCodes = new Set(subjects.map((subject) => subject.parentCode).filter(Boolean));
  return subjects.filter((subject) => !parentCodes.has(subject.code)).map(fallbackRule);
}

async function loadCalculationRules(subjects: SubjectRow[]) {
  try {
    const rows = await prisma.$queryRawUnsafe<CalculationRuleRow[]>(`
      SELECT "ruleKey", "costCode", "subjectName", "subjectPath", "subjectLevel", "dataSource", "quantityField", "configField", "calculationMethod", "defaultUnit", "defaultUnitPrice", "defaultCoefficient", "costAttributionMethod", "allocationMethod", "taxDeductionMethod", "allowQuantityOverride", "allowPriceOverride", "priority", "remark"
      FROM "CostCalculationRule"
      WHERE "enabled" = TRUE
      ORDER BY "priority" ASC, "costCode" ASC
    `);
    return rows.length ? rows : fallbackRules(subjects);
  } catch {
    return fallbackRules(subjects);
  }
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="meta">{note}</div></div>;
}

export default async function CostMappingPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  const version = await getOrCreateActiveVersion(params.id);
  const mappings = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, sourceTable: 'Excel科目映射' }, orderBy: { updatedAt: 'desc' } });
  const subjects = await prisma.costSubject.findMany({ where: { enabled: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }], take: 1000 });
  const calculationRules = await loadCalculationRules(subjects as SubjectRow[]);
  const groups = Array.from(new Set(calculationRules.map((row) => groupOf(row.subjectPath))));
  const recentLines = version ? await prisma.costLine.findMany({ where: { projectVersionId: version.id, regionOrProductType: 'Excel导入' }, include: { costSubject: true }, orderBy: { sortOrder: 'asc' }, take: 80 }) : [];

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">目标成本</p><h1 className="title">{project?.name || '项目'} · 规则数据库 / 科目映射</h1><p className="subtitle">规则数据库按标准成本末级科目生成，连接概况表、建造配置、工程量指标和目标成本测算。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${params.id}/costs-batch`} className="btn btn-primary">目标成本测算</Link><Link href={`/projects/${params.id}/overview`} className="btn">概况表</Link><Link href={`/projects/${params.id}/construction-standards`} className="btn">建造配置</Link><Link href={`/projects/${params.id}/quantity-indicators`} className="btn">工程量指标</Link><Link href={`/projects/${params.id}`} className="btn">测算中心</Link></div></div>

    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>映射已保存。下次导入成本明细会优先使用该映射。</div> : null}
    {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>映射已删除。</div> : null}
    {searchParams?.missing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>请填写 Excel 科目，并选择系统标准科目。</div> : null}
    {searchParams?.targetMissing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9' }}>未找到选择的系统标准科目。</div> : null}

    <div className="summary-strip" style={{ marginBottom: 14 }}><Stat label="规则库明细" value={calculationRules.length} note="覆盖末级成本科目" /><Stat label="成本分组" value={groups.length} note="按科目路径分组" /><Stat label="Excel映射" value={mappings.length} note="已保存映射" /><Stat label="标准科目" value={subjects.length} note="当前标准科目库" /></div>

    <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}><b>规则数据库口径</b><p className="meta" style={{ margin: '6px 0 10px' }}>这里不再写“适用业态”，而是写“成本归属/分摊口径”。业态产品页负责成本归谁，规则数据库负责每个末级科目取哪个量、套哪个配置、如何计算。</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{groups.map((group) => <a key={group} className="btn" href={`#${anchor(group)}`}>{group}</a>)}</div></section>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>{groups.map((group) => { const rows = calculationRules.filter((row) => groupOf(row.subjectPath) === group); return <section key={group} id={anchor(group)} className="card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>{group}</h2><p className="meta" style={{ margin: '5px 0 0' }}>本组共 {rows.length} 条末级规则。</p></div><span style={{ border: '1px solid #d0ebff', background: '#e7f5ff', color: '#0b7285', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{rows.length} 条规则</span></div><div style={{ overflowX: 'auto' }}><table className="table" style={{ minWidth: 1320 }}><thead><tr><th>末级成本科目</th><th>取数来源</th><th>工程量字段</th><th>建造配置字段</th><th>计算方式</th><th>单位/单价/系数</th><th>成本归属/分摊口径</th><th>手动调整</th><th>说明</th></tr></thead><tbody>{rows.map((row) => <tr key={row.ruleKey}><td><b>{row.costCode || '-'}</b><br />{row.subjectPath || row.subjectName}</td><td>{short(row.dataSource)}</td><td>{short(row.quantityField)}</td><td>{short(row.configField)}</td><td>{short(row.calculationMethod)}</td><td>{short(row.defaultUnit)}<br /><span className="meta">单价 {numeric(row.defaultUnitPrice)} / 系数 {numeric(row.defaultCoefficient)}</span></td><td><b>{short(row.costAttributionMethod)}</b><br /><span className="meta">{short(row.allocationMethod)}；{short(row.taxDeductionMethod)}</span></td><td>{row.allowQuantityOverride ? '可改量' : '锁定量'} / {row.allowPriceOverride ? '可改价' : '锁定价'}</td><td className="meta" style={{ minWidth: 230 }}>{short(row.remark)}</td></tr>)}</tbody></table></div></section>; })}</div>

    <section className="card" style={{ marginBottom: 16, borderColor: '#c5eef3', background: '#f8fbff' }}><b>Excel 科目映射</b><p className="meta" style={{ margin: '6px 0 0' }}>下面保留原 Excel 科目映射功能。它解决外部 Excel 叫法不统一的问题；上面的规则数据库解决系统自己怎么自动取数计算。</p></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>新增 / 更新 Excel 映射</h2><form action={`/api/projects/${params.id}/cost-mapping`} method="post" style={{ display: 'grid', gap: 10, marginTop: 12 }}><label><div className="meta">Excel 科目名称 / 科目路径 / 科目编码</div><input name="sourceText" placeholder="例如：主体建安 / 主体结构 / 土建工程费" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }} /></label><label><div className="meta">映射到系统标准成本科目</div><select name="targetCode" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}><option value="">请选择标准成本科目</option>{subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code}｜{subject.fullPath || subject.name}</option>)}</select></label><label><div className="meta">备注</div><input name="remark" placeholder="可选，如：来自某版目标成本表、供应商清单或历史Excel" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }} /></label><div><button className="btn btn-primary">保存映射</button></div></form></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>已保存 Excel 映射</h2><div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['Excel 科目', '系统标准科目编码', '备注', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{mappings.map((mapping) => <tr key={mapping.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{short(mapping.detailSubject)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(mapping.targetMappingCode)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(mapping.remark)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><form action={`/api/projects/${params.id}/cost-mapping`} method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="mappingId" value={mapping.id} /><button className="btn" style={{ borderColor: '#ffc9c9' }}>删除</button></form></td></tr>)}{!mappings.length ? <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>暂无映射。第一次导入可先使用系统科目，导入后再补充常用映射。</td></tr> : null}</tbody></table></div></section>

    <section className="card"><h2>最近 Excel 导入科目参考</h2><p className="meta">可以复制这些科目名称或路径，填到上面的“Excel 科目名称”。</p><div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['工作表 / 分组', '当前明细科目', '当前系统科目', '科目路径'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{recentLines.map((line) => <tr key={line.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(line.professionalGroup)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{line.detailName}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.costSubject.code}｜{line.costSubject.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(line.description)}</td></tr>)}{!recentLines.length ? <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>暂无 Excel 导入科目。</td></tr> : null}</tbody></table></div></section>
  </div></main>;
}
