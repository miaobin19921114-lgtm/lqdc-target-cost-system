import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function num(input: unknown) { return Number(input || 0); }
function fmt(input: unknown) { return num(input).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function pct(input: unknown) { return `${(num(input) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`; }

type Row = { name: string; status: '通过' | '提醒' | '需处理'; detail: string; href: string };
function color(status: Row['status']) { return status === '通过' ? '#2f9e44' : status === '提醒' ? '#f08c00' : '#e03131'; }
function diffStatus(diff: number, tolerance = 1): Row['status'] { return Math.abs(diff) <= tolerance ? '通过' : '需处理'; }

export default async function SummaryCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { taxes: true, costs: { include: { costSubject: true, productType: true } }, revenues: { include: { productType: true } }, products: true }
  });

  const allProducts = version?.products || [];
  const products = allProducts.filter((item) => item.isActive);
  const disabledProducts = allProducts.length - products.length;
  const allCosts = version?.costs || [];
  const activeCosts = allCosts.filter((item) => !item.productTypeId || item.productType?.isActive);
  const disabledCostRows = allCosts.length - activeCosts.length;
  const vatRate = num(version?.taxes?.vatRate || 0.09);
  const incomeTaxRate = num(version?.taxes?.corporateIncomeTaxRate || 0.25);

  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } } });
  const dictCodes = new Set(dictRows.map((item) => item.costCode).filter(Boolean));
  const costs = dictCodes.size > 0 ? activeCosts.filter((item) => item.costSubject.level >= 4 || dictCodes.has(item.costSubject.code)) : activeCosts;
  const excludedNonLeaf = activeCosts.length - costs.length;
  const importedLeafRows = activeCosts.filter((item) => item.costSubject.level >= 4 && !dictCodes.has(item.costSubject.code)).length;
  const noPathCosts = costs.filter((item) => !item.costSubject.fullPath && !item.description);
  const taxMismatch = costs.filter((item) => num(item.taxInclusiveAmount) > 0 && Math.abs(num(item.taxInclusiveAmount) - num(item.taxExclusiveAmount) - num(item.taxAmount)) > 0.5);
  const qtyMismatch = costs.filter((item) => num(item.quantity) > 0 && num(item.taxInclusiveUnitPrice) > 0 && Math.abs(num(item.quantity) * num(item.taxInclusiveUnitPrice) - num(item.taxInclusiveAmount)) > 1);

  const costInclusive = costs.reduce((sum, item) => sum + num(item.taxInclusiveAmount), 0);
  const costExclusive = costs.reduce((sum, item) => sum + num(item.taxExclusiveAmount), 0);
  const inputTax = costs.reduce((sum, item) => sum + num(item.taxAmount), 0);
  const costFormulaDiff = costInclusive - costExclusive - inputTax;

  const revenueRows = products.filter((item) => item.isSaleable).map((item) => calculateRevenueLine(num(item.saleableArea), num(item.salePrice), vatRate));
  const revenueInclusive = revenueRows.reduce((sum, item) => sum + item.taxInclusiveRevenue, 0);
  const revenueExclusive = revenueRows.reduce((sum, item) => sum + item.taxExclusiveRevenue, 0);
  const outputTax = revenueRows.reduce((sum, item) => sum + item.taxAmount, 0);

  const maintainedRevenueRows = version?.revenues?.filter((item) => item.productType?.isActive && item.productType?.isSaleable) || [];
  const maintainedRevenue = maintainedRevenueRows.reduce((sum, item) => sum + num(item.taxInclusiveRevenue), 0);
  const revenueDiff = maintainedRevenue ? revenueInclusive - maintainedRevenue : 0;

  const vatPayable = Math.max(outputTax - inputTax, 0);
  const surcharge = vatPayable * 0.12;
  const profitBeforeIncomeTax = revenueExclusive - costExclusive - surcharge;
  const incomeTax = Math.max(profitBeforeIncomeTax * incomeTaxRate, 0);
  const netProfit = profitBeforeIncomeTax - incomeTax;
  const buildingArea = num(project.totalBuildingArea);
  const saleableArea = num(project.saleableArea);

  const rows: Row[] = [
    { name: '目标成本是否已录入', status: costs.length ? '通过' : '需处理', detail: `有效成本行 ${costs.length} 行，含税成本 ${fmt(costInclusive)}`, href: 'costs-batch' },
    { name: 'Excel导入科目计入汇总', status: importedLeafRows ? '提醒' : '通过', detail: importedLeafRows ? `已计入 ${importedLeafRows} 条Excel导入/临时四级科目，建议做科目映射` : '无临时导入科目，或均已归入标准科目', href: 'cost-mapping' },
    { name: '非末级成本过滤', status: excludedNonLeaf ? '提醒' : '通过', detail: excludedNonLeaf ? `已排除 ${excludedNonLeaf} 条非末级历史成本行，避免重复计算` : '未发现需排除的非末级成本行', href: 'summary' },
    { name: '科目路径完整性', status: noPathCosts.length ? '提醒' : '通过', detail: noPathCosts.length ? `${noPathCosts.length} 行缺少科目路径或说明` : '科目路径完整，可用于穿透', href: 'summary' },
    { name: '成本税额拆分公式', status: diffStatus(costFormulaDiff), detail: `含税-不含税-税额 = ${fmt(costFormulaDiff)}，容差1元`, href: 'costs-batch' },
    { name: '工程量乘单价校验', status: qtyMismatch.length ? '提醒' : '通过', detail: qtyMismatch.length ? `${qtyMismatch.length} 行工程量×含税单价与含税金额不一致` : '工程量、单价、金额基本平衡', href: 'costs-batch' },
    { name: '收入按业态自动测算', status: revenueInclusive > 0 ? '通过' : '提醒', detail: `启用可售业态测算含税收入 ${fmt(revenueInclusive)}，不含税收入 ${fmt(revenueExclusive)}，销项税 ${fmt(outputTax)}`, href: 'revenue' },
    { name: '收入明细与业态指标差异', status: maintainedRevenue ? diffStatus(revenueDiff) : '提醒', detail: maintainedRevenue ? `收入明细含税 ${fmt(maintainedRevenue)}，业态自动测算差异 ${fmt(revenueDiff)}` : '尚未生成或维护收入明细，汇总表按业态指标自动测算', href: 'revenue' },
    { name: '利润公式口径', status: revenueInclusive && costInclusive ? '通过' : '提醒', detail: `税前利润 ${fmt(profitBeforeIncomeTax)}，所得税 ${fmt(incomeTax)}，税后净利 ${fmt(netProfit)}，净利率 ${pct(revenueInclusive ? netProfit / revenueInclusive : 0)}`, href: 'summary' },
    { name: '单方指标口径', status: buildingArea && saleableArea ? '通过' : '需处理', detail: `建面 ${fmt(buildingArea)}㎡，可售 ${fmt(saleableArea)}㎡；建面单方 ${fmt(buildingArea ? costInclusive / buildingArea : 0)}，可售单方 ${fmt(saleableArea ? costInclusive / saleableArea : 0)}`, href: 'overview' },
    { name: '停用业态排除', status: disabledProducts || disabledCostRows ? '提醒' : '通过', detail: disabledProducts || disabledCostRows ? `已排除停用业态 ${disabledProducts} 个、成本行 ${disabledCostRows} 行` : '无停用业态影响汇总', href: 'product-maintenance' }
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">汇总联动校验</p><h1 className="title">{project.name}</h1><p className="subtitle">检查当前版本收入、成本、税额、利润、单方和科目穿透是否与目标成本汇总表一致；Excel导入四级科目会计入汇总。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary" href={`/projects/${project.id}/summary`}>目标成本汇总表</Link><Link className="btn" href={`/projects/${project.id}/cost-mapping`}>科目映射</Link><Link className="btn" href={`/projects/${project.id}`}>返回工作台</Link></div></div>
    <section className="card" style={{ marginBottom: 16 }}><h2>核心口径</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}><div><span className="meta">含税收入</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(revenueInclusive)}</div></div><div><span className="meta">含税成本</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(costInclusive)}</div></div><div><span className="meta">税前利润</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(profitBeforeIncomeTax)}</div></div><div><span className="meta">税后净利</span><div style={{ fontWeight: 900, fontSize: 20 }}>{fmt(netProfit)}</div></div></div></section>
    <section className="card"><h2>校验结果</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.status), fontWeight: 900 }}>{row.status}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.detail}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
  </div></main>;
}
