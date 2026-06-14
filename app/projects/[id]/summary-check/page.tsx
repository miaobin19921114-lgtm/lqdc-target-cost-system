import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function num(input: unknown) { return Number(input || 0); }
function fmt(input: unknown) { return num(input).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

type Row = { name: string; status: '通过' | '提醒' | '需处理'; detail: string; href: string };
function color(status: Row['status']) { return status === '通过' ? '#2f9e44' : status === '提醒' ? '#f08c00' : '#e03131'; }

export default async function SummaryCheckPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { costs: { include: { costSubject: true } }, revenues: true, products: true }
  });
  const costs = version?.costs || [];
  const revenues = version?.revenues || [];
  const products = version?.products || [];
  const dictRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } } });

  const dictCodes = new Set(dictRows.map((item) => item.costCode).filter(Boolean));
  const costCodes = new Set(costs.map((item) => item.costSubject.code).filter(Boolean));
  const matchedRows = dictRows.filter((item) => item.costCode && costCodes.has(item.costCode)).length;
  const orphanCosts = costs.filter((item) => !dictCodes.has(item.costSubject.code));
  const noPathCosts = costs.filter((item) => !item.costSubject.fullPath && !item.description);
  const taxMismatch = costs.filter((item) => num(item.taxInclusiveAmount) > 0 && Math.abs(num(item.taxInclusiveAmount) - num(item.taxExclusiveAmount) - num(item.taxAmount)) > 0.5);
  const costTotal = costs.reduce((sum, item) => sum + num(item.taxInclusiveAmount), 0);
  const revenueTotal = revenues.reduce((sum, item) => sum + num(item.taxInclusiveRevenue), 0);

  const rows: Row[] = [
    { name: '目标成本是否已录入', status: costs.length ? '通过' : '需处理', detail: `成本行 ${costs.length} 行，含税成本 ${fmt(costTotal)}`, href: 'costs-batch' },
    { name: '预设科目回写进度', status: matchedRows > 0 ? '通过' : '提醒', detail: `已匹配 V57 预设行 ${matchedRows}/${dictRows.length}`, href: 'costs-batch' },
    { name: '汇总穿透匹配', status: orphanCosts.length ? '提醒' : '通过', detail: orphanCosts.length ? `${orphanCosts.length} 行成本未匹配到词典科目` : '成本行均可按科目编码汇总', href: 'summary' },
    { name: '科目路径完整性', status: noPathCosts.length ? '提醒' : '通过', detail: noPathCosts.length ? `${noPathCosts.length} 行缺少科目路径或说明` : '科目路径完整，可用于穿透', href: 'summary' },
    { name: '税额拆分公式', status: taxMismatch.length ? '需处理' : '通过', detail: taxMismatch.length ? `${taxMismatch.length} 行含税/不含税/税额不平衡` : '税额拆分平衡', href: 'costs-batch' },
    { name: '收入与利润基础', status: revenueTotal > 0 && costTotal > 0 ? '通过' : '提醒', detail: `收入 ${fmt(revenueTotal)}，成本 ${fmt(costTotal)}，业态 ${products.length} 个`, href: 'summary' }
  ];

  return <main className="page"><div className="container" style={{ maxWidth: 1180 }}>
    <div className="page-header"><div><p className="eyebrow">汇总联动校验</p><h1 className="title">{project.name}</h1><p className="subtitle">检查明细页录入后是否能正常回写目标成本汇总、税额公式和穿透链接。</p></div><div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary" href={`/projects/${project.id}/summary`}>目标成本汇总表</Link><Link className="btn" href={`/projects/${project.id}`}>返回工作台</Link></div></div>
    <section className="card"><h2>校验结果</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}><thead><tr>{['检查项', '状态', '说明', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: color(row.status), fontWeight: 900 }}>{row.status}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.detail}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><Link className="btn" href={`/projects/${project.id}/${row.href}`}>进入</Link></td></tr>)}</tbody></table></div></section>
  </div></main>;
}
