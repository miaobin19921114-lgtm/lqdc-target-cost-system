import Link from 'next/link';

export const projectNavGroups = [
  {
    title: '项目总览',
    items: [
      ['经营总控', 'dashboard-lite'],
      ['项目概况', 'overview'],
      ['版本管理', 'versions'],
      ['业态维护', 'product-maintenance'],
      ['车位配置', 'parking']
    ]
  },
  {
    title: '投决与报告',
    items: [
      ['投决评审', 'decision'],
      ['经营报告', 'report'],
      ['打印版经营报告', 'report-print'],
      ['敏感性报告', 'sensitivity-report'],
      ['税务报告', 'tax-report']
    ]
  },
  {
    title: '收入测算',
    items: [
      ['收入明细', 'revenue']
    ]
  },
  {
    title: '成本测算',
    items: [
      ['目标成本编制', 'costs-batch'],
      ['目标成本汇总', 'summary'],
      ['土地费', 'land'],
      ['前期费', 'pre-costs'],
      ['土建明细', 'building-details'],
      ['安装明细', 'installation-details'],
      ['设备明细', 'equipment-details'],
      ['精装修明细', 'fitout-details'],
      ['室外管网', 'outdoor-pipe-details'],
      ['景观工程', 'landscape-details'],
      ['道路总平', 'road-details'],
      ['围墙出入口', 'wall-gate-details'],
      ['销售费用', 'sales-expense-details'],
      ['管理费用', 'admin-expense-details'],
      ['财务费用', 'finance-expense-details']
    ]
  },
  {
    title: '税务测算',
    items: [
      ['税金明细', 'tax-details'],
      ['土地增值税', 'land-vat'],
      ['税务报告', 'tax-report'],
      ['成本分摊', 'cost-allocation'],
      ['业态利润', 'profit-analysis'],
      ['敏感性测算', 'sensitivity'],
      ['敏感性报告', 'sensitivity-report'],
      ['汇总校验', 'summary-check']
    ]
  },
  {
    title: '导入与配置',
    items: [
      ['Excel导入导出', 'export'],
      ['导入批次', 'import-batches'],
      ['成本科目词典', 'cost-dictionary'],
      ['成本科目映射', 'cost-mapping'],
      ['产品库', 'product-library'],
      ['系统校验', 'check']
    ]
  }
] as const;

export const projectNavLabelMap = Object.fromEntries(
  projectNavGroups.flatMap((group) => group.items.map(([name, href]) => [href, name]))
) as Record<string, string>;

export function ProjectTopNav({ projectId, projectName, current }: { projectId: string; projectName: string; current: string }) {
  return <div className="no-print" style={{ maxWidth: 1280, margin: '0 auto 14px', display: 'grid', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ color: '#667085', fontSize: 13 }}>
        <Link href="/projects" style={{ color: '#0b7285', fontWeight: 800 }}>项目中心</Link>
        <span> › </span>
        <Link href={`/projects/${projectId}`} style={{ color: '#0b7285', fontWeight: 800 }}>{projectName}</Link>
        <span> › </span>
        <b style={{ color: '#102033' }}>{current}</b>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/projects/${projectId}`} className="btn">项目测算中心</Link>
        <Link href={`/projects/${projectId}/dashboard-lite`} className="btn">经营总控</Link>
        <Link href="/projects" className="btn">项目中心</Link>
      </div>
    </div>
  </div>;
}
