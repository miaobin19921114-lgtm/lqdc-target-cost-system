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
    return priceIndicatorPresets.map((item) => ({ ...item, taxExclusiveUnitPrice: item.taxInclusiveUnitPrice / (1 + item.taxRate), enabled: true }));
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

export default async function PriceLibraryPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true, city: true, district: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const keyword = String(searchParams?.q || '').trim();
  const city = String(searchParams?.city || '').trim();
  const stage = String(searchParams?.stage || '').trim();
  const rows = await loadRows();
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

    <section className="card" style={{ marginBottom: 14 }}><div className="summary-strip"><div className="stat"><div className="stat-label">指标数量</div><div className="stat-value">{rows.length}</div></div><div className="stat"><div className="stat-label">当前筛选</div><div className="stat-value">{filtered.length}</div></div><div className="stat"><div className="stat-label">城市</div><div className="stat-value">{cities.length}</div></div><div className="stat"><div className="stat-label">平均可信度</div><div className="stat-value">{Math.round(averageConfidence * 100)}%</div></div></div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>筛选</h2><form style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 120px', gap: 10, alignItems: 'end' }}><label>关键词<input name="q" defaultValue={keyword} placeholder="科目编码 / 指标名称 / 业态 / 来源" /></label><label>城市<select name="city" defaultValue={city}><option value="">全部</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>阶段<select name="stage" defaultValue={stage}><option value="">全部</option>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className="btn btn-primary">查询</button></form></section>

    <section className="card" style={{ marginBottom: 14 }}><h2>使用说明</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>含税单价</b><p className="meta">目标成本测算默认以含税单价录入，系统按税率反算不含税单价和税额。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>地区口径</b><p className="meta">当前先预置成都经验指标，后续可以沉淀不同城市、区域、业态和建造标准。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>可信度</b><p className="meta">经验指标、历史项目、招采结果、结算数据的可信度不同，后续可用于 AI 推荐权重。</p></div><div style={{ border: '1px solid #d9e2ec', borderRadius: 10, padding: 12 }}><b>后续接入</b><p className="meta">下一步会让测算明细页按科目编码推荐量价库单价。</p></div></div></section>

    <section className="card"><h2>单价指标清单</h2><div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1500, fontSize: 13 }}><thead><tr>{['科目编码', '科目/指标', '地区', '业态/阶段/标准', '工程量单位', '单价单位', '含税单价', '不含税单价', '税率', '来源', '可信度', '说明'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e6edf5', color: '#667085', background: '#f8fafc', position: 'sticky', top: 0 }}>{head}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={`${row.costCode}-${row.indicatorName}-${index}`}><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{row.costCode}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 220 }}><b>{row.indicatorName}</b><div className="meta">{row.subjectName}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{row.region} / {row.city}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 180 }}>{row.productType}<div className="meta">{row.stage}｜{row.standardLevel}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{row.quantityUnit}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{row.pricingUnit}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{displayPrice(row)}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{displayTaxExclusive(row)}</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{Math.round(row.taxRate * 10000) / 100}%</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{row.sourceName}<div className="meta">{row.sourceType}</div></td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{Math.round(row.confidence * 100)}%</td><td style={{ padding: 10, borderBottom: '1px solid #eef2f6', minWidth: 220 }}>{row.remark || '-'}</td></tr>)}</tbody></table></div>{!filtered.length ? <p className="meta">暂无匹配指标。</p> : null}</section>
  </div></main>;
}
