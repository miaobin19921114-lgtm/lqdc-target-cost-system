import Link from 'next/link';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type CheckItem = {
  module: string;
  item: string;
  status: '通过' | '提醒' | '需处理';
  detail: string;
  href?: string;
};

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusColor(status: CheckItem['status']) {
  if (status === '通过') return '#2f9e44';
  if (status === '提醒') return '#f08c00';
  return '#e03131';
}

function resolveHref(projectId: string, href?: string) {
  if (!href) return '';
  return href.startsWith('/') ? href : `/projects/${projectId}/${href}`;
}

async function checkUploadDir() {
  try {
    await fs.access('public/uploads');
    return true;
  } catch {
    return false;
  }
}

export default async function ProjectCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [templateCount, defaultTemplateCount, templateProductCount, templateCostRuleCount, templateTaxRuleCount, costSubjectCount, importBatchCount, mappingCount, uploadDirReady] = await Promise.all([
    prisma.template.count({ where: { isActive: true } }),
    prisma.template.count({ where: { isActive: true, OR: [{ isDefault: true }, { ownerId: null }] } }),
    prisma.templateProduct.count({ where: { isActive: true } }),
    prisma.templateCostRule.count(),
    prisma.templateTaxRule.count(),
    prisma.costSubject.count({ where: { enabled: true } }),
    prisma.importBatch.count({ where: { projectVersion: { projectId: params.id } } }),
    prisma.costDictionaryRow.count({ where: { projectId: params.id, sourceTable: 'Excel科目映射' } }),
    checkUploadDir()
  ]);

  const databaseUrlReady = Boolean(process.env.DATABASE_URL);
  const checks: CheckItem[] = [
    {
      module: '系统运行状态',
      item: '数据库连接',
      status: '通过',
      detail: '数据库查询已成功返回，当前项目可正常读取。'
    },
    {
      module: '系统运行状态',
      item: 'DATABASE_URL 环境变量',
      status: databaseUrlReady ? '通过' : '需处理',
      detail: databaseUrlReady ? '数据库环境变量已配置。' : '缺少 DATABASE_URL，生产环境无法连接数据库。'
    },
    {
      module: '系统运行状态',
      item: '上传目录',
      status: uploadDirReady ? '通过' : '提醒',
      detail: uploadDirReady ? 'public/uploads 可访问。' : '未检测到 public/uploads，Excel 上传或文件留存可能受影响。'
    },
    {
      module: '模板配置检查',
      item: '默认模板',
      status: defaultTemplateCount > 0 ? '通过' : '需处理',
      detail: `可用系统/默认模板 ${defaultTemplateCount} 个。`,
      href: '/templates'
    },
    {
      module: '模板配置检查',
      item: '标准业态库',
      status: templateProductCount >= 10 ? '通过' : templateProductCount > 0 ? '提醒' : '需处理',
      detail: `启用业态模板 ${templateProductCount} 个。`,
      href: '/templates'
    },
    {
      module: '模板配置检查',
      item: '成本科目模板',
      status: templateCostRuleCount > 0 || costSubjectCount > 0 ? '通过' : '需处理',
      detail: `模板科目规则 ${templateCostRuleCount} 条，系统标准科目 ${costSubjectCount} 条。`,
      href: '/templates'
    },
    {
      module: '模板配置检查',
      item: '税费参数模板',
      status: templateTaxRuleCount > 0 ? '通过' : '提醒',
      detail: `税费参数规则 ${templateTaxRuleCount} 条。`,
      href: '/templates'
    },
    {
      module: '导入配置检查',
      item: '导入批次',
      status: importBatchCount > 0 ? '通过' : '提醒',
      detail: importBatchCount > 0 ? `当前项目已有 ${importBatchCount} 个导入批次。` : '当前项目暂无导入批次，后续可通过 Excel 导入。',
      href: 'import-batches'
    },
    {
      module: '导入配置检查',
      item: '导入科目映射',
      status: mappingCount > 0 ? '通过' : '提醒',
      detail: mappingCount > 0 ? `当前项目已有 ${mappingCount} 条导入科目映射。` : '暂无导入科目映射；第一次导入可先用系统科目，后续再补映射。',
      href: 'cost-mapping'
    },
    {
      module: '功能边界检查',
      item: '项目指标校验分流',
      status: '通过',
      detail: '项目概况、业态面积、收入、成本、税费勾稽已分流到“指标校验中心”。',
      href: 'indicator-check'
    }
  ];

  const passed = checks.filter((item) => item.status === '通过').length;
  const reminders = checks.filter((item) => item.status === '提醒').length;
  const blockers = checks.filter((item) => item.status === '需处理').length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1280 }}>
    <div className="page-header"><div><p className="eyebrow">导入与配置</p><h1 className="title">系统自检</h1><p className="subtitle">检查系统运行状态、模板配置、导入配置和功能边界；项目业务数据完整性请进入“指标校验中心”。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href={`/projects/${project.id}/indicator-check`} className="btn btn-primary">指标校验中心</Link><Link href="/templates" className="btn">模板中心</Link><Link href={`/projects/${project.id}`} className="btn">项目测算中心</Link></div></div>

    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">通过</div><div className="stat-value">{passed}</div></div><div className="stat"><div className="stat-label">提醒</div><div className="stat-value">{reminders}</div></div><div className="stat"><div className="stat-label">需处理</div><div className="stat-value">{blockers}</div></div><div className="stat"><div className="stat-label">模板数量</div><div className="stat-value">{templateCount}</div></div><div className="stat"><div className="stat-label">完成度</div><div className="stat-value">{fmt((passed / checks.length) * 100)}%</div></div></div>

    <section className="card" style={{ marginBottom: 14, borderColor: '#c5eef3', background: '#f8fbff' }}><b>自检口径说明</b><p className="meta" style={{ margin: '6px 0 0' }}>系统自检只看系统底座和导入配置，不判断当前项目测算是否完整；项目业务勾稽请看“指标校验中心”。</p></section>

    <section className="card"><h2>系统自检清单</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['模块', '检查项', '状态', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{checks.map((row) => <tr key={`${row.module}-${row.item}`}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.module}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.item}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: statusColor(row.status), fontWeight: 900 }}>{row.status}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.detail}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.href ? <Link href={resolveHref(project.id, row.href)} className="btn" style={{ minHeight: 30 }}>进入</Link> : '-'}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
