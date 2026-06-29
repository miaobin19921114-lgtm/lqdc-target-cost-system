export const projectNavGroups = [
  {
    title: '基础数据',
    items: [
      ['项目概况', 'overview', 'done'],
      ['业态产品', 'product-maintenance', 'done'],
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
      ['成本明细', 'land', 'done'],
      ['各专业明细', 'building-details', 'done']
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
      ['Excel 工作台', 'excel', 'done'],
      ['模板下载', 'excel', 'done'],
      ['导入预览', 'excel', 'done'],
      ['确认导入', 'excel', 'done'],
      ['导出', 'export', 'done'],
      ['导入批次', 'import-batches', 'done']
    ]
  },
  {
    title: '系统',
    items: [
      ['成本科目及测算词典', 'cost-dictionary', 'done'],
      ['系统自检', 'check', 'done'],
      ['健康检查', '/health', 'done']
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
  'pre-costs': '成本明细',
  'installation-details': '各专业明细',
  'equipment-details': '各专业明细',
  'fitout-details': '各专业明细',
  'outdoor-pipe-details': '各专业明细',
  'landscape-details': '各专业明细',
  'road-details': '各专业明细',
  'wall-gate-details': '各专业明细'
} as Record<string, string>;

export function ProjectTopNav({ projectId, projectName, current }: { projectId: string; projectName: string; current: string }) {
  void projectId;
  void projectName;
  void current;
  return null;
}
