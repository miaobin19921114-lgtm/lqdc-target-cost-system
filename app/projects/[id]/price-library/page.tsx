import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { priceIndicatorPresets, type PriceIndicatorPreset } from '@/data/price-indicator-presets';

export const dynamic = 'force-dynamic';

type PriceRow = PriceIndicatorPreset & {
  id?: string;
  taxExclusiveUnitPrice?: number;
  effectiveDate?: string;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toString' in value) return Number(value.toString()) || 0;
  return Number(value || 0) || 0;
}

function normalizeRow(row: Record<string, unknown>): PriceRow {
  return {
    id: String(row.id || ''),
    costCode: String(row.costCode || ''),
    subjectName: String(row.subjectName || ''),
    indicatorName: String(row.indicatorName || ''),
    region: String(row.region || '全国'),
    city: String(row.city || '通用'),
    productType: String(row.productType || '通用'),
    stage: String(row.stage || 'SCHEME'),
    standardLevel: String(row.standardLevel || '标准'),
    quantityUnit: String(row.quantityUnit || ''),
    pricingUnit: String(row.pricingUnit || ''),
    taxInclusiveUnitPrice: toNumber(row.taxInclusiveUnitPrice),
    taxExclusiveUnitPrice: toNumber(row.taxExclusiveUnitPrice),
    taxRate: toNumber(row.taxRate),
    sourceType: String(row.sourceType || 'experience'),
    sourceName: String(row.sourceName || ''),
    effectiveDate: String(row.effectiveDate || ''),
    confidence: toNumber(row.confidence),
    enabled: row.enabled !== false,
    remark: String(row.remark || '')
  };
}

async function loadRows() {
  try {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM "PriceIndicatorLibrary"
      WHERE "enabled" = TRUE
      ORDER BY "costCode" ASC, "city" ASC, "indicatorName" ASC
    `;
    return rows.map(normalizeRow);
  } catch {
    return priceIndicatorPresets.map((item, index) => ({ ...item, id: `preset-${index}`, taxExclusiveUnitPrice: item.taxInclusiveUnitPrice / (1 + item.taxRate), enabled: true }));
  }
}

function displayPrice(row: PriceRow) {
  if (row.pricingUnit.includes('万元/')) return `${Math.round(row.taxInclusiveUnitPrice / 10000 * 100) / 100}`;
  return `${Math.round(row.taxInclusiveUnitPrice * 100) / 100}`;
}

function displayTaxExclusive(row: PriceRow) {
  const value = row.taxExclusiveUnitPrice ?? row.taxInclusiveUnitPrice / (1 + row.taxRate);
  if (row.pricingUnit.includes('万元/')) return `${Math.round(value / 10000 * 100) / 100}`;
  return `${Math.round(value * 100) / 100}`;
}

function taxRateText(row: PriceRow) {
  return `${Math.round(row.taxRate * 10000) / 100}%`;
}

function hiddenContext(q: string, city: string, stage: string) {
  return <>
    <input type="hidden" name="q" value={q} />
    <input type="hidden" name="cityFilter" value={city} />
    <input type="hidden" name="stageFilter" value={stage} />
  </>;
}

const inputStyle = { width: '100%' } as const;

export default async function PriceLibraryPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true, city: true, district: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const keyword = String(searchParams?.q || '').trim();
  const city = String(searchParams?.city || '').trim();
  const stage = String(searchParams?.stage || '').trim();
  const rows = await loadRows();
  const costSubjects = await prisma.costSubject.findMany({ where: { enabled: true }, select: { code: true, name: true, fullPath: true }, orderBy: { code: 'asc' } });
  const filtered = rows.filter((row) => {
    const text = `${row.costCode} ${row.subjectName} ${row.indicatorName} ${row.region} ${row.city} ${row.productType} ${row.stage} ${row.standardLevel} ${row.pricingUnit} ${row.sourceName} ${row.remark || ''}`;
    if (keyword && !text.includes(keyword)) return false;
    if (city && row.city !== city) return false;
    if (stage && row.stage !== stage) return false;
    return true;
  });

  const cities = Array.from(new Set(rows.map((row) => row.city).filter(Boolean)));
  const stages = Array.from(new Set(rows.map((row) => row.stage).filter(Boolean)));
  const averageConfidence = rows.length ? rows.reduce((sum, row) => sum + Number(row.confidence || 0), 0) / rows.length : 0;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">模板与规则</p><h1 className="title">量价指标库</h1><p className="subtitle">沉淀地区、业态、阶段、建造标准下的单价指标。当前项目：{project.name}{project.city ? `｜${project.city}` : ''}{project.district ? `｜${project.district}` : ''}</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link><Link href={`/projects/${project.id}/measure-rules`} className="btn">测算规则配置</Link><Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本编制</Link></div></div>

    {searchParams?.created ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>单价指标已新增。</div> : null}
    {searchParams?.saved ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>单价指标已保存。</div> : null}
    {searchParams?.disabled ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8', background: '#fff9db' }}>单价指标已停用。</div> : null}
    {searchParams?.missing ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9', background: '#fff5f5' }}>请填写科目编码和指标名称。</div> : null}

    <section className="card" style={{ marginBottom: 14 }}><div className="summary-strip"><div className="stat"><div className="stat-label">指标数量</div><div className="stat-value">{rows.length}</div></div><div className="stat"><div className="stat-label">当前筛选</div><div className="stat-value">{filtered.length}</div></div><div className="stat"><div className="stat-label">城市</div><div className="stat-value">{cities.length}</div></div><div className="stat"><div className="stat-label">平均可信度</div><div className="stat-value">{Math.round(averageConfidence * 100)}%</div></div></div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>筛选</h2><form style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 120px', gap: 10, alignItems: 'end' }}><label>关键词<input name="q" defaultValue={keyword} placeholder="科目编码 / 指标名称 / 业态 / 来源" /></label><label>城市<select name="city" defaultValue={city}><option value="">全部</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>阶段<select name="stage" defaultValue={stage}><option value="">全部</option>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className="btn btn-primary">查询</button></form></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>新增单价指标</h2><p className="meta">说明：电梯、出入口等“万元/台、万元/个”可以直接填 48、30，后端会按万元单位换算为元保存。</p><form action={`/api/projects/${project.id}/price-library`} method="post" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))', gap: 10, alignItems: 'end' }}><input type="hidden" name="action" value="create-price" />{hiddenContext(keyword, city, stage)}<label>科目编码<input name="costCode" list="price-cost-subjects" placeholder="03.02.01" required style={inputStyle} /></label><datalist id="price-cost-subjects">{costSubjects.map((item) => <option key={item.code} value={item.code}>{item.code} {item.name} {item.fullPath || ''}</option>)}</datalist><label>科目名称<input name="subjectName" placeholder="钢筋工程" style={inputStyle} /></label><label>指标名称<input name="indicatorName" placeholder="主体钢筋综合单价" required style={inputStyle} /></label><label>地区<input name="region" defaultValue="四川" style={inputStyle} /></label><label>城市<input name="city" defaultValue={project.city || '成都'} style={inputStyle} /></label><label>业态<input name="productType" defaultValue="住宅" style={inputStyle} /></label><label>阶段<select name="stage" defaultValue="SCHEME" style={inputStyle}><option value="INVESTMENT">投拓</option><option value="CONCEPT">概念</option><option value="SCHEME">方案</option><option value="DRAWING">施工图</option><option value="TENDER">招采</option><option value="DYNAMIC">动态</option><option value="SETTLEMENT">结算</option></select></label><label>标准<input name="standardLevel" defaultValue="普通住宅" style={inputStyle} /></label><label>工程量单位<input name="quantityUnit" placeholder="㎡/m/t/台" style={inputStyle} /></label><label>单价单位<input name="pricingUnit" placeholder="元/㎡" style={inputStyle} /></label><label>含税单价<input name="taxInclusiveUnitPrice" type="number" step="0.0001" placeholder="例如 4500" style={inputStyle} /></label><label>税率<input name="taxRate" defaultValue="9%" style={inputStyle} /></label><label>来源类型<input name="sourceType" defaultValue="manual" style={inputStyle} /></label><label>来源名称<input name="sourceName" defaultValue="手工维护" style={inputStyle} /></label><label>生效日期<input name="effectiveDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} /></label><label>可信度<input name="confidence" type="number" step="0.01" min="0" max="1" defaultValue="0.7" style={inputStyle} /></label><button className="btn btn-primary">新增指标</button><label style={{ gridColumn: 'span 6' }}>说明备注<textarea name="remark" placeholder="说明价格来源、适用范围、是否含安装等" style={{ width: '100%', minHeight: 60 }} /></label></form></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>使用说明</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>含税单价</b><p className="meta">目标成本测算默认以含税单价录入，系统按税率反算不含税单价和税额。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>地区口径</b><p className="meta">当前先预置成都经验指标，后续可以沉淀不同城市、区域、业态和建造标准。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>可信度</b><p className="meta">经验指标、历史项目、招采结果、结算数据的可信度不同，后续可用于 AI 推荐权重。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>自动推荐</b><p className="meta">成本明细页和后端保存都会按科目编码优先匹配本库单价。</p></div></div></section>

    <section className="card"><h2>单价指标清单</h2><div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 2100, fontSize: 13 }}><thead><tr>{['科目编码', '科目/指标', '地区城市', '业态/阶段/标准', '单位', '含税单价', '税率', '来源', '可信度', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', color: '#667085', background: '#f8fafc', position: 'sticky', top: 0 }}>{head}</th>)}</tr></thead><tbody>{filtered.map((row, index) => { const formId = `price-row-${row.id || index}`; const disableFormId = `disable-price-${row.id || index}`; return <tr key={`${row.costCode}-${row.indicatorName}-${index}`}><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 120 }}><input form={formId} name="costCode" defaultValue={row.costCode} style={{ width: 110, fontWeight: 900 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 250 }}><input form={formId} name="indicatorName" defaultValue={row.indicatorName} style={{ width: 230, fontWeight: 800 }} /><input form={formId} name="subjectName" defaultValue={row.subjectName} placeholder="科目名称" style={{ width: 230, marginTop: 6 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 160 }}><input form={formId} name="region" defaultValue={row.region} style={{ width: 70 }} /> / <input form={formId} name="city" defaultValue={row.city} style={{ width: 70 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 220 }}><input form={formId} name="productType" defaultValue={row.productType} style={{ width: 200 }} /><div style={{ display: 'flex', gap: 6, marginTop: 6 }}><input form={formId} name="stage" defaultValue={row.stage} style={{ width: 90 }} /><input form={formId} name="standardLevel" defaultValue={row.standardLevel} style={{ width: 100 }} /></div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 150 }}><input form={formId} name="quantityUnit" defaultValue={row.quantityUnit} style={{ width: 60 }} /> <input form={formId} name="pricingUnit" defaultValue={row.pricingUnit} style={{ width: 80, marginLeft: 4 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 120 }}><input form={formId} name="taxInclusiveUnitPrice" type="number" step="0.0001" defaultValue={displayPrice(row)} style={{ width: 100, fontWeight: 900 }} /><div className="meta">不含税：{displayTaxExclusive(row)}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><input form={formId} name="taxRate" defaultValue={taxRateText(row)} style={{ width: 70 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 160 }}><input form={formId} name="sourceName" defaultValue={row.sourceName} style={{ width: 140 }} /><input form={formId} name="sourceType" defaultValue={row.sourceType} style={{ width: 140, marginTop: 6 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}><input form={formId} name="confidence" type="number" step="0.01" min="0" max="1" defaultValue={row.confidence} style={{ width: 70 }} /><input form={formId} name="effectiveDate" type="date" defaultValue={row.effectiveDate || ''} style={{ width: 120, marginTop: 6 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 240 }}><textarea form={formId} name="remark" defaultValue={row.remark || ''} style={{ minHeight: 70, width: 220 }} /></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 120 }}><form id={formId} action={`/api/projects/${project.id}/price-library`} method="post"><input type="hidden" name="action" value="update-price" /><input type="hidden" name="id" value={row.id || ''} />{hiddenContext(keyword, city, stage)}<input type="hidden" name="enabled" value="1" /></form><form id={disableFormId} action={`/api/projects/${project.id}/price-library`} method="post"><input type="hidden" name="action" value="disable-price" /><input type="hidden" name="id" value={row.id || ''} />{hiddenContext(keyword, city, stage)}</form><button form={formId} className="btn btn-primary" style={{ minHeight: 30, padding: '4px 10px' }}>保存</button><button form={disableFormId} className="btn" style={{ marginTop: 6, minHeight: 30, padding: '4px 10px', color: '#c92a2a' }}>停用</button></td></tr>; })}</tbody></table></div>{!filtered.length ? <p className="meta">暂无匹配指标。</p> : null}</section>
  </div></main>;
}
