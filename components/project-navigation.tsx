export const projectNavGroups = [
  {
    title: '基础数据',
    items: [
      ['项目概况', 'overview', 'done'],
      ['业态产品 / 税务清算对象', 'product-maintenance', 'done'],
      ['建造配置标准', 'construction-standards', 'done'],
      ['工程量指标', 'quantity-indicators', 'done'],
      ['版本管理', 'versions', 'done'],
      ['指标校验', 'indicator-check', 'done'],
      ['楼栋指标', '', 'planned']
    ]
  },
  {
    title: '目标成本',
    items: [
      ['目标成本测算', 'costs-batch', 'done'],
      ['目标成本汇总', 'summary', 'done'],
      ['土地费', 'land', 'done'],
      ['前期费', 'pre-costs', 'done'],
      ['土建明细', 'building-details', 'done'],
      ['安装明细', 'installation-details', 'done'],
      ['设备明细', 'equipment-details', 'done'],
      ['精装修明细', 'fitout-details', 'done'],
      ['室外管网', 'outdoor-pipe-details', 'done'],
      ['景观工程', 'landscape-details', 'done'],
      ['道路总平', 'road-details', 'done'],
      ['围墙出入口', 'wall-gate-details', 'done'],
      ['测算规则库', 'measure-rules', 'done'],
      ['量价指标库', 'price-library', 'done'],
      ['规则数据库', 'cost-calculation-rules', 'done'],
      ['科目映射', 'cost-mapping', 'done']
    ]
  },
  {
    title: '经营测算',
    items: [
      ['经营总控', 'dashboard-lite', 'done'],
      ['收入汇总', 'revenue-summary', 'done'],
      ['销售收入测算', 'revenue', 'done'],
      ['商业收入测算', 'commercial-revenue', 'done'],
      ['车位收入测算', 'parking-revenue', 'done'],
      ['其他收入测算', 'other-revenue', 'done'],
      ['去化节奏测算', 'sales-schedule', 'done'],
      ['税费测算总表', 'tax-details', 'done'],
      ['土地增值税清算测算表', 'land-vat', 'done'],
      ['业态利润分析', 'profit-analysis', 'done']
    ]
  },
  {
    title: '汇报输出',
    items: [
      ['投决评审', 'decision', 'done'],
      ['经营报告', 'report', 'done'],
      ['敏感性分析', 'sensitivity', 'done'],
      ['Excel 导入 / 导出', 'export', 'done'],
      ['导入批次', 'import-batches', 'done'],
      ['项目自检', 'check', 'done'],
      ['汇总校验', 'summary-check', 'done'],
      ['模板中心 / 规则管理', '/templates', 'done']
    ]
  }
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
