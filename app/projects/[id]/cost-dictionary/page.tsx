import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';

export const dynamic = 'force-dynamic';

const columns = [
  ['costCode', '成本编码'],
  ['detailSubject', '科目名称'],
  ['subjectLevel', '层级'],
  ['measureBasis', '建议测算依据'],
  ['unit', '单位'],
  ['defaultTaxRate', '默认税率'],
  ['applicableProductType', '适用业态'],
  ['enabled', '是否启用'],
  ['writeBackToTarget', '是否进入目标成本']
] as const;

function cell(row: any, key: string) {
  const value = row[key];
  if (value === null || value === undefined) return '';
  return String(value);
}

function indent(code: string) {
  const parts = code.split('.').filter(Boolean).length;
  if (parts <= 1) return 0;
  if (parts === 2) return 16;
  return 32;
}

function firstLevel(code: string) {
  return code.includes('.') ? code.split('.')[0] : code.slice(0, 2);
}

function includesText(value: unknown, keyword: string) {
  return String(value || '').toLowerCase().includes(keyword.toLowerCase());
}

async function ensurePresetRows(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  const presetRows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  if (presetRows.length === 0) return false;
  if (count >= 100) return false;

  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId } }),
    prisma.costDictionaryRow.createMany({ data: presetRows })
  ]);
  return true;
}

export default async function CostDictionaryPage({ params, searchParams }: { params: { id: string }, searchParams?: { imported?: string; error?: string; q?: string; first?: string; level?: string; product?: string; enabled?: string; expanded?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const autoSeeded = await ensurePresetRows(project.id);
  const rows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id },
    orderBy: { rowIndex: 'asc' }
  });
  const q = String(searchParams?.q || '').trim();
  const first = String(searchParams?.first || '').trim();
  const level = String(searchParams?.level || '').trim();
  const product = String(searchParams?.product || '').trim();
  const enabled = String(searchParams?.enabled || '').trim();
  const expanded = searchParams?.expanded === '1';
  const firstOptions = Array.from(new Set(rows.map((row) => firstLevel(cell(row, 'costCode'))).filter(Boolean))).sort();
  const levelOptions = Array.from(new Set(rows.map((row) => cell(row, 'subjectLevel')).filter(Boolean))).sort();
  const productOptions = Array.from(new Set(rows.map((row) => cell(row, 'applicableProductType')).filter(Boolean))).slice(0, 40);
  const visibleRows = rows.filter((row) => {
    const code = cell(row, 'costCode');
    const name = cell(row, 'detailSubject') || cell(row, 'thirdSubject') || cell(row, 'secondSubject');
    if (q && !includesText(`${code} ${name}`, q)) return false;
    if (first && firstLevel(code) !== first) return false;
    if (level && cell(row, 'subjectLevel') !== level) return false;
    if (product && cell(row, 'applicableProductType') !== product) return false;
    if (enabled && cell(row, 'enabled') !== enabled) return false;
    return true;
  });

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1480 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">系统资料 / 成本科目</p>
            <h1 className="title">成本科目及测算词典</h1>
            <p className="subtitle">只读检索型词典，用于查看成本编码、科目名称、层级、测算依据、单位、税率、适用业态和目标成本口径。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs-batch`} className="btn btn-primary">目标成本测算表</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
          </div>
        </div>

        {autoSeeded ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>已将当前项目词典刷新为 V60 标准预设。</div> : null}
        {searchParams?.imported ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>已重置 {searchParams.imported} 行成本科目词典。</div> : null}
        {searchParams?.error === 'missing-file' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffc9c9' }}>请先选择 Excel 模板文件。</div> : null}
        {searchParams?.error === 'missing-sheet' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffc9c9' }}>未找到“成本科目及测算词典”工作表。</div> : null}

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>预设规则</h2>
          <p className="meta">成本科目词典作为系统默认预设，新项目打开本页会自动初始化。若旧版本只生成了少量兜底科目，打开本页会自动替换为标准科目树。</p>
          <p className="meta">充电桩不作为业态；成本进入安装明细和设备明细。安装明细记录管线、桥架、安装调试；设备明细记录充电桩设备本体。</p>
        </section>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>检索与筛选</h2>
          <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
            <label>搜索科目编码 / 科目名称<input name="q" defaultValue={q} placeholder="如 01 或 土地" /></label>
            <label>一级科目<select name="first" defaultValue={first}><option value="">全部</option>{firstOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>层级<select name="level" defaultValue={level}><option value="">全部</option>{levelOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>适用业态<select name="product" defaultValue={product}><option value="">全部</option>{productOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>是否启用<select name="enabled" defaultValue={enabled}><option value="">全部</option><option value="是">启用</option><option value="否">停用</option></select></label>
            <input type="hidden" name="expanded" value={expanded ? '1' : '0'} />
            <div className="actions" style={{ marginTop: 0 }}><button className="btn btn-primary">应用筛选</button><Link className="btn" href={`/projects/${project.id}/cost-dictionary?expanded=1`}>展开全部</Link><Link className="btn" href={`/projects/${project.id}/cost-dictionary`}>收起全部</Link></div>
          </form>
          <p className="meta">当前展示 {visibleRows.length} / {rows.length} 行；本页只读，不直接编辑词典数据。</p>
        </section>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>危险操作</h2>
          <p className="meta">重置会覆盖当前项目词典，需二次确认后再执行。</p>
          <form action={`/api/projects/${project.id}/cost-dictionary/import`} method="post" encType="multipart/form-data">
            <div className="actions"><ConfirmSubmitButton className="btn" message="将当前项目成本科目词典重置为系统预设词典，已有词典行会被覆盖。请确认是否继续？" style={{ color: '#c92a2a', borderColor: '#ffc9c9' }}>重置为 V60 标准成本科目词典</ConfirmSubmitButton></div>
          </form>
        </section>

        <section className="card">
          <h2>词典明细</h2>
          <p className="meta">当前已预设：{rows.length} 行；当前展示：{visibleRows.length} 行；字段：{columns.length} 列。</p>
          {visibleRows.length === 0 ? (
            <p className="meta">当前筛选条件下没有匹配科目。请调整搜索词、一级科目、层级、适用业态或启用状态后重新筛选。</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 680 }}>
              <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {columns.map(([key, label]) => (
                      <th key={key} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: '#fff', color: 'var(--muted)', zIndex: 1 }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const code = cell(row, 'costCode');
                    const isLevelOne = indent(code) === 0;
                    return (
                      <tr key={row.id} style={!expanded && !isLevelOne ? { display: 'none' } : undefined}>
                        {columns.map(([key]) => (
                          <td key={key} style={{ padding: 8, borderBottom: '1px solid var(--border)', verticalAlign: 'top', paddingLeft: key === 'costCode' ? 8 + indent(code) : 8, fontWeight: key === 'costCode' || key === 'detailSubject' ? 700 : 400 }}>
                            {cell(row, key)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
