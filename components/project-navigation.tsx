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
      ['收入汇总', 'revenue-summary', 'done'],
      ['商业收入', 'commercial-revenue', 'done'],
      ['车位收入', 'parking-revenue', 'done'],
      ['其他收入', 'other-revenue', 'done'],
      ['成本明细', 'land', 'done'],
      ['前期费', 'pre-costs', 'done'],
      ['土建明细', 'building-details', 'done'],
      ['安装明细', 'installation-details', 'done'],
      ['设备明细', 'equipment-details', 'done'],
      ['精装修明细', 'fitout-details', 'done'],
      ['室外管网', 'outdoor-pipe-details', 'done'],
      ['景观工程', 'landscape-details', 'done'],
      ['道路总平', 'road-details', 'done'],
      ['围墙出入口', 'wall-gate-details', 'done']
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
  ...Object.fromEntries(projectNavGroups.flatMap((group) => group.items.filter(([, href]) => href).map(([name, href]) => [href, name])))
} as Record<string, string>;

export function ProjectTopNav({ projectId, projectName, current }: { projectId: string; projectName: string; current: string }) {
  void projectId;
  void projectName;
  void current;
  return null;
}
