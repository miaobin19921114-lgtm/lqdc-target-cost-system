export const projectNavGroups = [
  {
    title: '基础数据',
    items: [
      ['项目概况', 'overview', 'done'],
      ['业态产品', 'product-maintenance', 'done'],
      ['成本科目及测算词典', 'cost-dictionary', 'done'],
      ['版本管理', 'versions', 'done']
    ]
  },
  {
    title: '测算控制',
    items: [
      ['测算控制中心', 'control-center', 'done'],
      ['目标成本测算', 'costs-batch', 'done'],
      ['目标成本汇总', 'summary', 'done'],
      ['成本分摊测算', 'allocation', 'done']
    ]
  },
  {
    title: '收入成本明细',
    items: [
      ['收入明细', 'revenue', 'done'],
      ['成本明细', 'detail-calculation-results', 'done'],
      ['土地费用', 'land', 'done'],
      ['前期费用', 'pre-costs', 'done'],
      ['土建明细', 'building-details', 'done'],
      ['安装明细', 'installation-details', 'done'],
      ['设备明细', 'equipment-details', 'done'],
      ['精装修明细', 'fitout-details', 'done'],
      ['室外管网', 'outdoor-pipe-details', 'done'],
      ['景观工程', 'landscape-details', 'done'],
      ['道路总平', 'road-details', 'done'],
      ['围墙出入口', 'wall-gate-details', 'done'],
      ['销售费用', 'sales-expense-details', 'done'],
      ['管理费用', 'admin-expense-details', 'done'],
      ['财务费用', 'finance-expense-details', 'done']
    ]
  },
  {
    title: '税费利润',
    items: [
      ['税金测算', 'tax-details', 'done'],
      ['土地增值税', 'land-vat', 'done'],
      ['业态利润分析', 'profit-analysis', 'done']
    ]
  },
  {
    title: 'Excel',
    items: [
      ['Excel 工作台', 'excel', 'done']
    ]
  }
] as const;

export const projectNavLabelMap = {
  ...Object.fromEntries(projectNavGroups.flatMap((group) => group.items.filter(([, href]) => href).map(([name, href]) => [href, name]))),
  products: '业态产品',
  'product-maintenance': '业态产品',
  'revenue-summary': '目标成本汇总',
  'commercial-revenue': '收入明细',
  'parking-revenue': '收入明细',
  'other-revenue': '收入明细',
  'detail-calculation-results': '成本明细',
  land: '土地费用',
  'pre-costs': '成本明细',
  'building-details': '各专业明细',
  'installation-details': '各专业明细',
  'equipment-details': '各专业明细',
  'fitout-details': '各专业明细',
  'outdoor-pipe-details': '各专业明细',
  'landscape-details': '各专业明细',
  'road-details': '各专业明细',
  'wall-gate-details': '各专业明细',
  'sales-expense-details': '各专业明细',
  'admin-expense-details': '各专业明细',
  'finance-expense-details': '各专业明细'
} as Record<string, string>;

export function ProjectTopNav({ projectId, projectName, current }: { projectId: string; projectName: string; current: string }) {
  void projectId;
  void projectName;
  void current;
  return null;
}
