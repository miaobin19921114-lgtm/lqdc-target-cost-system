import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';
import { costTotals, effectiveCostRows, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) { return n(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(value: number) { return `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`; }
function statusColor(value: number) { return value >= 0 ? '#2f9e44' : '#e03131'; }
function riskColor(level: string) { return level === '高' ? '#e03131' : level === '中' ? '#f08c00' : '#2f9e44'; }

export default async function PrintableTaxReport({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true, costs: { include: { costSubject: true, productType: true } }, taxes: true }
  });

  const vatRate = n(version?.taxes?.vatRate || 0.09);
  const surchargeRate = n(version?.taxes?.urbanMaintenanceRate || 0.07) + n(version?.taxes?.educationSurchargeRate || 0.03) + n(version?.taxes?.localEducationSurchargeRate || 0.02);
  const incomeTaxRate = n(version?.taxes?.corporateIncomeTaxRate || 0.25);
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, select: { costCode: true } });
  const leafCodes = new Set(dictRows.map((row) => row.costCode).filter((code): code is string => Boolean(code)));
  const effective = effectiveCostRows(version?.costs || [], leafCodes);
  const revenue = revenueFromProjectData({ products: version?.products || [], revenues: version?.revenues || [], commercialRevenueLines: version?.commercialRevenueLines || [], otherRevenueLines: version?.otherRevenueLines || [], vatRate });
  const cost = costTotals(effective.effective);
  const tax = fullTaxSummary({ revenueExclusive: revenue.taxExclusive, outputVat: revenue.outputVat, inputVat: cost.inputVat, costExclusive: cost.taxExclusive, landCost: cost.landCost, devCost: cost.devCost, saleManageFinance: cost.saleManageFinance, surchargeRate, incomeTaxRate });

  const taxBurden = revenue.taxInclusive ? tax.totalTax / revenue.taxInclusive : 0;
  const payableVatBurden = revenue.taxInclusive ? tax.payableVat / revenue.taxInclusive : 0;
  const landVatBurden = revenue.taxInclusive ? tax.landVat.landVat / revenue.taxInclusive : 0;
  const incomeTaxBurden = revenue.taxInclusive ? tax.incomeTax / revenue.taxInclusive : 0;
  const vatInputCoverage = revenue.outputVat ? cost.inputVat / revenue.outputVat : 0;
  const netMargin = revenue.taxInclusive ? tax.netProfit / revenue.taxInclusive : 0;

  const taxRows = [
    ['销项税额', revenue.outputVat, '销售收入按含税价折算形成的销项税'],
    ['进项税额', cost.inputVat, '成本明细税额汇总形成的进项抵扣'],
    ['应缴增值税', tax.payableVat, '销项税额 - 进项税额，不足为零'],
    ['附加税费', tax.surcharge, `按应缴增值税 × ${pct(surchargeRate)} 测算`],
    ['土地增值税', tax.landVat.landVat, `增值率 ${pct(tax.landVat.valueAddedRatio)}，税率 ${pct(tax.landVat.ladder.rate)}，速算扣除 ${pct(tax.landVat.ladder.deduction)}`],
    ['企业所得税', tax.incomeTax, `按税前利润 × ${pct(incomeTaxRate)} 测算，亏损不计所得税`],
    ['税费合计', tax.totalTax, '增值税、附加税、土增税、所得税合计']
  ] as const;

  const deductionRows = [
    ['不含税销售收入', revenue.taxExclusive],
    ['土地成本', cost.landCost],
    ['开发成本', cost.devCost],
    ['销售/管理/财务费用', cost.saleManageFinance],
    ['附加税费', tax.landVat.taxAndSurcharge],
    ['加计扣除', tax.landVat.additionalDeduction],
    ['扣除项目合计', tax.landVat.deductionTotal],
    ['增值额', tax.landVat.valueAdded]
  ] as const;

  const risks = [
    { name: '进项抵扣充分性', level: vatInputCoverage < 0.3 ? '高' : vatInputCoverage < 0.6 ? '中' : '低', text: `进项覆盖率 ${pct(vatInputCoverage)}，进项不足会推高增值税和附加税。` },
    { name: '土增税压力', level: tax.landVat.valueAddedRatio > 1 ? '高' : tax.landVat.valueAddedRatio > 0.5 ? '中' : '低', text: `土增税增值率 ${pct(tax.landVat.valueAddedRatio)}，土地增值税 ${fmt(tax.landVat.landVat)}。` },
    { name: '所得税压力', level: incomeTaxBurden > 0.04 ? '高' : incomeTaxBurden > 0.02 ? '中' : '低', text: `企业所得税 ${fmt(tax.incomeTax)}，占含税收入 ${pct(incomeTaxBurden)}。` },
    { name: '综合税负', level: taxBurden > 0.12 ? '高' : taxBurden > 0.08 ? '中' : '低', text: `税费合计 ${fmt(tax.totalTax)}，综合税负率 ${pct(taxBurden)}。` },
    { name: '利润承压', level: tax.netProfit < 0 ? '高' : netMargin < 0.05 ? '中' : '低', text: `税后净利 ${fmt(tax.netProfit)}，销售净利率 ${pct(netMargin)}。` },
    { name: '数据口径', level: effective.importedLeafRows > 0 || effective.ignoredNonLeaf > 0 ? '中' : '低', text: `临时导入科目 ${effective.importedLeafRows} 行，非末级排除 ${effective.ignoredNonLeaf} 行。` }
  ];

  const summaryRows = [
    ['含税销售收入', revenue.taxInclusive],
    ['不含税销售收入', revenue.taxExclusive],
    ['含税目标成本', cost.taxInclusive],
    ['不含税目标成本', cost.taxExclusive],
    ['税前利润', tax.profitBeforeIncomeTax],
    ['税后净利', tax.netProfit],
    ['综合税负率', taxBurden, 'percent'],
    ['增值税税负率', payableVatBurden, 'percent'],
    ['土增税税负率', landVatBurden, 'percent'],
    ['所得税税负率', incomeTaxBurden, 'percent']
  ] as const;

  return <main className="print-report">
    <div className="no-print toolbar"><Link href={`/projects/${project.id}/tax-details`} className="btn">税金明细</Link><Link href={`/projects/${project.id}/land-vat`} className="btn">土增税</Link><Link href={`/projects/${project.id}/report-print`} className="btn">经营报告打印版</Link><Link href={`/projects/${project.id}/dashboard-lite`} className="btn">经营总控</Link><span className="btn btn-primary">打印：Ctrl/Cmd + P</span></div>
    <section className="cover block"><div className="eyebrow">源信达地产目标成本测算系统</div><h1>{project.name}</h1><h2>税务测算报告（打印版）</h2><p>当前版本：{version?.name || '当前版本'}　阶段：{version?.stage || '投拓阶段'}　城市/区域：{project.city || '-'} / {project.district || '-'}</p><div className="decision" style={{ color: statusColor(tax.netProfit) }}>{tax.netProfit >= 0 ? '税后盈利' : '税后亏损'}</div><p>税费合计 {fmt(tax.totalTax)}，综合税负率 {pct(taxBurden)}，税后净利 {fmt(tax.netProfit)}</p></section>
    <section className="block"><h2>一、税务测算结论</h2><ol><li>应缴增值税 {fmt(tax.payableVat)}，增值税税负率 {pct(payableVatBurden)}。</li><li>土地增值税 {fmt(tax.landVat.landVat)}，增值率 {pct(tax.landVat.valueAddedRatio)}，适用税率 {pct(tax.landVat.ladder.rate)}。</li><li>企业所得税 {fmt(tax.incomeTax)}，税后净利 {fmt(tax.netProfit)}，销售净利率 {pct(netMargin)}。</li><li>综合税负率 {pct(taxBurden)}，后续需结合清算口径、发票进项和成本归集继续复核。</li></ol></section>
    <section className="block"><h2>二、核心税务指标</h2><table><tbody>{summaryRows.map(([name, value, unit]) => <tr key={name}><td>{name}</td><td style={{ color: String(name).includes('利润') || String(name).includes('净利') ? statusColor(Number(value)) : undefined, fontWeight: 900 }}>{unit === 'percent' ? pct(Number(value)) : fmt(value)}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>三、税费明细</h2><table><thead><tr><th>税种/项目</th><th>金额</th><th>说明</th></tr></thead><tbody>{taxRows.map(([name, value, note]) => <tr key={name}><td>{name}</td><td>{fmt(value)}</td><td>{note}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>四、土地增值税扣除口径</h2><table><tbody>{deductionRows.map(([name, value]) => <tr key={name}><td>{name}</td><td>{fmt(value)}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>五、税务风险提示</h2><table><thead><tr><th>风险项</th><th>等级</th><th>说明</th></tr></thead><tbody>{risks.map((risk) => <tr key={risk.name}><td>{risk.name}</td><td style={{ color: riskColor(risk.level), fontWeight: 900 }}>{risk.level}</td><td>{risk.text}</td></tr>)}</tbody></table></section>
    <section className="block"><h2>六、复核与签批区</h2><table><tbody><tr><td>复核结论</td><td>□ 通过　□ 需调整　□ 暂缓</td></tr><tr><td>需复核事项</td><td>□ 进项税　□ 土增税扣除　□ 所得税成本对象　□ 发票口径　□ 分摊规则</td></tr><tr><td>税务复核人</td><td></td></tr><tr><td>复核日期</td><td></td></tr><tr><td>备注</td><td style={{ height: 80 }}></td></tr></tbody></table></section>
    <style>{`.print-report{max-width:980px;margin:0 auto;padding:24px;background:#fff;color:#111;font-family:Arial,'Microsoft YaHei',sans-serif}.toolbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:16px}.block{border:1px solid #d9e2ec;border-radius:12px;padding:18px;margin-bottom:16px;break-inside:avoid}.cover{text-align:center;padding:42px 24px}.cover h1{font-size:34px;margin:12px 0}.cover h2{font-size:22px;margin:8px 0;color:#334155}.eyebrow{font-size:12px;letter-spacing:.12em;color:#64748b;font-weight:800}.decision{font-size:34px;font-weight:900;margin-top:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left}td:first-child{font-weight:800;color:#334155}@media print{.no-print,nav,header{display:none!important}.print-report{max-width:100%;padding:0}.block{box-shadow:none;border-color:#ddd}.cover{min-height:420px;display:flex;flex-direction:column;justify-content:center}}`}</style>
  </main>;
}
