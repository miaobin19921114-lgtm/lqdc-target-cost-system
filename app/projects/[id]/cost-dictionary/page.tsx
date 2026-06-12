import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const columns = [
  ['costCode', '成本编码'],
  ['parentCode', '父级编码'],
  ['subjectLevel', '科目层级'],
  ['firstSubject', '一级科目'],
  ['secondSubject', '二级科目'],
  ['thirdSubject', '三级科目'],
  ['detailSubject', '四级/明细科目'],
  ['subjectDefinition', '科目定义'],
  ['sourceTable', '归属表'],
  ['enabled', '是否启用'],
  ['writeBackToTarget', '是否回写目标成本'],
  ['targetMappingCode', '目标成本主表映射编码'],
  ['measureBasis', '建议测算依据'],
  ['unit', '单位'],
  ['defaultTaxRate', '默认税率'],
  ['applicableProductType', '适用业态'],
  ['applicableStage', '适用阶段'],
  ['investmentMethod', '投拓阶段测算方法'],
  ['conceptMethod', '概念方案阶段测算方法'],
  ['schemeMethod', '方案阶段测算方法'],
  ['drawingMethod', '施工图阶段测算方法'],
  ['tenderMethod', '招采合约阶段测算方法'],
  ['dynamicMethod', '动态成本/结算阶段测算方法'],
  ['specialAdjustment', '特殊调整说明'],
  ['remark', '备注'],
  ['costAttributionMethod', '成本归属方式'],
  ['targetAllocationMethod', '目标成本/经营分摊口径'],
  ['landVatAllocationMethod', '土增税清算分摊口径'],
  ['incomeTaxDeductionCategory', '所得税扣除分类'],
  ['preTaxDeduction', '是否计入税前扣除'],
  ['taxRemark', '税务口径说明']
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

export default async function CostDictionaryPage({ params, searchParams }: { params: { id: string }, searchParams?: { imported?: string; error?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

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
            <p className="subtitle">按你 Excel 模板的 31 列结构导入，完整承接“成本科目及测算词典”工作表。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs`} className="btn btn-primary">目标成本测算</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.imported ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>已导入 {searchParams.imported} 行成本科目词典。</div> : null}
        {searchParams?.error === 'missing-file' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffc9c9' }}>请先选择 Excel 模板文件。</div> : null}
        {searchParams?.error === 'missing-sheet' ? <div className="card" style={{ marginBottom: 16, borderColor: '#ffc9c9' }}>未找到“成本科目及测算词典”工作表。</div> : null}

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>导入模板词典</h2>
          <p className="meta">上传你的 V57 模板，系统读取“成本科目及测算词典”页，从第 3 行开始导入 31 列。重复导入会先清空本项目旧词典，再写入新词典。</p>
          <form action={`/api/projects/${project.id}/cost-dictionary/import`} method="post" encType="multipart/form-data">
            <div className="form-grid">
              <label>Excel 模板文件<input name="file" type="file" accept=".xlsx" required /></label>
            </div>
            <div className="actions"><button className="btn btn-primary">导入成本科目词典</button></div>
          </form>
        </section>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>口径说明</h2>
          <p className="meta">充电桩不作为业态；成本进入安装明细和设备明细。安装明细记录管线、桥架、安装调试；设备明细记录充电桩设备本体。</p>
        </section>

        <section className="card">
          <h2>词典明细</h2>
          <p className="meta">当前已导入：{rows.length} 行；字段：{columns.length} 列。</p>
          {rows.length === 0 ? (
            <p className="meta">暂无导入数据。请先上传模板文件，导入“成本科目及测算词典”。</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 680 }}>
              <table style={{ width: '100%', minWidth: 3600, borderCollapse: 'collapse', fontSize: 12 }}>
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
                          <td key={key} style={{ padding: 8, borderBottom: '1px solid var(--border)', verticalAlign: 'top', paddingLeft: key === 'costCode' ? 8 + indent(code) : 8, fontWeight: key === 'costCode' || key === 'secondSubject' || key === 'detailSubject' ? 700 : 400 }}>
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
