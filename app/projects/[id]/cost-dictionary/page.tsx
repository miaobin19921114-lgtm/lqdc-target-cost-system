import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

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

export default async function CostDictionaryPage({ params, searchParams }: { params: { id: string }, searchParams?: { imported?: string; error?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const autoSeeded = await ensurePresetRows(project.id);
  const rows = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id },
    orderBy: { rowIndex: 'asc' }
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

        {autoSeeded ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>已将当前项目词典刷新为 V57 完整预设。</div> : null}
        {searchParams?.imported ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>已重置 {searchParams.imported} 行成本科目词典。</div> : null}
        {searchParams?.error === 'missing-file' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffc9c9' }}>请先选择 Excel 模板文件。</div> : null}
        {searchParams?.error === 'missing-sheet' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffc9c9' }}>未找到“成本科目及测算词典”工作表。</div> : null}

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>预设规则</h2>
          <p className="meta">成本科目词典作为系统默认预设，新项目打开本页会自动初始化。若旧版本只生成了少量兜底科目，打开本页会自动替换为完整 352 行。</p>
          <p className="meta">充电桩不作为业态；成本进入安装明细和设备明细。安装明细记录管线、桥架、安装调试；设备明细记录充电桩设备本体。</p>
        </section>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>检索与筛选</h2>
          <p className="meta">搜索科目编码 / 科目名称；按一级科目、层级、适用业态、是否启用筛选；可展开全部或收起全部。当前页面为只读展示，正式筛选交互在 06 继续补齐。</p>
          <div className="actions"><button className="btn">展开全部</button><button className="btn">收起全部</button></div>
        </section>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>危险操作</h2>
          <p className="meta">重置会覆盖当前项目词典，需二次确认后再执行。</p>
          <form action={`/api/projects/${project.id}/cost-dictionary/import`} method="post" encType="multipart/form-data">
            <div className="actions"><button className="btn" style={{ color: '#c92a2a', borderColor: '#ffc9c9' }}>重置为 V57 成本科目词典</button></div>
          </form>
        </section>

        <section className="card">
          <h2>词典明细</h2>
          <p className="meta">当前已预设：{rows.length} 行；字段：{columns.length} 列。</p>
          {rows.length === 0 ? (
            <p className="meta">暂无预设数据。请检查部署日志或使用重置按钮。</p>
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
                  {rows.map((row) => {
                    const code = cell(row, 'costCode');
                    return (
                      <tr key={row.id}>
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
