import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';
import { rebuildProjectCostDictionary } from '@/lib/rebuild-project-cost-dictionary';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const stickyName = { ...cell, position: 'sticky' as const, left: 0, zIndex: 2, background: '#fff', fontWeight: 800, minWidth: 240 };

function num(value: unknown) {
  return Number(value || 0);
}

function fmt(value: unknown) {
  return num(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function single(amount: number, area: number) {
  return area ? amount / area : 0;
}

function isUnderground(name: string) {
  return ['地下', '车位', '车库', '人防'].some((word) => name.includes(word));
}

function subjectKey(row: any) {
  return `${row.firstSubject || ''}|${row.secondSubject || ''}|${row.thirdSubject || ''}|${row.detailSubject || ''}`;
}

export default async function TargetCostBatchPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  await rebuildProjectCostDictionary(project.id);

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: {
      products: true,
      costs: { include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } }
    }
  });

  const products = (version?.products || []).filter((item: any) => item.isActive);
  const productNames = products.map((item: any) => item.name || item.productType || item.id);
  const productSet = new Set(productNames);
  const buildingArea = num(project.totalBuildingArea);
  const saleableArea = num(project.saleableArea);

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    orderBy: { rowIndex: 'asc' }
  });
  const leafRows = dictionaryRows.filter((row) => row.detailSubject);

  const costByCode = new Map<string, any[]>();
  for (const cost of version?.costs || []) {
    const productName = (cost as any).productType?.name || (cost as any).productType?.productType || '未分业态';
    if ((cost as any).productTypeId && !productSet.has(productName)) continue;
    const code = (cost as any).costSubject?.code;
    if (!code) continue;
    const list = costByCode.get(code) || [];
    list.push(cost);
    costByCode.set(code, list);
  }

  const rows = leafRows.map((row) => {
    const costs = row.costCode ? costByCode.get(row.costCode) || [] : [];
    const byProduct = new Map<string, number>();
    let total = 0;
    let groundTotal = 0;
    let undergroundTotal = 0;

    for (const cost of costs) {
      const amount = num((cost as any).taxInclusiveAmount);
      const productName = (cost as any).productType?.name || (cost as any).productType?.productType || '未分业态';
      total += amount;
      if (isUnderground(productName)) undergroundTotal += amount;
      else groundTotal += amount;
      byProduct.set(productName, (byProduct.get(productName) || 0) + amount);
    }

    return { row, total, groundTotal, undergroundTotal, byProduct };
  });

  const total = rows.reduce((sum, item) => sum + item.total, 0);
  const filledRows = rows.filter((item) => item.total > 0).length;
  const v60OrderNote = '土地费 → 前期费 → 土建 → 安装 → 设备 → 精装 → 室外管网 → 景观 → 道路总平 → 围墙出入口 → 销售费用 → 管理费用 → 财务费用';

  return (
    <main className="page">
      <ProjectTopNav projectId={project.id} projectName={project.name} current="目标成本测算表" />
      <div className="container" style={{ maxWidth: 1760 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">目标成本测算表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">各专业明细页负责录入；本页按V60顺序自动汇总，并按业态展示目标成本测算结果，不再重复录入。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总表</Link>
            <Link href={`/projects/${project.id}/summary-check`} className="btn">汇总校验</Link>
            <Link href={`/projects/${project.id}/cost-allocation`} className="btn">成本分摊</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 12, borderColor: '#d0ebff', background: '#f8fbff' }}>
          <b>口径说明</b>
          <p className="meta" style={{ margin: '6px 0 0' }}>本页相当于地产公司常见“目标成本测算表”：按成本科目和业态汇总各明细页结果；明细工程量、单价、税率仍回到各专业明细页维护。</p>
          <p className="meta" style={{ margin: '6px 0 0' }}>V60顺序：{v60OrderNote}</p>
        </section>

        <div className="summary-strip" style={{ marginBottom: 12 }}>
          <div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(total)}</div></div>
          <div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div>
          <div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(single(total, saleableArea))}</div></div>
          <div className="stat"><div className="stat-label">已填末级科目</div><div className="stat-value">{filledRows}/{rows.length}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
            <b>目标成本测算表｜分业态汇总</b>
            <div className="meta">金额来自各专业明细页，父级不重复计入；建面单方和可售单方按项目概况总建面/可售面积计算。</div>
          </div>
          <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', minWidth: Math.max(1280, 920 + productNames.length * 130), borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fff' }}>
                  <th style={{ ...stickyName, textAlign: 'left' }}>目标成本科目</th>
                  <th style={{ ...cell, textAlign: 'left' }}>测算依据</th>
                  <th style={{ ...cell, textAlign: 'right' }}>合计</th>
                  {productNames.map((name) => <th key={name} style={{ ...cell, textAlign: 'right' }}>{name}</th>)}
                  <th style={{ ...cell, textAlign: 'right' }}>地上合计</th>
                  <th style={{ ...cell, textAlign: 'right' }}>地下合计</th>
                  <th style={{ ...cell, textAlign: 'right' }}>建面单方</th>
                  <th style={{ ...cell, textAlign: 'right' }}>可售单方</th>
                  <th style={{ ...cell, textAlign: 'left' }}>来源</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ row, total: rowTotal, groundTotal, undergroundTotal, byProduct }) => {
                  const indent = row.detailSubject ? 36 : row.thirdSubject ? 24 : row.secondSubject ? 12 : 0;
                  return <tr key={subjectKey(row)} style={{ background: rowTotal > 0 ? '#f8fff9' : '#fff' }}>
                    <td style={{ ...stickyName, paddingLeft: indent + 8 }}>
                      <div style={{ color: '#0b7285', fontSize: 11 }}>{row.costCode}</div>
                      <div>{row.detailSubject || row.thirdSubject || row.secondSubject || row.firstSubject}</div>
                      <div className="meta" style={{ fontSize: 11 }}>{[row.firstSubject, row.secondSubject, row.thirdSubject].filter(Boolean).join(' / ')}</div>
                    </td>
                    <td style={{ ...cell, maxWidth: 300, whiteSpace: 'normal' }}>{row.measureBasis || '-'}</td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(rowTotal)}</td>
                    {productNames.map((name) => <td key={name} style={{ ...cell, textAlign: 'right' }}>{fmt(byProduct.get(name) || 0)}</td>)}
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(groundTotal)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(undergroundTotal)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(single(rowTotal, buildingArea))}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(single(rowTotal, saleableArea))}</td>
                    <td style={{ ...cell }}>{row.sourceTable || '-'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
