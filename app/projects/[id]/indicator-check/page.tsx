import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type CheckLevel = 'ok' | 'warn' | 'risk';
type CheckItem = {
  group: string;
  item: string;
  current: string;
  standard: string;
  diff: string;
  level: CheckLevel;
  actionHref?: string;
};

function n(value: unknown) {
  return Number(value || 0);
}

function fmt(value: unknown, digits = 2) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(value: number) {
  if (!Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(2)}%`;
}

function areaDiffLabel(diff: number) {
  return `${fmt(Math.abs(diff))}㎡`;
}

function moneyDiffLabel(diff: number) {
  return `${fmt(Math.abs(diff))}元`;
}

function levelStyle(level: CheckLevel) {
  if (level === 'ok') return { label: '正常', color: '#2b8a3e', bg: '#f0fff4', border: '#b2f2bb' };
  if (level === 'warn') return { label: '待补充', color: '#8a6d00', bg: '#fff9db', border: '#ffd8a8' };
  return { label: '需复核', color: '#c92a2a', bg: '#fff5f5', border: '#ffc9c9' };
}

function isParkingProduct(name?: string | null) {
  const value = name || '';
  return value.includes('车位') || value.includes('人防');
}

function isChargingProduct(name?: string | null) {
  return (name || '').includes('充电');
}

function resolveHref(projectId: string, href?: string) {
  if (!href) return '';
  return href.startsWith('/') ? href : `/projects/${projectId}/${href}`;
}

function StatusBadge({ level }: { level: CheckLevel }) {
  const style = levelStyle(level);
  return <span style={{ display: 'inline-block', minWidth: 62, textAlign: 'center', color: style.color, background: style.bg, border: `1px solid ${style.border}`, borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 900 }}>{style.label}</span>;
}

function CheckTable({ title, rows, projectId }: { title: string; rows: CheckItem[]; projectId: string }) {
  return <section className="card" style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <span className="badge">{rows.length} 项</span>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{['检查项', '当前值', '标准/应有值', '差异', '状态', '处理入口'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr key={`${row.group}-${row.item}`}>
            <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{row.item}</td>
            <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.current}</td>
            <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.standard}</td>
            <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.diff}</td>
            <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><StatusBadge level={row.level} /></td>
            <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.actionHref ? <Link className="btn" style={{ minHeight: 30 }} href={resolveHref(projectId, row.actionHref)}>进入</Link> : '-'}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

export default async function IndicatorCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = project.activeVersionId
    ? await prisma.projectVersion.findFirst({ where: { id: project.activeVersionId, projectId: params.id }, include: { products: true, costs: true, revenues: { include: { productType: true } }, taxes: true } })
    : await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' }, include: { products: true, costs: true, revenues: { include: { productType: true } }, taxes: true } });

  const activeProducts = version?.products.filter((item) => item.isActive) || [];
  const nonParkingProducts = activeProducts.filter((item) => !isParkingProduct(item.name));
  const parkingProducts = activeProducts.filter((item) => isParkingProduct(item.name));
  const chargingProducts = activeProducts.filter((item) => isChargingProduct(item.name));
  const saleableProducts = nonParkingProducts.filter((item) => item.isSaleable);
  const costs = version?.costs || [];
  const revenues = version?.revenues || [];

  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);
  const capacityArea = n(project.capacityBuildingArea);
  const aboveGroundArea = n(project.aboveGroundArea);
  const undergroundArea = n(project.undergroundArea);
  const nonSaleableArea = n(project.nonSaleableArea);
  const landArea = n(project.landArea);
  const plotRatio = n(project.plotRatio);
  const calculatedPlotRatio = landArea > 0 ? capacityArea / landArea : 0;

  const productBuildingArea = nonParkingProducts.reduce((sum, row) => sum + n(row.buildingArea), 0);
  const productSaleableArea = nonParkingProducts.reduce((sum, row) => sum + n(row.saleableArea), 0);
  const productBuildingDiff = productBuildingArea - buildingArea;
  const productSaleableDiff = productSaleableArea - saleableArea;
  const groundAreaDiff = buildingArea - aboveGroundArea - undergroundArea;
  const saleableRelationDiff = saleableArea + nonSaleableArea - buildingArea;
  const plotRatioDiff = plotRatio - calculatedPlotRatio;

  const parkingCount = Number(project.parkingCount || 0);
  const parkingDetailCount = Number(project.undergroundPropertyParkingCount || 0) + Number(project.undergroundUseRightParkingCount || 0) + Number(project.civilDefenseParkingCount || 0) + Number(project.aboveGroundParkingCount || 0);
  const chargingPileCount = Number(project.chargingPileCount || 0);
  const chargingRatio = parkingCount ? chargingPileCount / parkingCount : 0;
  const parkingRevenueCount = revenues.filter((row) => isParkingProduct(row.productType?.name)).length;

  const revenueTotal = revenues.reduce((sum, row) => sum + n(row.taxInclusiveRevenue), 0);
  const costTotal = costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const saleableProductIds = new Set(saleableProducts.map((item) => item.id));
  const revenueProductIds = new Set(revenues.map((item) => item.productTypeId));
  const missingRevenueCount = [...saleableProductIds].filter((id) => !revenueProductIds.has(id)).length;
  const costTaxMismatch = costs.filter((row) => n(row.taxInclusiveAmount) > 0 && Math.abs(n(row.taxInclusiveAmount) - n(row.taxExclusiveAmount) - n(row.taxAmount)) > 0.5).length;
  const revenueTaxMismatch = revenues.filter((row) => n(row.taxInclusiveRevenue) > 0 && Math.abs(n(row.taxInclusiveRevenue) - n(row.taxExclusiveRevenue) - n(row.taxAmount)) > 0.5).length;

  const basicChecks: CheckItem[] = [
    {
      group: '基础指标校验',
      item: '项目基础指标完整性',
      current: `用地${fmt(landArea)}㎡ / 总建面${fmt(buildingArea)}㎡ / 可售${fmt(saleableArea)}㎡`,
      standard: '用地面积、总建面、可售面积均应大于0',
      diff: landArea > 0 && buildingArea > 0 && saleableArea > 0 ? '无' : '存在空值',
      level: landArea > 0 && buildingArea > 0 && saleableArea > 0 ? 'ok' : 'risk',
      actionHref: 'overview'
    },
    {
      group: '基础指标校验',
      item: '总建面 = 地上 + 地下',
      current: `总建面${fmt(buildingArea)}㎡，地上+地下${fmt(aboveGroundArea + undergroundArea)}㎡`,
      standard: '总建面应与地上/地下合计基本一致',
      diff: areaDiffLabel(groundAreaDiff),
      level: buildingArea > 0 && Math.abs(groundAreaDiff) <= Math.max(1, buildingArea * 0.01) ? 'ok' : 'warn',
      actionHref: 'overview'
    },
    {
      group: '基础指标校验',
      item: '可售 + 不可售 ≈ 总建面',
      current: `可售+不可售${fmt(saleableArea + nonSaleableArea)}㎡，总建面${fmt(buildingArea)}㎡`,
      standard: '可售面积与不可售面积应能解释总建筑面积',
      diff: areaDiffLabel(saleableRelationDiff),
      level: buildingArea > 0 && Math.abs(saleableRelationDiff) <= Math.max(1, buildingArea * 0.05) ? 'ok' : 'warn',
      actionHref: 'overview'
    },
    {
      group: '基础指标校验',
      item: '容积率与计容建面',
      current: `录入容积率${fmt(plotRatio, 4)}，反算容积率${fmt(calculatedPlotRatio, 4)}`,
      standard: '容积率≈计容建面/用地面积',
      diff: fmt(plotRatioDiff, 4),
      level: landArea > 0 && capacityArea > 0 && plotRatio > 0 && Math.abs(plotRatioDiff) <= 0.05 ? 'ok' : 'warn',
      actionHref: 'overview'
    }
  ];

  const productChecks: CheckItem[] = [
    {
      group: '业态面积校验',
      item: '启用业态完整性',
      current: `启用业态${activeProducts.length}个，非车位业态${nonParkingProducts.length}个`,
      standard: '至少应有一个非车位业态用于收入、成本、分摊',
      diff: nonParkingProducts.length > 0 ? '无' : '缺少业态',
      level: nonParkingProducts.length > 0 ? 'ok' : 'risk',
      actionHref: 'product-maintenance'
    },
    {
      group: '业态面积校验',
      item: '业态建面合计 vs 项目总建面',
      current: `业态建面${fmt(productBuildingArea)}㎡，项目总建面${fmt(buildingArea)}㎡`,
      standard: '业态建面合计应接近项目总建面',
      diff: areaDiffLabel(productBuildingDiff),
      level: buildingArea > 0 && productBuildingArea > 0 && Math.abs(productBuildingDiff) <= Math.max(1, buildingArea * 0.05) ? 'ok' : 'warn',
      actionHref: 'product-maintenance'
    },
    {
      group: '业态面积校验',
      item: '业态可售面积 vs 项目可售面积',
      current: `业态可售${fmt(productSaleableArea)}㎡，项目可售${fmt(saleableArea)}㎡`,
      standard: '业态可售面积合计应接近项目可售面积',
      diff: areaDiffLabel(productSaleableDiff),
      level: saleableArea > 0 && productSaleableArea > 0 && Math.abs(productSaleableDiff) <= Math.max(1, saleableArea * 0.05) ? 'ok' : 'warn',
      actionHref: 'product-maintenance'
    },
    {
      group: '业态面积校验',
      item: '车位不按面积参与住宅业态校验',
      current: `车位类业态${parkingProducts.length}个`,
      standard: '车位收入应按个数×单价，不能混作普通面积业态',
      diff: parkingProducts.length ? '已识别车位类业态' : '无车位类业态',
      level: 'ok',
      actionHref: 'parking-revenue'
    }
  ];

  const parkingChecks: CheckItem[] = [
    {
      group: '车位与充电桩校验',
      item: '车位总数与分类合计',
      current: `总车位${parkingCount}个，分类合计${parkingDetailCount}个`,
      standard: '地下产权、使用权、人防、地上车位合计应接近总车位',
      diff: `${Math.abs(parkingCount - parkingDetailCount)}个`,
      level: parkingCount > 0 && parkingDetailCount > 0 && Math.abs(parkingCount - parkingDetailCount) <= 2 ? 'ok' : 'warn',
      actionHref: 'overview'
    },
    {
      group: '车位与充电桩校验',
      item: '车位收入专项测算',
      current: `车位收入行${parkingRevenueCount}条`,
      standard: '车位有数量时，建议进入车位收入测算专项维护单价',
      diff: parkingCount > 0 && parkingRevenueCount === 0 ? '缺车位收入行' : '无',
      level: parkingCount > 0 && parkingRevenueCount === 0 ? 'warn' : 'ok',
      actionHref: 'parking-revenue'
    },
    {
      group: '车位与充电桩校验',
      item: '充电桩不作为业态',
      current: `充电桩数量${chargingPileCount}个，疑似充电桩业态${chargingProducts.length}个`,
      standard: '充电桩只作为数量指标和安装/设备成本，不作为业态',
      diff: chargingProducts.length ? '存在疑似错误业态' : '无',
      level: chargingProducts.length ? 'risk' : 'ok',
      actionHref: chargingProducts.length ? 'product-maintenance' : 'overview'
    },
    {
      group: '车位与充电桩校验',
      item: '充电桩配置比例',
      current: `充电桩${chargingPileCount}个，车位${parkingCount}个，比例${pct(chargingRatio)}`,
      standard: '车位数量大于0时，可校验充电桩配置比例',
      diff: parkingCount > 0 ? '可计算' : '车位为空',
      level: parkingCount > 0 ? 'ok' : 'warn',
      actionHref: 'overview'
    }
  ];

  const linkedChecks: CheckItem[] = [
    {
      group: '收入/成本/税费联动校验',
      item: '可售业态收入行',
      current: `可售非车位业态${saleableProducts.length}个，缺收入行${missingRevenueCount}个`,
      standard: '每个可售业态都应有收入测算行',
      diff: missingRevenueCount ? `${missingRevenueCount}个缺失` : '无',
      level: saleableProducts.length > 0 && missingRevenueCount === 0 ? 'ok' : 'warn',
      actionHref: 'revenue'
    },
    {
      group: '收入/成本/税费联动校验',
      item: '目标成本完整性',
      current: `成本明细${costs.length}条，含税成本${fmt(costTotal)}元`,
      standard: '应有目标成本明细和含税成本金额',
      diff: costs.length && costTotal > 0 ? '无' : '缺成本',
      level: costs.length && costTotal > 0 ? 'ok' : 'risk',
      actionHref: 'costs-batch'
    },
    {
      group: '收入/成本/税费联动校验',
      item: '收入成本经营基础',
      current: `含税收入${fmt(revenueTotal)}元，含税成本${fmt(costTotal)}元`,
      standard: '收入和成本均存在，经营测算才有判断基础',
      diff: revenueTotal > 0 && costTotal > 0 ? `成本收入比${pct(costTotal / revenueTotal)}` : '收入或成本为空',
      level: revenueTotal > 0 && costTotal > 0 ? 'ok' : 'warn',
      actionHref: 'revenue-summary'
    },
    {
      group: '收入/成本/税费联动校验',
      item: '含税/不含税/税额平衡',
      current: `成本异常${costTaxMismatch}行，收入异常${revenueTaxMismatch}行`,
      standard: '税额=含税金额-不含税金额',
      diff: costTaxMismatch + revenueTaxMismatch ? `${costTaxMismatch + revenueTaxMismatch}行异常` : '无',
      level: costTaxMismatch + revenueTaxMismatch === 0 ? 'ok' : 'risk',
      actionHref: 'tax-details'
    },
    {
      group: '收入/成本/税费联动校验',
      item: '税费参数基础',
      current: version?.taxes ? '已维护税费参数' : '未维护税费参数',
      standard: '增值税、附加税、土增税、所得税应有参数基础',
      diff: version?.taxes ? '无' : '缺税费参数',
      level: version?.taxes ? 'ok' : 'warn',
      actionHref: 'tax-details'
    }
  ];

  const checks = [...basicChecks, ...productChecks, ...parkingChecks, ...linkedChecks];
  const okCount = checks.filter((item) => item.level === 'ok').length;
  const warnCount = checks.filter((item) => item.level === 'warn').length;
  const riskCount = checks.filter((item) => item.level === 'risk').length;

  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 1280 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">项目基础</p>
          <h1 className="title">指标校验中心</h1>
          <p className="subtitle">项目概况录完后，先检查基础指标、业态面积、车位充电桩、收入成本税费联动，再进入收入测算和成本测算。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link>
          <Link href={`/projects/${project.id}/revenue`} className="btn">收入测算</Link>
          <Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本</Link>
          <Link href={`/projects/${project.id}/revenue-summary`} className="btn btn-primary">收入汇总</Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="summary-strip">
          <div className="stat"><div className="stat-label">正常</div><div className="stat-value" style={{ color: '#2b8a3e' }}>{okCount}</div></div>
          <div className="stat"><div className="stat-label">待补充</div><div className="stat-value" style={{ color: '#8a6d00' }}>{warnCount}</div></div>
          <div className="stat"><div className="stat-label">需复核</div><div className="stat-value" style={{ color: '#c92a2a' }}>{riskCount}</div></div>
          <div className="stat"><div className="stat-label">校验项</div><div className="stat-value">{checks.length}</div></div>
          <div className="stat"><div className="stat-label">完成度</div><div className="stat-value">{pct(okCount / checks.length)}</div></div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 14, borderColor: '#c5eef3', background: '#f8fbff' }}>
        <b>校验口径</b>
        <p className="meta" style={{ margin: '6px 0 0' }}>指标校验中心只检查当前项目业务数据；系统模板、数据库、上传目录等配置问题请进入“系统自检”。</p>
      </section>

      <CheckTable title="一、基础指标校验" rows={basicChecks} projectId={project.id} />
      <CheckTable title="二、业态面积校验" rows={productChecks} projectId={project.id} />
      <CheckTable title="三、车位与充电桩校验" rows={parkingChecks} projectId={project.id} />
      <CheckTable title="四、收入 / 成本 / 税费联动校验" rows={linkedChecks} projectId={project.id} />
    </div>
  </main>;
}
