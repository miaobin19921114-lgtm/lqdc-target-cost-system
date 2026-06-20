import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';
import { rebuildProjectCostDictionary } from '@/lib/rebuild-project-cost-dictionary';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const stickyLevel = { ...cell, position: 'sticky' as const, left: 0, zIndex: 4, background: '#fff', minWidth: 56, textAlign: 'center' as const };
const stickyCode = { ...cell, position: 'sticky' as const, left: 56, zIndex: 4, background: '#fff', minWidth: 112, fontWeight: 800, color: '#0f4c5c' };
const stickySubject = { ...cell, position: 'sticky' as const, left: 168, zIndex: 4, background: '#fff', minWidth: 280, fontWeight: 800 };

const tableOrder: Record<string, number> = {
  土地费用明细表: 10,
  前期费用明细表: 20,
  土建明细表: 30,
  安装明细表: 40,
  设备明细表: 50,
  精装修明细表: 60,
  室外管网明细表: 70,
  景观工程明细表: 80,
  道路总平明细表: 90,
  围墙出入口明细表: 100,
  销售费用明细表: 110,
  管理费用明细表: 120,
  财务费用明细表: 130,
  税金明细表: 140
};

function num(value: unknown) {
  return Number(value || 0);
}

function fmt(value: unknown) {
  return num(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function single(amount: number, area: number) {
  return area ? amount / area : 0;
}

function productName(value: any) {
  return value?.name || value?.productType || value?.productName || value?.typeName || value?.id || '未分业态';
}

function productBuildingArea(value: any) {
  return num(value?.buildingArea || value?.totalBuildingArea || value?.aboveGroundBuildingArea || value?.grossFloorArea);
}

function productSaleableArea(value: any) {
  return num(value?.saleableArea || value?.sellableArea || value?.saleArea);
}

function sourceRank(row: any) {
  const table = String(row.sourceTable || '');
  if (tableOrder[table]) return tableOrder[table];
  const text = `${row.firstSubject || ''}${row.secondSubject || ''}${row.thirdSubject || ''}${row.detailSubject || ''}`;
  if (text.includes('土地')) return 10;
  if (text.includes('前期')) return 20;
  if (text.includes('土建')) return 30;
  if (text.includes('安装')) return 40;
  if (text.includes('设备')) return 50;
  if (text.includes('精装')) return 60;
  if (text.includes('管网')) return 70;
  if (text.includes('景观')) return 80;
  if (text.includes('道路')) return 90;
  if (text.includes('围墙') || text.includes('出入口')) return 100;
  if (text.includes('销售')) return 110;
  if (text.includes('管理')) return 120;
  if (text.includes('财务') || text.includes('融资') || text.includes('利息')) return 130;
  if (text.includes('税')) return 140;
  return 999;
}

type Amount = { excl: number; incl: number; tax: number; byProduct: Map<string, { excl: number; incl: number; tax: number }> };
type DisplayRow = {
  id: string;
  level: number;
  rank: number;
  rowIndex: number;
  code: string;
  name: string;
  measureBasis: string;
  unit: string;
  taxRate: string;
  remark: string;
  sourceTable: string;
  isLeaf: boolean;
  amount: Amount;
};

function emptyAmount(): Amount {
  return { excl: 0, incl: 0, tax: 0, byProduct: new Map() };
}

function addToAmount(target: Amount, amount: { excl: number; incl: number; tax: number }, product?: string) {
  target.excl += amount.excl;
  target.incl += amount.incl;
  target.tax += amount.tax;
  if (product) {
    const existing = target.byProduct.get(product) || { excl: 0, incl: 0, tax: 0 };
    existing.excl += amount.excl;
    existing.incl += amount.incl;
    existing.tax += amount.tax;
    target.byProduct.set(product, existing);
  }
}

function codePrefix(code: string, length: number) {
  return code.split('.').slice(0, length).join('.');
}

function levelStyle(level: number, amount: number) {
  if (level === 1) return { background: '#e9f7f8', fontWeight: 900 };
  if (level === 2) return { background: '#f8fafc', fontWeight: 800 };
  if (level === 3) return { background: '#fcfdff', fontWeight: 700 };
  return { background: amount > 0 ? '#f8fff9' : '#fff' };
}

function amountCells(amount: Amount, keyPrefix: string, cellStyle: any, area?: { buildingArea?: number; saleableArea?: number }, fallbackBuildingArea = 0, fallbackSaleableArea = 0) {
  const buildingArea = area?.buildingArea || fallbackBuildingArea;
  const saleableArea = area?.saleableArea || fallbackSaleableArea;
  return [
    <td key={`${keyPrefix}-excl`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(amount.excl)}</td>,
    <td key={`${keyPrefix}-incl`} style={{ ...cellStyle, textAlign: 'right', fontWeight: 800 }}>{fmt(amount.incl)}</td>,
    <td key={`${keyPrefix}-tax`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(amount.tax)}</td>,
    <td key={`${keyPrefix}-building`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(single(amount.incl, buildingArea))}</td>,
    <td key={`${keyPrefix}-saleable`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(single(amount.incl, saleableArea))}</td>
  ];
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

  const productList = (version?.products || [])
    .filter((item: any) => item.isActive)
    .map((item: any) => ({
      name: productName(item),
      buildingArea: productBuildingArea(item),
      saleableArea: productSaleableArea(item)
    }));
  const productNames = productList.map((item) => item.name);
  const productSet = new Set(productNames);
  const productAreaMap = new Map(productList.map((item) => [item.name, item]));

  const buildingArea = num(project.totalBuildingArea);
  const saleableArea = num(project.saleableArea);

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } },
    orderBy: [{ rowIndex: 'asc' }]
  });
  const leafRows = dictionaryRows
    .filter((row) => row.detailSubject)
    .sort((a: any, b: any) => sourceRank(a) - sourceRank(b) || num(a.rowIndex) - num(b.rowIndex) || String(a.costCode || '').localeCompare(String(b.costCode || '')));

  const costByCode = new Map<string, any[]>();
  for (const cost of version?.costs || []) {
    const code = (cost as any).costSubject?.code;
    if (!code) continue;
    const name = productName((cost as any).productType);
    if ((cost as any).productTypeId && !productSet.has(name)) continue;
    const list = costByCode.get(code) || [];
    list.push(cost);
    costByCode.set(code, list);
  }

  const displayRows: DisplayRow[] = [];
  const rowMap = new Map<string, DisplayRow>();

  function ensureRow(input: Omit<DisplayRow, 'amount'>) {
    const existing = rowMap.get(input.id);
    if (existing) return existing;
    const created = { ...input, amount: emptyAmount() };
    rowMap.set(input.id, created);
    displayRows.push(created);
    return created;
  }

  for (const row of leafRows) {
    const code = row.costCode || '';
    const rank = sourceRank(row);
    const rowIndex = num(row.rowIndex);
    const l1 = ensureRow({ id: `1-${rank}-${row.firstSubject}`, level: 1, rank, rowIndex, code: codePrefix(code, 1), name: row.firstSubject || '未分类', measureBasis: '', unit: '', taxRate: '', remark: '', sourceTable: row.sourceTable || '', isLeaf: false });
    const l2 = ensureRow({ id: `2-${rank}-${row.firstSubject}-${row.secondSubject}`, level: 2, rank, rowIndex, code: codePrefix(code, 2), name: row.secondSubject || '未分类', measureBasis: '', unit: '', taxRate: '', remark: '', sourceTable: row.sourceTable || '', isLeaf: false });
    const l3 = ensureRow({ id: `3-${rank}-${row.firstSubject}-${row.secondSubject}-${row.thirdSubject}`, level: 3, rank, rowIndex, code: row.parentCode || codePrefix(code, 3), name: row.thirdSubject || row.secondSubject || '未分类', measureBasis: '', unit: '', taxRate: '', remark: '', sourceTable: row.sourceTable || '', isLeaf: false });
    const leaf = ensureRow({ id: `4-${code}-${row.detailSubject}`, level: 4, rank, rowIndex, code, name: row.detailSubject || '未命名科目', measureBasis: row.measureBasis || '', unit: row.unit || '', taxRate: row.defaultTaxRate || '', remark: row.remark || '', sourceTable: row.sourceTable || '', isLeaf: true });

    const costs = code ? costByCode.get(code) || [] : [];
    for (const cost of costs) {
      const product = (cost as any).productTypeId ? productName((cost as any).productType) : undefined;
      const amount = {
        excl: num((cost as any).taxExclusiveAmount),
        incl: num((cost as any).taxInclusiveAmount),
        tax: num((cost as any).taxAmount)
      };
      [l1, l2, l3, leaf].forEach((target) => addToAmount(target.amount, amount, product));
    }
  }

  const total = displayRows.filter((row) => row.level === 1).reduce((sum, row) => sum + row.amount.incl, 0);
  const filledLeafRows = displayRows.filter((row) => row.isLeaf && row.amount.incl > 0).length;
  const leafCount = displayRows.filter((row) => row.isLeaf).length;

  const v60OrderNote = '土地费 → 前期费 → 土建 → 安装 → 设备 → 精装 → 室外管网 → 景观 → 道路总平 → 围墙出入口 → 销售费用 → 管理费用 → 财务费用 → 税金';

  return (
    <main className="page">
      <ProjectTopNav projectId={project.id} projectName={project.name} current="目标成本测算表" />
      <div className="container" style={{ maxWidth: 1880 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">目标成本测算表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">各专业明细页负责录入；本页按V60横向大表结构自动汇总，左侧科目树固定，右侧展示全项目及各业态不含税、含税、税额和单方。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总表</Link>
            <Link href={`/projects/${project.id}/summary-check`} className="btn">汇总校验</Link>
            <Link href={`/projects/${project.id}/cost-allocation`} className="btn">成本分摊</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 12, borderColor: '#d0ebff', background: '#f8fbff' }}>
          <b>V60口径说明</b>
          <p className="meta" style={{ margin: '6px 0 0' }}>目标成本测算表不是重复录入页，而是把土地费、前期费、各专业明细、销售/管理/财务费用按科目树和业态汇总展示。</p>
          <p className="meta" style={{ margin: '6px 0 0' }}>顺序：{v60OrderNote}</p>
        </section>

        <div className="summary-strip" style={{ marginBottom: 12 }}>
          <div className="stat"><div className="stat-label">含税目标成本</div><div className="stat-value">{fmt(total)}</div></div>
          <div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div>
          <div className="stat"><div className="stat-label">可售单方</div><div className="stat-value">{fmt(single(total, saleableArea))}</div></div>
          <div className="stat"><div className="stat-label">已填末级科目</div><div className="stat-value">{filledLeafRows}/{leafCount}</div></div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
            <b>目标成本测算表｜V60横向分业态大表</b>
            <div className="meta">左侧固定：级次、编码、科目、测算依据、单位、税率、说明；右侧：目标成本汇总 + 各业态汇总 + 各业态五列。</div>
          </div>
          <div style={{ overflow: 'auto', maxHeight: '74vh' }}>
            <table style={{ width: '100%', minWidth: Math.max(1720, 980 + (productNames.length + 1) * 520), borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#dff3f6' }}>
                  <th colSpan={7} style={{ ...cell, position: 'sticky', left: 0, zIndex: 6, background: '#dff3f6', textAlign: 'center', fontWeight: 900 }}>科目区</th>
                  <th colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>目标成本汇总</th>
                  {productNames.length ? <th colSpan={productNames.length * 5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>各业态汇总 / 分业态汇总</th> : null}
                  <th style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>来源</th>
                </tr>
                <tr style={{ background: '#eef7f9' }}>
                  <th colSpan={7} style={{ ...cell, position: 'sticky', left: 0, zIndex: 5, background: '#eef7f9', textAlign: 'center' }}>级次 / 编码 / 科目 / 测算依据</th>
                  <th colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>全项目合计</th>
                  {productNames.map((name) => <th key={name} colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>{name}</th>)}
                  <th style={{ ...cell, textAlign: 'center' }}>明细表</th>
                </tr>
                <tr style={{ background: '#fff' }}>
                  <th style={stickyLevel}>级次</th>
                  <th style={stickyCode}>编码</th>
                  <th style={stickySubject}>目标成本科目</th>
                  <th style={{ ...cell, textAlign: 'left', minWidth: 220 }}>测算依据</th>
                  <th style={{ ...cell, textAlign: 'left', minWidth: 70 }}>单位</th>
                  <th style={{ ...cell, textAlign: 'left', minWidth: 70 }}>税率</th>
                  <th style={{ ...cell, textAlign: 'left', minWidth: 260 }}>说明/计算口径</th>
                  {['不含税', '含税', '税额', '建面单方', '可售单方'].map((head) => <th key={`all-${head}`} style={{ ...cell, textAlign: 'right', minWidth: 96 }}>{head}</th>)}
                  {productNames.flatMap((name) => ['不含税', '含税', '税额', '建面单方', '可售单方'].map((head) => <th key={`${name}-${head}`} style={{ ...cell, textAlign: 'right', minWidth: 96 }}>{head}</th>))}
                  <th style={{ ...cell, textAlign: 'left', minWidth: 110 }}>来源</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((item) => {
                  const style = levelStyle(item.level, item.amount.incl);
                  return <tr key={item.id} style={style}>
                    <td style={{ ...stickyLevel, ...style }}>{item.level}</td>
                    <td style={{ ...stickyCode, ...style }}>{item.code}</td>
                    <td style={{ ...stickySubject, ...style, paddingLeft: 8 + (item.level - 1) * 18 }}>{item.name}</td>
                    <td style={{ ...cell, whiteSpace: 'normal' }}>{item.measureBasis || (item.isLeaf ? '-' : '自动汇总')}</td>
                    <td style={{ ...cell }}>{item.unit}</td>
                    <td style={{ ...cell }}>{item.taxRate}</td>
                    <td style={{ ...cell, whiteSpace: 'normal', color: '#667085' }}>{item.remark || (item.isLeaf ? '-' : '汇总下级末级科目，不重复计入')}</td>
                    {amountCells(item.amount, `${item.id}-all`, cell, undefined, buildingArea, saleableArea)}
                    {productNames.flatMap((name) => {
                      const amount = item.amount.byProduct.get(name) || { excl: 0, incl: 0, tax: 0 };
                      return amountCells({ excl: amount.excl, incl: amount.incl, tax: amount.tax, byProduct: new Map() }, `${item.id}-${name}`, cell, productAreaMap.get(name), buildingArea, saleableArea);
                    })}
                    <td style={{ ...cell }}>{item.sourceTable}</td>
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
