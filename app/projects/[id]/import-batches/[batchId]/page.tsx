import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isVersionLocked } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function money(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function qty(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
}

function percent(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0%';
  return `${(num * 100).toFixed(2)}%`;
}

function modeText(value?: string | null) {
  if (value === 'append') return '追加导入';
  if (value === 'clear') return '清空旧导入后重导';
  return '更新同名科目';
}

function statusText(value?: string | null) {
  if (value === 'undone') return '已撤销';
  return '有效';
}

export default async function ImportBatchDetailPage({ params }: { params: { id: string; batchId: string } }) {
  const batch = await prisma.importBatch.findFirst({
    where: { id: params.batchId }
  });
  const projectVersion = batch ? await prisma.projectVersion.findFirst({
    where: { id: batch.projectVersionId, projectId: params.id },
    include: { project: true }
  }) : null;
  const costLines = batch && projectVersion ? await prisma.costLine.findMany({
    where: { importBatchId: batch.id },
    include: { costSubject: true },
    orderBy: [{ professionalGroup: 'asc' }, { sortOrder: 'asc' }]
  }) : [];

  if (!batch || !projectVersion) {
    return (
      <main className="page">
        <div className="container">
          <section className="card">
            <h1>未找到导入批次</h1>
            <Link href={`/projects/${params.id}/import-batches`} className="btn btn-primary">返回导入批次</Link>
          </section>
        </div>
      </main>
    );
  }

  const locked = isVersionLocked(projectVersion);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">导入批次详情</p>
            <h1 className="title">{projectVersion.project.name} · {batch.fileName}</h1>
            <p className="subtitle">查看本批次导入的成本明细行。撤销时只删除当前批次关联的成本行。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${params.id}/import-batches`} className="btn btn-primary">返回批次列表</Link>
            <Link href={`/projects/${params.id}/export`} className="btn">返回 Excel 导入</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>批次概况</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <div><span className="meta">导入时间</span><div style={{ fontWeight: 900 }}>{batch.createdAt.toLocaleString('zh-CN')}</div></div>
            <div><span className="meta">模式</span><div style={{ fontWeight: 900 }}>{modeText(batch.importMode)}</div></div>
            <div><span className="meta">状态</span><div style={{ fontWeight: 900 }}>{statusText(batch.status)}</div></div>
            <div><span className="meta">导入行数</span><div style={{ fontWeight: 900 }}>{batch.rowCount}</div></div>
            <div><span className="meta">当前关联行</span><div style={{ fontWeight: 900 }}>{costLines.length}</div></div>
            <div><span className="meta">清空旧导入行</span><div style={{ fontWeight: 900 }}>{batch.deletedCount}</div></div>
            <div><span className="meta">含税合计</span><div style={{ fontWeight: 900 }}>{money(batch.taxInclusiveTotal)} 元</div></div>
            <div><span className="meta">不含税合计</span><div style={{ fontWeight: 900 }}>{money(batch.taxExclusiveTotal)} 元</div></div>
            <div><span className="meta">税额合计</span><div style={{ fontWeight: 900 }}>{money(batch.taxAmountTotal)} 元</div></div>
          </div>
          {batch.status === 'active' && !locked ? (
            <form action={`/api/projects/${params.id}/import-batches/${batch.id}/undo`} method="post" style={{ marginTop: 14 }}>
              <button className="btn" style={{ borderColor: '#ffc9c9' }}>撤销此批次</button>
            </form>
          ) : null}
        </section>

        <section className="card">
          <h2>成本明细行</h2>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', minWidth: 1380, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['序号', '工作表/分组', '编码', '科目路径', '明细科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '不含税金额', '税额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {costLines.map((line, index) => (
                  <tr key={line.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{index + 1}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.professionalGroup || '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.costSubject.code}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.description || line.costSubject.fullPath || '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{line.detailName}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.measureBasis || '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{qty(line.quantity)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.unit || '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(line.taxInclusiveUnitPrice)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{percent(line.taxRate)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(line.taxInclusiveAmount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(line.taxExclusiveAmount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(line.taxAmount)}</td>
                  </tr>
                ))}
                {!costLines.length ? (
                  <tr><td colSpan={13} style={{ padding: 18, color: 'var(--muted)' }}>该批次暂无关联成本行，可能已被撤销或被后续更新覆盖。</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
