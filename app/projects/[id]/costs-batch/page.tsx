import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProjectTopNav } from '@/components/project-navigation';
import { V60TargetCostTable } from '@/components/v60-target-cost-table';
import { rebuildProjectCostDictionary } from '@/lib/rebuild-project-cost-dictionary';
import { normalizeProjectVersionCostLineAmounts } from '@/lib/normalize-cost-line-amounts';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

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

const tableMajorName: Record<string, string> = {
  土地费用明细表: '土地费',
  前期费用明细表: '前期费',
  土建明细表: '土建',
  安装明细表: '安装',
  设备明细表: '设备',
  精装修明细表: '精装',
  室外管网明细表: '室外管网',
  景观工程明细表: '景观工程',
  道路总平明细表: '道路总平',
  围墙出入口明细表: '围墙出入口',
  销售费用明细表: '销售费用',
  管理费用明细表: '管理费用',
  财务费用明细表: '财务费用',
  税金明细表: '税金'
};

type AmountValue = { excl: number; incl: number; tax: number };
type Amount = AmountValue & { byProduct: Record<string, AmountValue> };

type DisplayRow = {
  id: string;
  parentId: string | null;
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

function num(value: unknown) { return Number(value || 0); }
function fmt(value: unknown) { return num(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function single(amountWan: number, area: number) { return area ? (amountWan * 10000) / area : 0; }
function productName(value: any) { return value?.name || value?.productType || value?.productName || value?.typeName || value?.id || '未分业态'; }
function productBuildingArea(value: any) { return num(value?.buildingArea || value?.totalBuildingArea || value?.aboveGroundBuildingArea || value?.grossFloorArea); }
function productSaleableArea(value: any) { return num(value?.saleableArea || value?.sellableArea || value?.saleArea); }

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

function majorName(row: any) {
  const table = String(row.sourceTable || '');
  return tableMajorName[table] || row.firstSubject || '未分类';
}

function emptyAmount(): Amount { return { excl: 0, incl: 0, tax: 0, byProduct: {} }; }
function addToAmount(target: Amount, amount: AmountValue, product?: string) {
  target.excl += amount.excl;
  target.incl += amount.incl;
  target.tax += amount.tax;
  if (product) {
    const existing = target.byProduct[product] || { excl: 0, incl: 0, tax: 0 };
    existing.excl += amount.excl;
    existing.incl += amount.incl;
    existing.tax += amount.tax;
    target.byProduct[product] = existing;
  }
}

function codePrefix(code: string, length: number) { return code.split('.').slice(0, length).join('.'); }

export default async function TargetCostBatchPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  await rebuildProjectCostDictionary(project.id);

  const version = await prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: true }
  });

  if (version) await normalizeProjectVersionCostLineAmounts(version.id);

  const costRows = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id },
    include: { costSubject: true, productType: true },
    orderBy: { sortOrder: 'asc' }
  }) : [];

  const products = (version?.products || []).filter((item: any) => item.isActive).map((item: any) => ({ name: productName(item), buildingArea: productBuildingArea(item), saleableArea: productSaleableArea(item) }));
  const productNames = products.map((item) => item.name);
  const productSet = new Set(productNames);
  const buildingArea = num(project.totalBuildingArea);
  const saleableArea = num(project.saleableArea);

  const dictionaryRows = await prisma.costDictionaryRow.findMany({ where: { projectId: params.id, enabled: { not: '否' }, costCode: { not: null } }, orderBy: [{ rowIndex: 'asc' }] });
  const leafRows = dictionaryRows.filter((row) => row.detailSubject).sort((a: any, b: any) => sourceRank(a) - sourceRank(b) || num(a.rowIndex) - num(b.rowIndex) || String(a.costCode || '').localeCompare(String(b.costCode || '')));

  const costByCode = new Map<string, any[]>();
  for (const cost of costRows) {
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
    const major = majorName(row);
    const l1 = ensureRow({ id: `1-${rank}-${major}`, parentId: null, level: 1, rank, rowIndex, code: codePrefix(code, 1), name: major, measureBasis: '', unit: '', taxRate: '', remark: '', sourceTable: row.sourceTable || '', isLeaf: false });
    const l2 = ensureRow({ id: `2-${rank}-${major}-${row.secondSubject}`, parentId: l1.id, level: 2, rank, rowIndex, code: codePrefix(code, 2), name: row.secondSubject || '未分类', measureBasis: '', unit: '', taxRate: '', remark: '', sourceTable: row.sourceTable || '', isLeaf: false });
    const l3 = ensureRow({ id: `3-${rank}-${major}-${row.secondSubject}-${row.thirdSubject}`, parentId: l2.id, level: 3, rank, rowIndex, code: row.parentCode || codePrefix(code, 3), name: row.thirdSubject || row.secondSubject || '未分类', measureBasis: '', unit: '', taxRate: '', remark: '', sourceTable: row.sourceTable || '', isLeaf: false });
    const leaf = ensureRow({ id: `4-${code}-${row.detailSubject}`, parentId: l3.id, level: 4, rank, rowIndex, code, name: row.detailSubject || '未命名科目', measureBasis: row.measureBasis || '', unit: row.unit || '', taxRate: row.defaultTaxRate || '', remark: row.remark || '', sourceTable: row.sourceTable || '', isLeaf: true });

    const costs = code ? costByCode.get(code) || [] : [];
    for (const cost of costs) {
      const product = (cost as any).productTypeId ? productName((cost as any).productType) : undefined;
      const amount = { excl: num((cost as any).taxExclusiveAmount), incl: num((cost as any).taxInclusiveAmount), tax: num((cost as any).taxAmount) };
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
            <p className="subtitle">金额单位统一为万元；单价单位统一为元/单位；单方统一为元/㎡。各专业明细页负责录入，本页自动汇总并自动重算旧成本行。</p>
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
          <p className="meta" style={{ margin: '6px 0 0' }}>价格规则：工程量 × 含税单价（元） ÷ 10000 = 含税合价（万元）；不含税、税额也按万元保存和汇总。</p>
          <p className="meta" style={{ margin: '6px 0 0' }}>顺序：{v60OrderNote}</p>
        </section>

        <div className="summary-strip" style={{ marginBottom: 12 }}>
          <div className="stat"><div className="stat-label">含税目标成本（万元）</div><div className="stat-value">{fmt(total)}</div></div>
          <div className="stat"><div className="stat-label">建面单方（元/㎡）</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div>
          <div className="stat"><div className="stat-label">可售单方（元/㎡）</div><div className="stat-value">{fmt(single(total, saleableArea))}</div></div>
          <div className="stat"><div className="stat-label">已填末级科目</div><div className="stat-value">{filledLeafRows}/{leafCount}</div></div>
        </div>

        <V60TargetCostTable rows={displayRows} products={products} buildingArea={buildingArea} saleableArea={saleableArea} />
      </div>
    </main>
  );
}
