import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type CheckLevel = 'ok' | 'warn' | 'risk';

function n(value: unknown) {
  return Number(value || 0);
}

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function levelStyle(level: CheckLevel) {
  if (level === 'ok') return { label: '正常', color: '#2b8a3e', bg: '#f0fff4', border: '#b2f2bb' };
  if (level === 'warn') return { label: '待补充', color: '#8a6d00', bg: '#fff9db', border: '#ffd8a8' };
  return { label: '需复核', color: '#c92a2a', bg: '#fff5f5', border: '#ffc9c9' };
}

function CheckCard({ title, level, desc, actionHref }: { title: string; level: CheckLevel; desc: string; actionHref?: string }) {
  const style = levelStyle(level);
  return <div style={{ border: `1px solid ${style.border}`, background: style.bg, borderRadius: 12, padding: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
      <b>{title}</b>
      <span style={{ color: style.color, border: `1px solid ${style.border}`, borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 900 }}>{style.label}</span>
    </div>
    <p className="meta" style={{ margin: '8px 0 0' }}>{desc}</p>
    {actionHref ? <Link className="btn" href={actionHref} style={{ marginTop: 10 }}>去处理</Link> : null}
  </div>;
}

export default async function IndicatorCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = project.activeVersionId
    ? await prisma.projectVersion.findFirst({ where: { id: project.activeVersionId, projectId: params.id }, include: { products: true, costs: true, revenues: true, taxes: true } })
    : await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' }, include: { products: true, costs: true, revenues: true, taxes: true } });

  const activeProducts = version?.products.filter((item) => item.isActive) || [];
  const saleableProducts = activeProducts.filter((item) => item.isSaleable);
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
  const projectCost = costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const projectRevenue = revenues.reduce((sum, row) => sum + n(row.taxInclusiveRevenue), 0);
  const productBuildingArea = activeProducts.reduce((sum, row) => sum + n(row.buildingArea), 0);
  const productSaleableArea = activeProducts.reduce((sum, row) => sum + n(row.saleableArea), 0);
  const sellableRevenueProducts = saleableProducts.filter((item) => n(item.salePrice) > 0 && n(item.saleableArea) > 0).length;
  const parkingCount = Number(project.parkingCount || 0);
  const chargingPileCount = Number(project.chargingPileCount || 0);
  const chargingRatio = parkingCount ? chargingPileCount / parkingCount : 0;

  const checks = [
    {
      title: '项目基础指标',
      level: buildingArea > 0 && saleableArea > 0 && landArea > 0 ? 'ok' : 'risk',
      desc: buildingArea > 0 && saleableArea > 0 && landArea > 0 ? `总建面 ${buildingArea.toLocaleString()}㎡，可售面积 ${saleableArea.toLocaleString()}㎡，用地面积 ${landArea.toLocaleString()}㎡。` : '总建面、可售面积或用地面积为空，会影响单方、分摊和税费测算。',
      actionHref: `/projects/${project.id}/overview`
    },
    {
      title: '面积勾稽关系',
      level: buildingArea > 0 && Math.abs(buildingArea - aboveGroundArea - undergroundArea) <= Math.max(1, buildingArea * 0.01) ? 'ok' : 'warn',
      desc: buildingArea > 0 ? `总建面与地上/地下合计差异 ${Math.abs(buildingArea - aboveGroundArea - undergroundArea).toLocaleString()}㎡。` : '总建面为空，无法校验地上地下合计关系。',
      actionHref: `/projects/${project.id}/overview`
    },
    {
      title: '可售/不可售面积关系',
      level: buildingArea > 0 && saleableArea > 0 && saleableArea + nonSaleableArea <= buildingArea * 1.05 ? 'ok' : 'warn',
      desc: buildingArea > 0 ? `可售面积 ${saleableArea.toLocaleString()}㎡，不可售面积 ${nonSaleableArea.toLocaleString()}㎡，可售比约 ${pct(saleableArea / buildingArea)}。` : '总建面为空，无法校验可售率。',
      actionHref: `/projects/${project.id}/overview`
    },
    {
      title: '容积率指标',
      level: plotRatio > 0 && capacityArea > 0 ? 'ok' : 'warn',
      desc: plotRatio > 0 && capacityArea > 0 ? `计容建面 ${capacityArea.toLocaleString()}㎡，容积率 ${plotRatio.toFixed(2)}。` : '容积率或计容建面为空，会影响投决和规划指标判断。',
      actionHref: `/projects/${project.id}/overview`
    },
    {
      title: '业态面积完整性',
      level: activeProducts.length > 0 && productBuildingArea > 0 ? 'ok' : 'risk',
      desc: activeProducts.length > 0 ? `启用业态 ${activeProducts.length} 个，业态建面合计 ${productBuildingArea.toLocaleString()}㎡。` : '尚未维护启用业态，收入、成本和分摊无法按业态归集。',
      actionHref: `/projects/${project.id}/product-maintenance`
    },
    {
      title: '业态面积与项目面积匹配',
      level: buildingArea > 0 && productBuildingArea > 0 && Math.abs(productBuildingArea - buildingArea) <= Math.max(1, buildingArea * 0.05) ? 'ok' : 'warn',
      desc: buildingArea > 0 ? `业态建面合计与项目总建面差异 ${Math.abs(productBuildingArea - buildingArea).toLocaleString()}㎡。` : '项目总建面为空，无法校验业态面积匹配。',
      actionHref: `/projects/${project.id}/product-maintenance`
    },
    {
      title: '收入测算完整性',
      level: saleableProducts.length > 0 && sellableRevenueProducts === saleableProducts.length ? 'ok' : 'warn',
      desc: saleableProducts.length > 0 ? `可售业态 ${saleableProducts.length} 个，已维护价格和面积 ${sellableRevenueProducts} 个。` : '没有可售业态，无法形成收入测算。',
      actionHref: `/projects/${project.id}/revenue`
    },
    {
      title: '目标成本完整性',
      level: costs.length > 0 && projectCost > 0 ? 'ok' : 'risk',
      desc: costs.length > 0 ? `成本明细 ${costs.length} 条，含税成本合计 ${projectCost.toLocaleString()} 元。` : '尚未录入目标成本或成本明细。',
      actionHref: `/projects/${project.id}/costs-batch`
    },
    {
      title: '收入成本口径',
      level: projectRevenue > 0 && projectCost > 0 ? 'ok' : 'warn',
      desc: `含税收入 ${projectRevenue.toLocaleString()} 元，含税成本 ${projectCost.toLocaleString()} 元。${projectRevenue > 0 && projectCost > 0 ? `成本收入比约 ${pct(projectCost / projectRevenue)}。` : '收入或成本为空，经营指标无法判断。'}`,
      actionHref: `/projects/${project.id}/summary`
    },
    {
      title: '车位与充电桩指标',
      level: parkingCount > 0 ? 'ok' : 'warn',
      desc: parkingCount > 0 ? `车位 ${parkingCount} 个，充电桩 ${chargingPileCount} 个，充电桩配置比例约 ${pct(chargingRatio)}。` : '车位数量为空，会影响车位收入、地下成本和充电桩指标判断。',
      actionHref: `/projects/${project.id}/parking`
    },
    {
      title: '税率参数',
      level: version?.taxes ? 'ok' : 'warn',
      desc: version?.taxes ? '已维护税率参数，可进行增值税、附加税、土增税和所得税测算。' : '尚未维护税率参数，税费测算可能使用默认或缺失口径。',
      actionHref: `/projects/${project.id}/tax-details`
    },
    {
      title: '模板来源',
      level: project.sourceTemplateName ? 'ok' : 'warn',
      desc: project.sourceTemplateName ? `来源模板：${project.sourceTemplateName}。` : '未记录来源模板，可能为历史项目或手工创建，后续模板沉淀时建议补充。',
      actionHref: '/templates'
    }
  ] as const;

  const okCount = checks.filter((item) => item.level === 'ok').length;
  const warnCount = checks.filter((item) => item.level === 'warn').length;
  const riskCount = checks.filter((item) => item.level === 'risk').length;

  return <main className="page" style={{ background: '#eef3f8', minHeight: '100vh' }}>
    <div className="container" style={{ maxWidth: 1280 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">项目总览</p>
          <h1 className="title">指标校验中心</h1>
          <p className="subtitle">集中检查项目概况、业态面积、收入、成本、税费和模板来源，避免进入后续测算时口径不完整。</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link>
          <Link href={`/projects/${project.id}/dashboard-lite`} className="btn btn-primary">经营总控</Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="summary-strip">
          <div className="stat"><div className="stat-label">正常</div><div className="stat-value" style={{ color: '#2b8a3e' }}>{okCount}</div></div>
          <div className="stat"><div className="stat-label">待补充</div><div className="stat-value" style={{ color: '#8a6d00' }}>{warnCount}</div></div>
          <div className="stat"><div className="stat-label">需复核</div><div className="stat-value" style={{ color: '#c92a2a' }}>{riskCount}</div></div>
          <div className="stat"><div className="stat-label">校验项</div><div className="stat-value">{checks.length}</div></div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {checks.map((item) => <CheckCard key={item.title} title={item.title} level={item.level} desc={item.desc} actionHref={item.actionHref} />)}
      </div>
    </div>
  </main>;
}
