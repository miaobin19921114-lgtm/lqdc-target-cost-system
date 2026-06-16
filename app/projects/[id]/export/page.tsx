import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ExportPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">Excel 导入导出</p>
            <h1 className="title">导入当前项目测算数据</h1>
            <p className="subtitle">第一阶段支持从 Excel 自动识别“项目概况 / 主要经济技术指标”和“业态指标”。成本明细解析下一轮继续增强。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${params.id}`} className="btn btn-primary">返回工作台</Link>
            <a href={`/api/export?projectId=${params.id}`} className="btn">导出示例 Excel</a>
          </div>
        </div>

        {searchParams?.imported === '1' ? (
          <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>
            导入完成：项目概况更新 {searchParams.overview || 0} 项，业态指标更新 {searchParams.products || 0} 行。上传文件：{searchParams.file || '-'}
          </div>
        ) : null}
        {searchParams?.locked ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>当前版本已锁定，不能导入覆盖数据。请先到版本管理解锁，或复制新版本后导入。</div> : null}
        {searchParams?.missingFile ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>请选择需要导入的 Excel 文件。</div> : null}

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>上传 Excel</h2>
          <p className="meta">支持 .xlsx 文件。系统会优先识别名称包含“概况、指标、业态、产品”的工作表。建议先用当前成本测算模板导入。</p>
          <form action={`/api/projects/${params.id}/import-excel`} method="post" encType="multipart/form-data" style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <input name="file" type="file" accept=".xlsx" required style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: '#fff' }} />
            <button className="btn btn-primary" style={{ width: 180 }}>上传并解析</button>
          </form>
        </section>

        <section className="card">
          <h2>当前识别规则</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <div><b>项目概况：</b><span className="meta">识别项目名称、城市、区县、占地面积、总建筑面积、计容建筑面积、地下建筑面积、可售面积、车位、充电桩、周界、硬景、软景、楼栋、单元等字段。</span></div>
            <div><b>业态指标：</b><span className="meta">识别业态名称、建筑面积、计容面积、可售面积、含税销售单价，并写入当前启用版本。</span></div>
            <div><b>锁定保护：</b><span className="meta">当前版本锁定后，导入不会覆盖原数据。</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
