import Link from 'next/link';

export const dynamic = 'force-dynamic';

type SheetPreview = {
  name: string;
  rows: number;
  columns: number;
  sample: string[];
};

function readPreview(value?: string) {
  if (!value) return [] as SheetPreview[];
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SheetPreview[];
  } catch {
    return [] as SheetPreview[];
  }
}

export default function ExportPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const preview = readPreview(searchParams?.preview);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1040 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Excel 导入导出</p>
            <h1 className="title">Excel 导入分步处理</h1>
            <p className="subtitle">当前支持两种模式：只预览 Excel 结构；或只导入项目概况。暂不写入业态和成本明细。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${params.id}`} className="btn btn-primary">返回工作台</Link>
            <a href={`/api/export?projectId=${params.id}`} className="btn">导出示例 Excel</a>
          </div>
        </div>

        {searchParams?.previewed === '1' ? (
          <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>
            Excel 已读取：{searchParams.file || '-'}，共识别 {preview.length} 个工作表。当前只是预览，没有写入项目数据。
          </div>
        ) : null}
        {searchParams?.overviewImported === '1' ? (
          <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>
            项目概况导入完成：更新 {searchParams.count || 0} 个字段。字段：{searchParams.fields || '-'}。未写入业态和成本明细。
          </div>
        ) : null}
        {searchParams?.uploaded === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>文件已接收：{searchParams.file || '-'}</div> : null}
        {searchParams?.locked ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>当前版本已锁定，不能导入覆盖数据。请先到版本管理解锁，或复制新版本后导入。</div> : null}
        {searchParams?.missingFile ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>请选择需要导入的 Excel 文件。</div> : null}
        {searchParams?.importError ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9' }}>Excel 解析失败：{searchParams.importError}</div> : null}

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>上传 Excel</h2>
          <p className="meta">同一个入口，先上传文件，再选择“只预览”或“只导入项目概况”。项目概况会写入项目基础数据，业态和成本不会被修改。</p>
          <form action={`/api/projects/${params.id}/import-excel`} method="post" encType="multipart/form-data" style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <input name="file" type="file" accept=".xlsx" required style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: '#fff' }} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button name="mode" value="preview" className="btn" style={{ width: 180 }}>只预览结构</button>
              <button name="mode" value="overview" className="btn btn-primary" style={{ width: 180 }}>只导入项目概况</button>
            </div>
          </form>
        </section>

        {preview.length ? (
          <section className="card" style={{ marginBottom: 16 }}>
            <h2>工作表预览</h2>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['序号', '工作表', '行数', '列数', '首行/表头预览'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((sheet, index) => (
                    <tr key={`${sheet.name}-${index}`}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{index + 1}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{sheet.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheet.rows}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheet.columns}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{sheet.sample.filter(Boolean).join('｜') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="card">
          <h2>当前项目概况识别字段</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <div><b>基础：</b><span className="meta">项目名称、城市、区县、占地面积、红线面积、容积率。</span></div>
            <div><b>面积：</b><span className="meta">总建筑面积、计容面积、地上面积、地下面积、可售面积、不可售面积。</span></div>
            <div><b>车位和工程量：</b><span className="meta">车位、充电桩、周界、硬景、软景、景观、楼栋、单元、户数、电梯、层数、层高。</span></div>
            <div><b>下一步：</b><span className="meta">解析业态指标，写入当前启用版本。</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
