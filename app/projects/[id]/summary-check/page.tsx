import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(input: unknown) { return n(input).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function pct(input: unknown) { return `${(n(input) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; }

type Row = { name: string; status: '通过' | '提醒' | '需处理'; detail: string; href: string };
function color(status: Row['status']) { return status === '通过' ? '#2f9e44' : status === '提醒' ? '#f08c00' : '#e03131'; }
function diffStatus(diff: number, tolerance = 1): Row['status'] { return Math.abs(diff) <= tolerance ? '通过' : '需处理'; }
function hasAny(text: string | null | undefined, words: string[]) { const value = text || ''; return words.some((word) => value.includes(word)); }

const costModules = [
  { name: '土地费', href: 'land', words: ['土地', '地价', '契税', '交易', '评估'] },
  { name: '前期费', href: 'pre-costs', words: ['前期', '设计', '勘察', '测绘', '报批', '三通一平'] },
  { name: '土建明细', href: 'building-details', words: ['土建', '建筑', '结构', '主体', '地下室', '桩基', '门窗', '防水'] },
  { name: '安装明细', href: 'installation-details', words: ['安装', '给排水', '强电', '弱电', '暖通', '消防'] },
  { name: '设备明细', href: 'equipment-details', words: ['设备', '电梯', '人防设备', '充电桩', '立体车库'] },
  { name: '精装修明细', href: 'fitout-details', words: ['精装', '装修', '大堂', '公区'] },
  { name: '室外管网', href: 'outdoor-pipe-details', words: ['管网', '综合管线', '室外管线'] },
  { name: '景观工程', href: 'landscape-details', words: ['景观', '绿化', '硬景', '软景'] },
  { name: '道路总平', href: 'road-details', words: ['道路', '总平', '交安', '标识'] },
  { name: '围墙出入口', href: 'wall-gate-details', words: ['围墙', '出入口', '临设'] },
  { name: '销售费用', href: 'sales-expense-details', words: ['销售', '营销', '示范区', '包装'] },
  { name: '管理费用', href: 'admin-expense-details', words: ['管理', '行政', '开发间接'] },
  { name: '财务费用', href: 'finance-expense-details', words: ['财务', '融资', '利息'] },
  { name: '税金', href: 'tax-details', words: ['税', '增值税', '所得税', '土地增值税'] }
];

export default async function SummaryCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true, costs: { include: { costSubject: true, productType: true } }, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, products: true }
  });

  const allProducts = version?.products || [];
  const products = allProducts.filter((item) => item.isActive);
  const disabledProducts = allProducts.length - products.length;
  const allCosts = version?.costs || [];
  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const incomeTaxRate = n(version?.taxes?.corporateIncomeTaxRate || 0.25);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const dictCodes = new Set<string | null>(dictRows.map((item) => item.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(allCosts, dictCodes);
  const costs = effective.effective;
  const noPathCosts = costs.filter((item) => !item.costSubject.fullPath && !item.description);
  const taxMismatch = costs.filter((item) => n(item.taxInclusiveAmount) > 0 && Math.abs(n(item.taxInclusiveAmount) - n(item.taxExclusiveAmount) - n(item.taxAmount)) > 0.5);
  const qtyMismatch = costs.filter((item) => n(item.quantity) > 0 && n(item.taxInclusiveUnitPrice) > 0 && Math.abs(n(item.quantity) * n(item.taxInclusiveUnitPrice) - n(item.taxInclusiveAmount)) > 1);
  const negativeCosts = costs.filter((item) => n(item.taxInclusiveAmount) < 0 || n(item.taxExclusiveAmount) < 0);
  const missingProductCosts = costs.filter((item) => item.productTypeId && !item.productType);

  const cost = costTotals(costs);
  const costFormulaDiff = cost.taxInclusive - cost.taxExclusive - cost.inputVat;
  const revenue = revenueFromProjectData({ products: allProducts, revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });
  const buildingArea = n(project.totalBuildingArea);
  const saleableArea = n(project.saleableArea);

  const moduleRows = costModules.map((module) => {
    const related = costs.filter((item) => hasAny(`${item.costSubject.fullPath || ''} ${item.costSubject.name} ${item.detailName} ${item.regionOrProductType || ''} ${item.professionalGroup || ''}`, module.words));
    const amount = related.reduce((sum, item) => sum + n(item.taxInclusiveAmount), 0);
    const status: Row['status'] = related.length ? '通过' : module.name === '税金' ? '提醒' : '提醒';
    return { ...module, count: related.length, amount, status };
  });
  const emptyModuleCount = moduleRows.filter((item) => item.count === 0).length;

  const rows: Row[] = [
    { name: '目标成本是否已录入', status: costs.length ? '通过' : '需处理', detail: `有效成本行 ${costs.length} 行，含税成本 ${fmt(cost.taxInclusive)}`, href: 'costs-batch' },
    { name: '成本模块覆盖完整性', status: emptyModuleCount ? '提醒' : '通过', detail: emptyModuleCount ? `${emptyModuleCount} 个成本模块暂未识别到明细，建议逐项检查` : '主要成本模块均识别到明细行', href: 'summary' },
    { name: 'Excel导入科目计入汇总', status: effective.importedLeafRows ? '提醒' : '通过', detail: effective.importedLeafRows ? `已计入 ${effective.importedLeafRows} 条Excel导入/临时四级科目，建议做科目映射` : '无临时导入科目，或均已归入标准科目', href: 'cost-mapping' },
    { name: '非末级成本过滤', status: effective.ignoredNonLeaf ? '提醒' : '通过', detail: effective.ignoredNonLeaf ? `已排除 ${effective.ignoredNonLeaf} 条非末级历史成本行，避免重复计算` : '未发现需排除的非末级成本行', href: 'summary' },
    { name: '科目路径完整性', status: noPathCosts.length ? '提醒' : '通过', detail: noPathCosts.length ? `${noPathCosts.length} 行缺少科目路径或说明` : '科目路径完整，可用于穿透', href: 'summary' },
    { name: '成本税额拆分公式', status: diffStatus(costFormulaDiff), detail: `含税-不含税-税额 = ${fmt(costFormulaDiff)}，容差1元`, href: 'costs-batch' },
    { name: '成本行税额异常', status: taxMismatch.length ? '需处理' : '通过', detail: taxMismatch.length ? `${taxMismatch.length} 行含税/不含税/税额不平衡` : '成本税额拆分基本平衡', href: 'costs-batch' },
    { name: '工程量乘单价校验', status: qtyMismatch.length ? '提醒' : '通过', detail: qtyMismatch.length ? `${qtyMismatch.length} 行工程量×含税单价与含税金额不一致` : '工程量、单价、金额基本平衡', href: 'costs-batch' },
    { name: '负数成本检查', status: negativeCosts.length ? '提醒' : '通过', detail: negativeCosts.length ? `${negativeCosts.length} 行为负数，确认是否为冲减/返还` : '未发现负数成本行', href: 'costs-batch' },
    { name: '成本业态归属', status: missingProductCosts.length ? '需处理' : '通过', detail: missingProductCosts.length ? `${missingProductCosts.length} 行关联业态异常` : '成本行关联业态正常', href: 'cost-allocation' },
    { name: '收入新口径联动', status: revenue.taxInclusive > 0 ? '通过' : '提醒', detail: `总收入 ${fmt(revenue.taxInclusive)}，销售 ${fmt(revenue.ordinary.taxInclusive)}，商业 ${fmt(revenue.commercial.taxInclusive)}，车位 ${fmt(revenue.parking.taxInclusive)}，其他 ${fmt(revenue.other.taxInclusive)}`, href: 'revenue-summary' },
    { name: '利润公式口径', status: revenue.taxInclusive && cost.taxInclusive ? '通过' : '提醒', detail: `税前利润 ${fmt(tax.profitBeforeIncomeTax)}，所得税 ${fmt(tax.incomeTax)}，税后净利 ${fmt(tax.netProfit)}，净利率 ${pct(revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0)}`, href: 'summary' },
    { name: '单方指标口径', status: buildingArea && saleableArea ? '通过' : '需处理', detail: `建面 ${fmt(buildingArea)}㎡，可售 ${fmt(saleableArea)}㎡；建面单方 ${fmt(buildingArea ? cost.taxInclusive / buildingArea : 0)}，可售单方 ${fmt(saleableArea ? cost.taxInclusive / saleableArea : 0)}`, href: 'overview' },
    { name: '停用业态排除', status: disabledProducts || effective.ignoredDisabled ? '提醒' : '通过', detail: disabledProducts || effective.ignoredDisabled ? `已排除停用业态 ${disabledProducts} 个、成本行 ${effective.ignoredDisabled} 行` : '无停用业态影响汇总', href: 'product-maintenance' }
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">汇总联动校验</p><h1 className="title">{project.name}</h1><p className="subtitle">检查收入新表、成本明细、税额、利润、单方和科目穿透是否与目标成本汇总表一致；Excel导入四级科目会计入汇总。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary" href={`/projects/${project.id}/summary`}>目标成本汇总表</Link><Link className="btn" href={`/projects/${project.id}/tax-details`}>税金明细</Link><Link className="btn" href={`/projects/${project.id}/cost-mapping`}>科目映射</Link><Link className="btn" href={`/projects/${project.id}`}>返回工作台</Link></div></div>
    <section className="card" style={{ marginBottom: 16 }}><h2>核心口径</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">含税总收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(revenue.taxInclusive)}</div></div><div><span className="meta">含税目标成本</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(cost.taxInclusive)}</div></div><div><span className="meta">税前利润</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(tax.profitBeforeIncomeTax)}</div></div><div><span className="meta">税后净利</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(tax.netProfit)}</div></div></div></section>
    <section className="card" style={{ marginBottom: 16 }}><h2>成本模块覆盖检查</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['模块', '状态', '识别行数', '含税金额', '入口'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{moduleRows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.status), fontWeight: 900 }}>{row.status}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.count}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.amount)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
    <section className="card"><h2>校验结果</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.status), fontWeight: 900 }}>{row.status}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.detail}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
  </div></main>;
}
