import Link from 'next/link';

export const projectNavGroups = [
  { title: '经营看板', items: [['经营总控', 'dashboard-lite', 'done']] },
  { title: '项目基础', items: [['项目概况', 'overview', 'done'], ['版本管理', 'versions', 'done'], ['业态维护', 'product-maintenance', 'done'], ['车位配置', 'parking', 'done'], ['指标校验中心', 'indicator-check', 'done']] },
  { title: '投决与报告', items: [['投决评审', 'decision', 'done'], ['经营报告', 'report', 'done'], ['打印版经营报告', 'report-print', 'done'], ['敏感性测算', 'sensitivity', 'done'], ['敏感性报告', 'sensitivity-report', 'done'], ['老板汇报版', '', 'planned'], ['PDF/Word导出', '', 'planned']] },
  { title: '收入测算', items: [['收入明细', 'revenue', 'done'], ['车位收入测算', 'parking-revenue', 'done'], ['商业收入测算', '', 'planned'], ['去化节奏测算', '', 'planned']] },
  { title: '成本测算', items: [['目标成本编制', 'costs-batch', 'done'], ['目标成本汇总', 'summary', 'done'], ['土地费', 'land', 'done'], ['前期费', 'pre-costs', 'done'], ['土建明细', 'building-details', 'done'], ['安装明细', 'installation-details', 'done'], ['设备明细', 'equipment-details', 'done'], ['精装修明细', 'fitout-details', 'done'], ['室外管网', 'outdoor-pipe-details', 'done'], ['景观工程', 'landscape-details', 'done'], ['道路总平', 'road-details', 'done'], ['围墙出入口', 'wall-gate-details', 'done'], ['销售费用', 'sales-expense-details', 'done'], ['管理费用', 'admin-expense-details', 'done'], ['财务费用', 'finance-expense-details', 'done'], ['成本分摊', 'cost-allocation', 'done'], ['税金明细', 'tax-details', 'done'], ['土地增值税', 'land-vat', 'done'], ['税务报告', 'tax-report', 'done'], ['业态利润', 'profit-analysis', 'done'], ['汇总校验', 'summary-check', 'done'], ['所得税成本对象', '', 'planned'], ['土增税清算模拟', '', 'planned'], ['税费风险清单', '', 'planned']] },
  { title: '合约招采', items: [['合约规划', '', 'planned'], ['招采计划', '', 'planned'], ['招标比价', '', 'planned'], ['定标记录', '', 'planned'], ['合同台账', '', 'planned'], ['总包合同对比', '', 'planned'], ['付款计划', '', 'planned'], ['招采成本对比', '', 'planned']] },
  { title: '动态成本', items: [['动态成本跟踪', '', 'planned'], ['合同变更', '', 'planned'], ['签证变更', '', 'planned'], ['结算管理', '', 'planned'], ['成本预警', '', 'planned'], ['待发生预测', '', 'planned']] },
  { title: '导入与配置', items: [['Excel导入导出', 'export', 'done'], ['导入批次', 'import-batches', 'done'], ['成本科目词典', 'cost-dictionary', 'done'], ['成本科目映射', 'cost-mapping', 'done'], ['产品库', 'product-library', 'done'], ['系统校验', 'check', 'done'], ['模板中心', '/templates', 'done'], ['统一数据导入中心', '', 'planned'], ['下拉字典维护', '', 'planned'], ['AI测算助手', '', 'planned']] }
] as const;

export const projectNavLabelMap = Object.fromEntries(
  projectNavGroups.flatMap((group) => group.items.filter(([, href]) => href).map(([name, href]) => [href, name]))
) as Record<string, string>;

export function ProjectTopNav({ projectId, projectName, current }: { projectId: string; projectName: string; current: string }) {
  return <div className="no-print" style={{ maxWidth: 1280, margin: '0 auto 14px', display: 'grid', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ color: '#667085', fontSize: 13 }}>
        <Link href="/projects" style={{ color: '#0b7285', fontWeight: 800 }}>项目中心</Link><span> › </span><Link href={`/projects/${projectId}`} style={{ color: '#0b7285', fontWeight: 800 }}>{projectName}</Link><span> › </span><b style={{ color: '#102033' }}>{current}</b>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link href={`/projects/${projectId}`} className="btn">项目测算中心</Link><Link href={`/projects/${projectId}/dashboard-lite`} className="btn">经营总控</Link><Link href="/projects" className="btn">项目中心</Link></div>
    </div>
  </div>;
}
