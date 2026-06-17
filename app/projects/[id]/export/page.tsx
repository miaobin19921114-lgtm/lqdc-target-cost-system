import Link from 'next/link';

export const dynamic = 'force-dynamic';

type SheetPreview = {
  name: string;
  rows: number;
  columns: number;
  sample: string[];
};

type CostPreviewRow = {
  sheet: string;
  row: number;
  code?: string;
  level1?: string;
  level2?: string;
  level3?: string;
  subject?: string;
  basis?: string;
  quantity?: string;
  unit?: string;
  price?: string;
  taxRate?: string;
  amount?: string;
};

function readBase64Json<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return fallback;
  }
}

export default function ExportPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const preview = readBase64Json<SheetPreview[]>(searchParams?.preview, []);
  const costPreview = readBase64Json<CostPreviewRow[]>(searchParams?.costPreview, []);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1180 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Excel 导入导出</p>
            <h1 className="title">Excel 导入分步处理</h1>
            <p className="subtitle">当前支持：预览结构、导入项目概况、导入业态指标、预览成本明细。成本明细预览不写数据库。</p>
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
        {searchParams?.productsImported === '1' ? (
          <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>
            业态指标导入完成：更新 {searchParams.count || 0} 行，已写入当前启用版本。未写入成本明细。
          </div>
        ) : null}
        {searchParams?.costPreviewed === '1' ? (
          <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>
            成本明细预览完成：识别 {searchParams.count || 0} 行。当前只是预览，没有写入成本明细。
          </div>
        ) : null}
        {searchParams?.uploaded === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>文件已接收：{searchParams.file || '-'}</div> : null}
        {searchParams?.locked ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>当前版本已锁定，不能导入覆盖数据。请先到版本管理解锁，或复制新版本后导入。</div> : null}
        {searchParams?.missingFile ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>请选择需要导入的 Excel 文件。</div> : null}
        {searchParams?.importError ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9' }}>Excel 解析失败：{searchParams.importError}</div> : null}

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>上传 Excel</h2>
          <p className="meta">同一个入口，选择不同按钮执行不同导入模式。成本明细目前只预览，不写入数据库。</p>
          <form action={`/api/projects/${params.id}/import-excel`} method="post" encType="multipart/form-data" style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <input name="file" type="file" accept=".xlsx" required style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: '#fff' }} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button name="mode" value="preview" className="btn" style={{ width: 180 }}>只预览结构</button>
              <button name="mode" value="overview" className="btn" style={{ width: 180 }}>只导入项目概况</button>
              <button name="mode" value="products" className="btn" style={{ width: 180 }}>只导入业态指标</button>
              <button name="mode" value="cost-preview" className="btn btn-primary" style={{ width: 180 }}>预览成本明细</button>
            </div>
          </form>
        </section>

        {costPreview.length ? (
          <section className="card" style={{ marginBottom: 16 }}>
            <h2>成本明细预览</h2>
            <p className="meta">最多展示前 30 行识别结果。确认字段识别正确后，下一步再开启正式导入。</p>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['工作表', '行号', '编码', '一级', '二级', '三级', '明细科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
                </thead>
                <tbody>
                  {costPreview.map((row, index) => (
                    <tr key={`${row.sheet}-${row.row}-${index}`}>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.sheet}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.row}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.code || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.level1 || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.level2 || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.level3 || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{row.subject || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.basis || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.quantity || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.unit || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.price || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.taxRate || '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.amount || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

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
          <h2>当前识别字段</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <div><b>项目概况：</b><span className="meta">项目名称、城市、区县、占地、红线、容积率、建面、车位、充电桩、景观、楼栋、单元等。</span></div>
            <div><b>业态指标：</b><span className="meta">业态名称、建筑面积、计容面积、可售面积、不可售面积、含税销售单价、备注。</span></div>
            <div><b>成本预览：</b><span className="meta">成本编码、一级/二级/三级科目、明细科目、测算依据、工程量、单位、含税单价、税率、含税金额。</span></div>
            <div><b>下一步：</b><span className="meta">确认成本预览准确后，再开启成本明细正式导入。</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
