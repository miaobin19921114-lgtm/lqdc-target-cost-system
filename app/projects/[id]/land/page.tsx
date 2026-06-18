import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';
import { projectNavGroups } from '@/components/project-navigation';

export const dynamic = 'force-dynamic';

const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const input = { width: '100%', minWidth: 88, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 6px' };
function fmt(value: unknown) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function single(value: unknown, area: number) { return area ? Number(value || 0) / area : 0; }
function round2(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }

type TreeNode = { name: string; amount: number; rows: number; filled: number; children: Map<string, TreeNode>; leaves: any[] };

function node(name: string): TreeNode {
  return { name, amount: 0, rows: 0, filled: 0, children: new Map(), leaves: [] };
}

function child(parent: TreeNode, name: string) {
  const found = parent.children.get(name);
  if (found) return found;
  const created = node(name);
  parent.children.set(name, created);
  return created;
}

function addStat(target: TreeNode, amount: number, filled: boolean) {
  target.amount += amount;
  target.rows += 1;
  target.filled += filled ? 1 : 0;
}

function matchesInactiveProductName(text: string | null | undefined, inactiveNames: Set<string>) {
  const value = String(text || '').trim();
  if (!value) return false;
  return Array.from(inactiveNames).some((name) => value === name || value === `业态-${name}` || value === `区域-${name}`);
}

function landRowName(row: { detailSubject?: string | null; measureBasis?: string | null }) {
  return `${row.detailSubject || ''}${row.measureBasis || ''}`;
}

function isRateBasedLandFee(row: { detailSubject?: string | null; measureBasis?: string | null }) {
  const name = landRowName(row);
  return ['契税', '土地交易服务费', '土地评估费', '土地咨询', '居间服务费'].some((key) => name.includes(key));
}

function defaultFeeRateText(row: { detailSubject?: string | null; measureBasis?: string | null }) {
  const name = landRowName(row);
  if (name.includes('契税')) return '3%';
  return '';
}

function savedFeeRateText(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `${round2(num)}%`;
}

function isLandPriceCost(row: { detailName?: string | null; costSubject?: { name?: string | null } | null }) {
  const name = `${row.detailName || ''}${row.costSubject?.name || ''}`;
  return (name.includes('土地出让金') || name.includes('土地价款')) && !name.includes('契税') && !name.includes('交易') && !name.includes('评估') && !name.includes('咨询') && !name.includes('居间');
}

async function ensureDictionary(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  if (count >= 100) return;
  const rows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: rows })
  ]);
}

function renderTopNav(projectId: string, projectName: string) {
  return <nav style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f6', background: '#f8fafc', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <b>{projectName}</b><span className="meta">土地费用明细表</span>
    </div>
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: 8 }}>
      {projectNavGroups.map((group) => <div key={group.title} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, padding: 6, border: '1px solid #eef2f6', borderRadius: 10, background: '#f8fafc' }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: '#667085', whiteSpace: 'nowrap' }}>{group.title}</span>
        {group.items.map(([name, href]) => {
          if (!href) return null;
          const active = href === 'land';
          const target = href.startsWith('/') ? href : `/projects/${projectId}/${href}`;
          return <Link key={`${group.title}-${name}`} href={target} style={{ whiteSpace: 'nowrap', padding: '7px 10px', borderRadius: 8, fontSize: 13, background: active ? '#e6fcf5' : '#fff', color: active ? '#087f5b' : '#102033', border: active ? '1px solid #96f2d7' : '1px solid #eef2f6', fontWeight: active ? 900 : 500 }}>{name}</Link>;
        })}
      </div>)}
    </div>
  </nav>;
}

export default async function LandCostPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string, batch?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  await ensureDictionary(project.id);

  const version = await prisma.projectVersion.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, costs: { include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } } }
  });
  const inactiveProductNames = new Set((version?.products || []).filter((item) => !item.isActive).map((item) => item.name));

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, enabled: { not: '否' }, sourceTable: '土地费用明细表' },
    orderBy: { rowIndex: 'asc' }
  });
  const rawLeafRows = dictionaryRows.filter((row) => row.detailSubject);
  const leafRows = rawLeafRows.filter((row) => !matchesInactiveProductName(row.applicableProductType, inactiveProductNames));
  const hiddenDictionaryRows = rawLeafRows.length - leafRows.length;
  const leafCodes = new Set(leafRows.map((row) => row.costCode).filter(Boolean));
  const rawCosts = version?.costs || [];
  const costs = rawCosts.filter((row) => (!row.productTypeId || row.productType?.isActive) && !matchesInactiveProductName(row.regionOrProductType, inactiveProductNames));
  const hiddenCostRows = rawCosts.length - costs.length;
  const activeCosts = costs.filter((row) => row.professionalGroup === '土地费用' && leafCodes.has(row.costSubject.code));
  const costByCode = new Map<string, any>();
  costs.forEach((row) => costByCode.set(row.costSubject.code, row));
  const landPriceCost = activeCosts.find((row) => isLandPriceCost(row));
  const landPriceBaseWan = landPriceCost ? round2(Number(landPriceCost.taxInclusiveAmount || 0) / 10000) : 0;

  const root = node('root');
  leafRows.forEach((row) => {
    const saved = row.costCode ? costByCode.get(row.costCode) : null;
    const amount = Number(saved?.taxInclusiveAmount || 0);
    const filled = amount > 0;
    const level1 = child(root, row.firstSubject || '土地成本');
    const level2 = child(level1, row.secondSubject || '土地取得价款及相关税费');
    const level3 = child(level2, row.thirdSubject || row.secondSubject || '土地费明细');
    addStat(level1, amount, filled);
    addStat(level2, amount, filled);
    addStat(level3, amount, filled);
    level3.leaves.push(row);
  });
  const levelOneRows = Array.from(root.children.values());

  const total = activeCosts.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const buildingArea = Number(project.totalBuildingArea || 0);
  const saleableArea = Number(project.saleableArea || 0);

  return (
    <main className="page" style={{ padding: 0 }}>
      <div style={{ maxWidth: 1840, margin: '0 auto', padding: 12 }}>
        {renderTopNav(project.id, project.name)}
        <div className="container" style={{ maxWidth: 'none', width: '100%', padding: 0 }}>
          <div className="page-header">
            <div>
              <p className="eyebrow">土地费用明细表</p>
              <h1 className="title">{project.name}</h1>
              <p className="subtitle">土地价款按面积×单价；契税、交易服务费、评估费、居间费自动引用土地价款作为计费基数，费率按百分数输入与显示，例如 1%、3%。</p>
            </div>
            <div className="actions" style={{ marginTop: 0 }}>
              <Link href={`/projects/${project.id}/summary`} className="btn btn-primary">目标成本汇总表</Link>
              <Link href={`/projects/${project.id}/costs-batch`} className="btn">目标成本编制</Link>
              <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
            </div>
          </div>

          {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 12, borderColor: '#b2f2bb' }}>土地费用已保存。{searchParams?.batch ? `本次处理 ${searchParams.batch} 行。` : ''}</div> : null}
          {hiddenDictionaryRows || hiddenCostRows ? <div className="card" style={{ marginBottom: 12, borderColor: '#ffd8a8', background: '#fff9db' }}>已隐藏停用业态相关科目 {hiddenDictionaryRows} 行、成本行 {hiddenCostRows} 行。</div> : null}

          <div className="summary-strip">
            <div className="stat"><div className="stat-label">土地费合计</div><div className="stat-value">{fmt(total)}元</div></div>
            <div className="stat"><div className="stat-label">土地价款基数</div><div className="stat-value">{fmt(landPriceBaseWan)}万元</div></div>
            <div className="stat"><div className="stat-label">建面单方</div><div className="stat-value">{fmt(single(total, buildingArea))}</div></div>
            <div className="stat"><div className="stat-label">已填 / 末级行</div><div className="stat-value">{activeCosts.length} / {leafRows.length}</div></div>
          </div>

          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div><b>土地费用明细｜科目树填报</b><div className="meta">费率类科目输入 1% 就按 1% 计算；保存后仍显示为 1%。</div></div>
              <button form="land-cost-batch" className="btn btn-primary">整表批量保存</button>
            </div>
            <form id="land-cost-batch" action={`/api/projects/${project.id}/land/batch`} method="post" />
            <div style={{ maxHeight: '72vh', overflow: 'auto', padding: 12 }}>
              {levelOneRows.length === 0 ? <p className="meta">暂无土地费用科目。</p> : levelOneRows.map((level1) => (
                <details key={level1.name} open style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
                  <summary style={{ cursor: 'pointer', padding: 12, background: '#e9f7f8', display: 'grid', gridTemplateColumns: '1fr 130px 140px 130px 130px', gap: 10, alignItems: 'center', fontWeight: 900 }}>
                    <span>一级｜{level1.name}</span><span>已填 {level1.filled}/{level1.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level1.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level1.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level1.amount, saleableArea))}</span>
                  </summary>
                  <div style={{ padding: 10 }}>
                    {Array.from(level1.children.values()).map((level2) => (
                      <details key={level2.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                        <summary style={{ cursor: 'pointer', padding: 10, background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 120px 140px 130px 130px', gap: 10, alignItems: 'center', fontWeight: 800 }}>
                          <span>二级｜{level2.name}</span><span>已填 {level2.filled}/{level2.rows}</span><span style={{ textAlign: 'right' }}>{fmt(level2.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level2.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level2.amount, saleableArea))}</span>
                        </summary>
                        <div style={{ padding: 8 }}>
                          {Array.from(level2.children.values()).map((level3) => (
                            <details key={level3.name} open style={{ border: '1px solid #eef2f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                              <summary style={{ cursor: 'pointer', padding: 10, background: '#fcfdff', display: 'grid', gridTemplateColumns: '1fr 120px 140px 130px 130px', gap: 10, alignItems: 'center' }}>
                                <b>三级｜{level3.name}</b><span>已填 {level3.filled}/{level3.rows}</span><span style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(level3.amount)}</span><span style={{ textAlign: 'right' }}>{fmt(single(level3.amount, buildingArea))}</span><span style={{ textAlign: 'right' }}>{fmt(single(level3.amount, saleableArea))}</span>
                              </summary>
                              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1420, borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead><tr style={{ background: '#fff' }}>{['编码', '末级科目', '区域/地块', '测算依据', '土地面积/计费基数', '单位', '单价或费率', '税率', '含税金额', '建面单方', '可售单方', '分摊方式', '备注', '状态'].map((head) => <th key={head} style={{ ...cell, textAlign: 'left', color: '#475467' }}>{head}</th>)}</tr></thead>
                                <tbody>{level3.leaves.map((row, index) => {
                                  const saved = row.costCode ? costByCode.get(row.costCode) : null;
                                  const amount = Number(saved?.taxInclusiveAmount || 0);
                                  const savedQuantity = Number(saved?.quantity || 0);
                                  const rateBased = isRateBasedLandFee(row);
                                  const shouldUseFormulaPreset = rateBased && landPriceBaseWan > 0 && (!saved || amount <= 0 || savedQuantity <= 0);
                                  const defaultQuantity = shouldUseFormulaPreset ? landPriceBaseWan : savedQuantity;
                                  const priceValue = rateBased ? (savedFeeRateText(saved?.taxInclusiveUnitPrice) || defaultFeeRateText(row)) : Number(saved?.taxInclusiveUnitPrice || 0) / 10000;
                                  return <tr key={row.id} style={{ background: amount > 0 ? '#f8fff9' : index % 2 ? '#fff' : '#fcfdff' }}>
                                    <td style={{ ...cell, fontWeight: 900, color: '#0f4c5c' }}>{row.costCode}</td>
                                    <td style={{ ...cell, fontWeight: 800 }}>{row.detailSubject}</td>
                                    <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`regionOrProductType-${row.id}`} defaultValue={saved?.regionOrProductType || '项目整体'} style={{ ...input, minWidth: 110 }} /></td>
                                    <td style={cell}>{saved?.measureBasis || row.measureBasis || (rateBased ? '土地价款/成交价×费率' : '土地面积/固定金额')}</td>
                                    <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" type="hidden" name="dictionaryRowId" value={row.id} />{saved ? <input form="land-cost-batch" type="hidden" name={`costLineId-${row.id}`} value={saved.id} /> : null}<input form="land-cost-batch" name={`quantity-${row.id}`} type="number" step="0.01" defaultValue={defaultQuantity || ''} placeholder={rateBased ? '自动取土地价款，可改' : '亩数/工程量'} style={input} /></td>
                                    <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`unit-${row.id}`} defaultValue={saved?.unit || (rateBased ? '万元基数' : row.unit || '亩')} style={{ ...input, minWidth: 70 }} /></td>
                                    <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`priceWanPerUnit-${row.id}`} type={rateBased ? 'text' : 'number'} step="0.01" defaultValue={priceValue || ''} placeholder={rateBased ? '费率，如1%' : '万元/单位'} style={input} /></td>
                                    <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`taxRate-${row.id}`} defaultValue={saved ? `${Number(saved.taxRate || 0) * 100}%` : row.defaultTaxRate || '0%'} style={{ ...input, minWidth: 68 }} /></td>
                                    <td style={{ ...cell, textAlign: 'right', fontWeight: 900 }}>{fmt(amount)}</td>
                                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, buildingArea))}</td>
                                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(single(amount, saleableArea))}</td>
                                    <td style={cell}>{saved?.allocationMethod || row.targetAllocationMethod || '按可售面积占比'}</td>
                                    <td style={{ ...cell, padding: 0 }}><input form="land-cost-batch" name={`remark-${row.id}`} defaultValue={saved?.remark || ''} placeholder="备注" style={{ ...input, minWidth: 130 }} /></td>
                                    <td style={{ ...cell, color: amount > 0 ? '#2f9e44' : '#98a2b3', fontWeight: 800 }}>{amount > 0 ? '已填' : (rateBased && landPriceBaseWan ? '已带入公式' : '未填')}</td>
                                  </tr>;
                                })}</tbody>
                              </table></div>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
