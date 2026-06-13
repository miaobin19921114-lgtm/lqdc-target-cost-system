import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function n(value: unknown) { return Number(value || 0); }
function fmt(value: unknown) { return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

type CheckItem = { module: string; item: string; status: '通过' | '提醒' | '需处理'; detail: string; href?: string };

function statusColor(status: CheckItem['status']) {
  if (status === '通过') return '#2f9e44';
  if (status === '提醒') return '#f08c00';
  return '#e03131';
}

export default async function ProjectCheckPage({ params, searchParams }: { params: { id: string }, searchParams?: { repaired?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      products: true,
      revenues: true,
      costs: { include: { costSubject: true } },
      taxes: true
    }
  });

  const dictCount = await prisma.costDictionaryRow.count({ where: { projectId: params.id } });
  const products = version?.products || [];
  const revenues = version?.revenues || [];
  const costs = version?.costs || [];
  const saleableArea = products.reduce((sum, row) => sum + n(row.saleableArea), 0);
  const buildingArea = products.reduce((sum, row) => sum + n(row.buildingArea), 0);
  const revenueTotal = revenues.reduce((sum, row) => sum + n(row.taxInclusiveRevenue), 0);
  const costTotal = costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0);
  const missingPreset = costs.filter((row) => !row.regionOrProductType || !row.measureBasis || !row.unit || !row.allocationMethod);
  const zeroAmount = costs.filter((row) => n(row.taxInclusiveAmount) === 0);
  const taxMismatch = costs.filter((row) => n(row.taxInclusiveAmount) > 0 && Math.abs(n(row.taxInclusiveAmount) - n(row.taxExclusiveAmount) - n(row.taxAmount)) > 0.5);
  const noRevenueProducts = products.filter((product) => product.isSaleable && !revenues.some((row) => row.productTypeId === product.id));

  const checks: CheckItem[] = [
    {
      module: '项目概况',
      item: '基础指标',
      status: n(project.totalBuildingArea) > 0 && n(project.saleableArea) > 0 ? '通过' : '需处理',
      detail: `总建面 ${fmt(project.totalBuildingArea)}，可售面积 ${fmt(project.saleableArea)}`,
      href: 'overview'
    },
    {
      module: '产品构成',
      item: '业态面积',
      status: products.length > 0 ? '通过' : '需处理',
      detail: `业态 ${products.length} 个，业态建面合计 ${fmt(buildingArea)}，业态可售合计 ${fmt(saleableArea)}`,
      href: 'products'
    },
    {
      module: '收入明细',
      item: '可售业态收入',
      status: revenues.length > 0 && noRevenueProducts.length === 0 ? '通过' : revenues.length > 0 ? '提醒' : '需处理',
      detail: noRevenueProducts.length ? `收入 ${fmt(revenueTotal)}，仍有 ${noRevenueProducts.length} 个可售业态未建收入行` : `收入 ${fmt(revenueTotal)}，收入行 ${revenues.length} 行`,
      href: 'revenue'
    },
    {
      module: '成本科目词典',
      item: '词典完整性',
      status: dictCount >= 300 ? '通过' : '需处理',
      detail: `当前词典 ${dictCount} 行，目标应接近 V57 的 352 行`,
      href: 'cost-dictionary'
    },
    {
      module: '成本明细',
      item: '成本录入',
      status: costs.length > 0 ? '通过' : '需处理',
      detail: `成本明细 ${costs.length} 行，含税成本 ${fmt(costTotal)}`,
      href: 'costs'
    },
    {
      module: '成本明细',
      item: '预设字段带出',
      status: missingPreset.length === 0 ? '通过' : '提醒',
      detail: missingPreset.length ? `有 ${missingPreset.length} 行缺少业态/测算依据/单位/分摊方式，可点击上方自动修复` : '业态、测算依据、单位、分摊方式均已带出',
      href: 'costs'
    },
    {
      module: '成本明细',
      item: '零金额行',
      status: zeroAmount.length === 0 ? '通过' : '提醒',
      detail: zeroAmount.length ? `有 ${zeroAmount.length} 行含税金额为 0，可能是待补单价或工程量` : '无零金额成本行',
      href: 'costs'
    },
    {
      module: '税额公式',
      item: '含税/不含税/税额校验',
      status: taxMismatch.length === 0 ? '通过' : '需处理',
      detail: taxMismatch.length ? `有 ${taxMismatch.length} 行税额拆分不平衡` : '成本行税额拆分平衡',
      href: 'costs'
    },
    {
      module: '成本分摊',
      item: '分摊基础',
      status: products.length > 0 && costs.length > 0 ? '通过' : '需处理',
      detail: products.length > 0 && costs.length > 0 ? '可进入成本分摊测算表复核分摊结果' : '需先维护业态和成本明细',
      href: 'cost-allocation'
    },
    {
      module: '税务测算',
      item: '土增税/税金取数',
      status: revenues.length > 0 && costs.length > 0 ? '通过' : '提醒',
      detail: revenues.length > 0 && costs.length > 0 ? '已具备税务测算取数基础' : '税务测算需要收入和成本同时存在',
      href: 'tax-details'
    }
  ];

  const passed = checks.filter((item) => item.status === '通过').length;
  const reminders = checks.filter((item) => item.status === '提醒').length;
  const blockers = checks.filter((item) => item.status === '需处理').length;
  const repaired = searchParams?.repaired;

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">系统校验</p><h1 className="title">{project.name}</h1><p className="subtitle">自动检查项目概况、业态面积、收入、成本词典、成本明细、税额公式、分摊和税务取数是否完整。</p></div><div className="actions" style={{ marginTop: 0 }}><form action={`/api/projects/${project.id}/repair-cost-presets`} method="post"><button className="btn btn-primary">自动修复成本预设字段</button></form><Link href={`/projects/${project.id}`} className="btn">返回工作台</Link></div></div>
    {repaired ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>已自动修复 {repaired} 行成本明细的业态、测算依据、单位、税率、分摊方式或科目路径。</div> : null}
    <div className="summary-strip"><div className="stat"><div className="stat-label">通过</div><div className="stat-value">{passed}</div></div><div className="stat"><div className="stat-label">提醒</div><div className="stat-value">{reminders}</div></div><div className="stat"><div className="stat-label">需处理</div><div className="stat-value">{blockers}</div></div><div className="stat"><div className="stat-label">完成度</div><div className="stat-value">{fmt((passed / checks.length) * 100)}%</div></div></div>
    <section className="card"><h2>校验清单</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['模块', '检查项', '状态', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((row) => <tr key={`${row.module}-${row.item}`}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.module}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.item}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: statusColor(row.status), fontWeight: 900 }}>{row.status}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.detail}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.href ? <Link href={`/projects/${project.id}/${row.href}`} className="btn" style={{ minHeight: 30 }}>进入</Link> : '-'}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
