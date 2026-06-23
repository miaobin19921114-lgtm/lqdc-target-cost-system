import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DETAIL_TYPES = [
  ['land', '土地费用明细表'],
  ['pre', '前期费用明细表'],
  ['building', '土建明细表'],
  ['installation', '安装明细表'],
  ['equipment', '设备明细表'],
  ['fitout', '精装修明细表'],
  ['outdoor-pipe', '室外管网明细表'],
  ['landscape', '景观工程明细表'],
  ['road', '道路总平明细表'],
  ['wall-gate', '围墙出入口明细表'],
] as const;

type VersionRow = { id: string; name: string; stage: string | null; snapshotId: string | null; snapshotStatus: string | null; sourceTemplateCode: string | null };
type ResultRow = { id: string; detailType: string; subjectCode: string; subjectName: string; applicableStage: string; precisionLevel: string; measureBasis: string | null; quantityFormula: string | null; pricingUnit: string | null; unitPriceSource: string | null; quantity: string | null; unitPrice: string | null; taxRate: string | null; taxInclusiveAmount: string; taxExclusiveAmount: string; taxAmount: string; calculationStatus: string; isManualAdjusted: boolean; remark: string | null };
type SummaryRow = { detailType: string; count: number; taxInclusiveAmount: string; taxExclusiveAmount: string; taxAmount: string };

function valueOf(formData: FormData, name: string) { return String(formData.get(name) || '').trim(); }
function numOf(formData: FormData, name: string) { const value = Number(valueOf(formData, name)); return Number.isFinite(value) ? value : 0; }
function detailTypeLabel(code: string) { return DETAIL_TYPES.find(([value]) => value === code)?.[1] || code; }
function amountText(value: string | number | null | undefined) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }

async function generateDetailResults(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const detailType = valueOf(formData, 'detailType') || 'building';
  const backUrl = `/projects/${projectId}/detail-rule-calculation?versionId=${encodeURIComponent(versionId)}&detailType=${encodeURIComponent(detailType)}`;

  const [snapshot] = await prisma.$queryRawUnsafe<Array<{ id: string; snapshotStatus: string }>>(`
    SELECT "id", "snapshotStatus" FROM "VersionRuleSnapshot" WHERE "projectId"=$1 AND "versionId"=$2
  `, projectId, versionId).catch(() => []);
  if (!snapshot) redirect(`${backUrl}&error=no-version-snapshot`);

  await prisma.$executeRawUnsafe(`DELETE FROM "DetailCalculationResult" WHERE "projectId"=$1 AND "versionId"=$2 AND "detailType"=$3 AND "isManualAdjusted"=FALSE`, projectId, versionId, detailType);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "DetailCalculationResult" (
      "id", "projectId", "versionId", "versionSnapshotId", "sourceRuleId", "detailType", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel",
      "professionalGroup", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "quantity", "unitPrice", "taxRate", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "amountFormula",
      "costAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "calculationStatus", "remark"
    )
    SELECT
      'detail-' || $2 || '-' || $3 || '-' || vur."id",
      $1,
      $2,
      $4,
      vur."id",
      $3,
      vur."ruleType",
      vur."subjectCode",
      vur."subjectName",
      vur."applicableStage",
      vur."precisionLevel",
      CASE
        WHEN $3='land' THEN '土地费'
        WHEN $3='pre' THEN '前期费'
        WHEN $3='building' THEN '土建'
        WHEN $3='installation' THEN '安装'
        WHEN $3='equipment' THEN '设备'
        WHEN $3='fitout' THEN '精装修'
        WHEN $3='outdoor-pipe' THEN '室外管网'
        WHEN $3='landscape' THEN '景观工程'
        WHEN $3='road' THEN '道路总平'
        WHEN $3='wall-gate' THEN '围墙出入口'
        ELSE '其他明细'
      END,
      vur."measureBasis",
      vur."quantityFormula",
      vur."pricingUnit",
      vur."unitPriceSource",
      0,
      0,
      CASE WHEN COALESCE(vur."vatTreatment", '') LIKE '%9%' THEN 0.09 WHEN COALESCE(vur."vatTreatment", '') LIKE '%6%' THEN 0.06 ELSE 0.09 END,
      0,
      0,
      0,
      vur."amountFormula",
      vur."costAttributionMethod",
      vur."allocationMethod",
      vur."vatTreatment",
      vur."landVatTreatment",
      vur."incomeTaxTreatment",
      'draft',
      '由版本规则快照生成，待录入工程量/单价'
    FROM "VersionUnifiedRuleSnapshot" vur
    WHERE vur."snapshotId"=$4 AND vur."ruleType"='COST' AND vur."isEnabled"=TRUE
      AND (
        ($3='land' AND vur."subjectCode" LIKE '01%') OR
        ($3='pre' AND vur."subjectCode" LIKE '02%' AND vur."subjectName" NOT LIKE '%围墙%' AND vur."subjectName" NOT LIKE '%出入口%') OR
        ($3='wall-gate' AND vur."subjectCode" LIKE '02%' AND (vur."subjectName" LIKE '%围墙%' OR vur."subjectName" LIKE '%出入口%' OR vur."subjectName" LIKE '%临设%')) OR
        ($3='building' AND vur."subjectCode" LIKE '03%' AND vur."subjectName" NOT LIKE '%安装%' AND vur."subjectName" NOT LIKE '%给排水%' AND vur."subjectName" NOT LIKE '%电气%' AND vur."subjectName" NOT LIKE '%消防%' AND vur."subjectName" NOT LIKE '%弱电%' AND vur."subjectName" NOT LIKE '%暖通%') OR
        ($3='installation' AND vur."subjectCode" LIKE '03%' AND (vur."subjectName" LIKE '%安装%' OR vur."subjectName" LIKE '%给排水%' OR vur."subjectName" LIKE '%电气%' OR vur."subjectName" LIKE '%消防%' OR vur."subjectName" LIKE '%弱电%' OR vur."subjectName" LIKE '%暖通%')) OR
        ($3='equipment' AND vur."subjectCode" LIKE '05%') OR
        ($3='fitout' AND vur."subjectCode" LIKE '06%') OR
        ($3='outdoor-pipe' AND vur."subjectCode" LIKE '04%' AND vur."subjectName" LIKE '%管网%') OR
        ($3='landscape' AND vur."subjectCode" LIKE '04%' AND (vur."subjectName" LIKE '%景观%' OR vur."subjectName" LIKE '%绿化%' OR vur."subjectName" LIKE '%硬景%' OR vur."subjectName" LIKE '%软景%')) OR
        ($3='road' AND vur."subjectCode" LIKE '04%' AND (vur."subjectName" LIKE '%道路%' OR vur."subjectName" LIKE '%总平%'))
      )
    ON CONFLICT ("versionId", "sourceRuleId", "detailType") DO NOTHING
  `, projectId, versionId, detailType, snapshot.id);

  revalidatePath(`/projects/${projectId}/detail-rule-calculation`);
  redirect(`${backUrl}&generated=1`);
}

async function updateDetailResult(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  const detailType = valueOf(formData, 'detailType');
  const resultId = valueOf(formData, 'resultId');
  const quantity = numOf(formData, 'quantity');
  const unitPrice = numOf(formData, 'unitPrice');
  const taxRate = numOf(formData, 'taxRate') || 0.09;
  const taxInclusiveAmount = quantity * unitPrice;
  const taxExclusiveAmount = taxRate > 0 ? taxInclusiveAmount / (1 + taxRate) : taxInclusiveAmount;
  const taxAmount = taxInclusiveAmount - taxExclusiveAmount;
  const remark = valueOf(formData, 'remark');

  await prisma.$executeRawUnsafe(`
    UPDATE "DetailCalculationResult"
    SET "quantity"=$1, "unitPrice"=$2, "taxRate"=$3, "taxInclusiveAmount"=$4, "taxExclusiveAmount"=$5, "taxAmount"=$6,
        "calculationStatus"='calculated', "isManualAdjusted"=TRUE, "remark"=$7, "updatedAt"=CURRENT_TIMESTAMP
    WHERE "id"=$8 AND "projectId"=$9 AND "versionId"=$10
  `, quantity, unitPrice, taxRate, taxInclusiveAmount, taxExclusiveAmount, taxAmount, remark, resultId, projectId, versionId);

  revalidatePath(`/projects/${projectId}/detail-rule-calculation`);
  redirect(`/projects/${projectId}/detail-rule-calculation?versionId=${encodeURIComponent(versionId)}&detailType=${encodeURIComponent(detailType)}`);
}

async function aggregateTargetCost(formData: FormData) {
  'use server';
  const projectId = valueOf(formData, 'projectId');
  const versionId = valueOf(formData, 'versionId');
  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostMeasureAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostMeasureAggregate" ("id", "projectId", "versionId", "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount")
    SELECT 'target-cost-' || $2 || '-' || "subjectCode", $1, $2, "subjectCode", MAX("subjectName"), 'COST', LENGTH("subjectCode"), MAX("subjectCode" || ' ' || "subjectName"), SUM("taxInclusiveAmount"), SUM("taxExclusiveAmount"), SUM("taxAmount")
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2
    GROUP BY "subjectCode"
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount", "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount", "taxAmount"=EXCLUDED."taxAmount", "updatedAt"=CURRENT_TIMESTAMP
  `, projectId, versionId);
  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostSummaryAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostSummaryAggregate" ("id", "projectId", "versionId", "subjectCode", "subjectName", "summaryLevel", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount")
    SELECT 'target-summary-' || $2 || '-' || LEFT("subjectCode",2), $1, $2, LEFT("subjectCode",2), MAX(CASE LEFT("subjectCode",2) WHEN '01' THEN '土地费' WHEN '02' THEN '前期工程费' WHEN '03' THEN '建安工程费' WHEN '04' THEN '室外景观及配套' WHEN '05' THEN '设备工程' WHEN '06' THEN '精装修工程' WHEN '07' THEN '咨询顾问费' WHEN '08' THEN '开发间接费' WHEN '09' THEN '营销费用' WHEN '10' THEN '财务费用' WHEN '11' THEN '预备费' WHEN '12' THEN '税金' ELSE LEFT("subjectCode",2) END), 1, SUM("taxInclusiveAmount"), SUM("taxExclusiveAmount"), SUM("taxAmount")
    FROM "TargetCostMeasureAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    GROUP BY LEFT("subjectCode",2)
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount", "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount", "taxAmount"=EXCLUDED."taxAmount", "updatedAt"=CURRENT_TIMESTAMP
  `, projectId, versionId);
  revalidatePath(`/projects/${projectId}/detail-rule-calculation`);
  revalidatePath(`/projects/${projectId}/costs-batch`);
  revalidatePath(`/projects/${projectId}/summary`);
  redirect(`/projects/${projectId}/detail-rule-calculation?versionId=${encodeURIComponent(versionId)}&aggregated=1`);
}

async function loadVersions(projectId: string) {
  return prisma.$queryRawUnsafe<VersionRow[]>(`
    SELECT pv."id", pv."name", pv."stage", vrs."id" AS "snapshotId", vrs."snapshotStatus", vrs."sourceTemplateCode"
    FROM "ProjectVersion" pv
    LEFT JOIN "VersionRuleSnapshot" vrs ON vrs."versionId"=pv."id"
    WHERE pv."projectId"=$1 ORDER BY pv."createdAt" DESC
  `, projectId).catch(() => []);
}

async function loadResults(projectId: string, versionId?: string, detailType?: string) {
  if (!versionId || !detailType) return [];
  return prisma.$queryRawUnsafe<ResultRow[]>(`
    SELECT "id", "detailType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "quantity"::text, "unitPrice"::text, "taxRate"::text, "taxInclusiveAmount"::text, "taxExclusiveAmount"::text, "taxAmount"::text, "calculationStatus", "isManualAdjusted", "remark"
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2 AND "detailType"=$3
    ORDER BY "subjectCode" ASC, "applicableStage" ASC, "precisionLevel" ASC
  `, projectId, versionId, detailType).catch(() => []);
}

async function loadSummary(projectId: string, versionId?: string) {
  if (!versionId) return [];
  return prisma.$queryRawUnsafe<SummaryRow[]>(`
    SELECT "detailType", COUNT(*)::int AS count, SUM("taxInclusiveAmount")::text AS "taxInclusiveAmount", SUM("taxExclusiveAmount")::text AS "taxExclusiveAmount", SUM("taxAmount")::text AS "taxAmount"
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2
    GROUP BY "detailType" ORDER BY "detailType" ASC
  `, projectId, versionId).catch(() => []);
}

export default async function DetailRuleCalculationPage({ params, searchParams }: { params: { id: string }; searchParams?: { versionId?: string; detailType?: string; error?: string; generated?: string; aggregated?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;
  const versions = await loadVersions(project.id);
  const selectedVersion = versions.find((item) => item.id === searchParams?.versionId) || versions.find((item) => item.snapshotId) || versions[0];
  const detailType = searchParams?.detailType || 'building';
  const [results, summary] = await Promise.all([loadResults(project.id, selectedVersion?.id, detailType), loadSummary(project.id, selectedVersion?.id)]);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">明细测算</p><h1 className="title">{project.name} · 规则驱动明细测算</h1><p className="subtitle">各专业明细页读取版本规则快照生成明细结果；目标成本测算表只汇总明细结果，目标成本汇总表再汇总目标成本测算表。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn" href={`/projects/${project.id}/version-snapshot-generator`}>版本快照生成</Link><Link className="btn btn-primary" href={`/projects/${project.id}/costs-batch`}>目标成本测算</Link></div></div>

    {searchParams?.error === 'no-version-snapshot' ? <section className="card" style={{ marginBottom: 14, background: '#fff5f5', borderColor: '#ffc9c9' }}><b style={{ color: '#c92a2a' }}>当前版本没有版本规则快照，请先生成版本快照。</b></section> : null}
    {searchParams?.generated ? <section className="card" style={{ marginBottom: 14, background: '#ebfbee', borderColor: '#b2f2bb' }}><b style={{ color: '#2b8a3e' }}>已从版本规则快照生成明细结果。</b></section> : null}
    {searchParams?.aggregated ? <section className="card" style={{ marginBottom: 14, background: '#ebfbee', borderColor: '#b2f2bb' }}><b style={{ color: '#2b8a3e' }}>已汇总到目标成本测算表和目标成本汇总表。</b></section> : null}

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>选择版本和明细类型</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{versions.map((version)=><Link key={version.id} className={selectedVersion?.id===version.id?'btn btn-primary':'btn'} href={`/projects/${project.id}/detail-rule-calculation?versionId=${version.id}&detailType=${detailType}`}>{version.name}{version.snapshotId?'':'（未生成快照）'}</Link>)}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>{DETAIL_TYPES.map(([code, label])=><Link key={code} className={detailType===code?'btn btn-primary':'btn'} href={`/projects/${project.id}/detail-rule-calculation?versionId=${selectedVersion?.id || ''}&detailType=${code}`}>{label}</Link>)}</div></section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>执行明细生成 / 汇总</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><form action={generateDetailResults}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={selectedVersion?.id || ''}/><input type="hidden" name="detailType" value={detailType}/><button className="btn btn-primary" type="submit" disabled={!selectedVersion?.snapshotId}>从版本规则生成当前明细</button></form><form action={aggregateTargetCost}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={selectedVersion?.id || ''}/><button className="btn" type="submit" disabled={!selectedVersion}>汇总到目标成本测算表</button></form></div><p className="meta" style={{ margin: '8px 0 0' }}>当前明细：{detailTypeLabel(detailType)}。自动生成只覆盖未手动调整行，已手动调整的行会保留。</p></section>

    <section className="card" style={{ marginBottom: 14 }}><h2 style={{ marginTop: 0 }}>明细汇总</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>{summary.map((item)=><div key={item.detailType} className="stat"><div className="stat-label">{detailTypeLabel(item.detailType)}</div><div className="stat-value">{amountText(item.taxInclusiveAmount)}</div><div className="meta">{item.count} 行 / 含税</div></div>)}</div></section>

    <section className="card"><h2 style={{ marginTop: 0 }}>{detailTypeLabel(detailType)} · 明细测算结果</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1300 }}><thead><tr style={{ background: '#f1f5f9' }}>{['科目','阶段/精度','测算依据','工程量公式','计价单位','单价来源','工程量','单价','税率','含税金额','不含税金额','税额','状态','操作'].map((h)=><th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead><tbody>{results.map((row)=><tr key={row.id}><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}><b>{row.subjectCode}</b><br/>{row.subjectName}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.applicableStage}<br/><span className="meta">{row.precisionLevel}</span></td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.measureBasis || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.quantityFormula || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.pricingUnit || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.unitPriceSource || '-'}</td><td colSpan={6} style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}><form action={updateDetailResult} style={{ display: 'grid', gridTemplateColumns: '80px 90px 70px 100px 100px 90px 1fr 70px', gap: 6, alignItems: 'center' }}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="versionId" value={selectedVersion?.id || ''}/><input type="hidden" name="detailType" value={detailType}/><input type="hidden" name="resultId" value={row.id}/><input name="quantity" defaultValue={row.quantity || '0'} style={{ border: '1px solid #d8e0ea', borderRadius: 6, padding: 6 }}/><input name="unitPrice" defaultValue={row.unitPrice || '0'} style={{ border: '1px solid #d8e0ea', borderRadius: 6, padding: 6 }}/><input name="taxRate" defaultValue={row.taxRate || '0.09'} style={{ border: '1px solid #d8e0ea', borderRadius: 6, padding: 6 }}/><span>{amountText(row.taxInclusiveAmount)}</span><span>{amountText(row.taxExclusiveAmount)}</span><span>{amountText(row.taxAmount)}</span><input name="remark" defaultValue={row.remark || ''} style={{ border: '1px solid #d8e0ea', borderRadius: 6, padding: 6 }}/><button className="btn" type="submit">保存</button></form></td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}>{row.calculationStatus}{row.isManualAdjusted ? <><br/><span className="meta">手调</span></> : null}</td><td style={{ padding: 8, borderBottom: '1px solid #edf2f7' }}></td></tr>)}</tbody></table></div>{!results.length ? <p className="meta">当前明细还没有结果，请先点击“从版本规则生成当前明细”。</p> : null}</section>
  </div></main>;
}
