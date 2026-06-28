import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateActiveVersion, isVersionLocked } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function money(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default async function ImportBatchesPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  const version = await getOrCreateActiveVersion(params.id);
  const locked = version ? isVersionLocked(version) : false;
  const batches = version
    ? await prisma.importBatch.findMany({
        where: { projectVersionId: version.id, importType: 'cost' },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { costLines: true } } }
      })
    : [];

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1180 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Excel 导入批次</p>
            <h1 className="title">{project?.name || '项目'} · 导入批次记录</h1>
            <p className="subtitle">查看当前启用版本的成本导入记录，可进入详情核对成本行，也可撤销某一次导入。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${params.id}/export`} className="btn btn-primary">返回 Excel 导入</Link>
            <Link href={`/projects/${params.id}`} className="btn">返回项目测算中心</Link>
          </div>
        </div>

        {searchParams?.undone === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>已撤销该导入批次，删除成本明细 {searchParams.deleted || 0} 行。</div> : null}
        {searchParams?.locked === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>当前版本已锁定，不能撤销导入批次。</div> : null}
        {searchParams?.missing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9' }}>未找到该导入批次。</div> : null}

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>当前版本</h2>
          <div className="meta" style={{ marginTop: 8 }}>
            {version ? `${version.stage || '未设阶段'}｜${version.name}｜${locked ? '已锁定' : '可编辑'}` : '暂无版本'}
          </div>
        </section>

        <section className="card">
          <h2>导入批次列表</h2>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', minWidth: 1160, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['时间', '文件', '模式', '状态', '导入行数', '当前关联行', '含税合计', '不含税合计', '税额', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.createdAt.toLocaleString('zh-CN')}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                      <Link href={`/projects/${params.id}/import-batches/${batch.id}`}>{batch.fileName}</Link>
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{modeText(batch.importMode)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{statusText(batch.status)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch.rowCount}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{batch._count.costLines}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(batch.taxInclusiveTotal)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(batch.taxExclusiveTotal)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(batch.taxAmountTotal)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link href={`/projects/${params.id}/import-batches/${batch.id}`} className="btn">详情</Link>
                        {batch.status === 'active' && !locked ? (
                          <form action={`/api/projects/${params.id}/import-batches/${batch.id}/undo`} method="post">
                            <button className="btn" style={{ borderColor: '#ffc9c9' }}>撤销</button>
                          </form>
                        ) : <span className="meta">不可撤销</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!batches.length ? (
                  <tr><td colSpan={10} style={{ padding: 18, color: 'var(--muted)' }}>暂无导入批次。</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
