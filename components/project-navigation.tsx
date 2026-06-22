export const projectNavGroups = [
  { title: '经营决策', items: [['经营总控', 'dashboard-lite', 'done'], ['投决评审', 'decision', 'done'], ['经营报告', 'report', 'done'], ['敏感性分析', 'sensitivity', 'done'], ['老板汇报版', '', 'planned'], ['经营方案对比', '', 'planned']] },
  { title: '项目基础', items: [['项目概况', 'overview', 'done'], ['业态维护 / 税务清算对象', 'product-maintenance', 'done'], ['版本管理', 'versions', 'done'], ['指标校验', 'indicator-check', 'done'], ['产品强排指标库', '', 'planned'], ['地块边界 / 红线资料', '', 'planned']] },
  { title: '收入测算', items: [['收入汇总', 'revenue-summary', 'done'], ['销售收入测算', 'revenue', 'done'], ['商业收入测算', 'commercial-revenue', 'done'], ['车位收入测算', 'parking-revenue', 'done'], ['其他收入测算', 'other-revenue', 'done'], ['去化节奏测算', 'sales-schedule', 'done'], ['竞品售价库', '', 'planned'], ['付款节奏 / 回款计划', '', 'planned']] },
  { title: '成本测算', items: [['目标成本编制', 'costs-batch', 'done'], ['目标成本汇总', 'summary', 'done'], ['土地费', 'land', 'done'], ['前期费', 'pre-costs', 'done'], ['土建明细', 'building-details', 'done'], ['安装明细', 'installation-details', 'done'], ['设备明细', 'equipment-details', 'done'], ['精装修明细', 'fitout-details', 'done'], ['室外管网', 'outdoor-pipe-details', 'done'], ['景观工程', 'landscape-details', 'done'], ['道路总平', 'road-details', 'done'], ['围墙出入口', 'wall-gate-details', 'done'], ['销售费用', 'sales-expense-details', 'done'], ['管理费用', 'admin-expense-details', 'done'], ['财务费用', 'finance-expense-details', 'done'], ['成本风险清单', '', 'planned'], ['动态单价库', '', 'planned']] },
  { title: '税费利润', items: [['税费测算总表', 'tax-details', 'done'], ['土地增值税清算测算表', 'land-vat', 'done'], ['业态利润分析', 'profit-analysis', 'done'], ['税费风险清单', '', 'planned'], ['所得税成本对象复核', '', 'planned'], ['土地增值税清算资料清单', '', 'planned']] },
  { title: '导入与自检', items: [['Excel 导入 / 导出', 'export', 'done'], ['导入批次', 'import-batches', 'done'], ['科目映射', 'cost-mapping', 'done'], ['项目自检', 'check', 'done'], ['汇总校验', 'summary-check', 'done'], ['统一数据导入中心', '', 'planned'], ['导入异常清单', '', 'planned']] },
  { title: '模板与规则', items: [['模板中心 / 规则管理', '/templates', 'done'], ['成本测算规则配置', 'measure-rules', 'done'], ['量价指标库', 'price-library', 'done'], ['项目规则沉淀', '', 'planned'], ['下拉字典维护', '', 'planned'], ['地区成本指标库', '', 'planned'], ['业态成本参数库', '', 'planned']] },
  { title: '合约招采', items: [['合约规划', '', 'planned'], ['招采计划', '', 'planned'], ['招标比价', '', 'planned'], ['定标记录', '', 'planned'], ['合同台账', '', 'planned'], ['总包合同对比', '', 'planned'], ['付款计划', '', 'planned'], ['招采成本对比', '', 'planned']] },
  { title: '动态成本', items: [['动态成本跟踪', '', 'planned'], ['合同变更', '', 'planned'], ['签证变更', '', 'planned'], ['结算管理', '', 'planned'], ['成本预警', '', 'planned'], ['待发生预测', '', 'planned']] },
  { title: '智能与系统', items: [['AI 测算助手', '', 'planned'], ['PDF / Word 导出', '', 'planned'], ['系统健康检查', '/health', 'done'], ['环境变量检查', '', 'planned'], ['上传目录检查', '', 'planned'], ['数据库连接检查', '', 'planned']] }
] as const;

export const projectOutputLabelMap = {
  'report-print': '打印经营报告',
  'sensitivity-report': '敏感性分析报告',
  'tax-report': '税务报告'
} as const;

export const projectNavLabelMap = {
  ...Object.fromEntries(projectNavGroups.flatMap((group) => group.items.filter(([, href]) => href).map(([name, href]) => [href, name]))),
  ...projectOutputLabelMap
} as Record<string, string>;

export function ProjectTopNav({ projectId, projectName, current }: { projectId: string; projectName: string; current: string }) {
  void projectId;
  void projectName;
  void current;
  return null;
}
