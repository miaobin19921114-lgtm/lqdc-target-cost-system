import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateActiveVersion } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

function short(value?: string | null) {
  return value || '-';
}

export default async function CostMappingPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  const version = await getOrCreateActiveVersion(params.id);
  const mappings = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, sourceTable: 'Excel科目映射' },
    orderBy: { updatedAt: 'desc' }
  });
  const subjects = await prisma.costSubject.findMany({
    where: { enabled: true },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
    take: 500
  });
  const recentLines = version
    ? await prisma.costLine.findMany({
        where: { projectVersionId: version.id, regionOrProductType: 'Excel导入' },
        include: { costSubject: true },
        orderBy: { sortOrder: 'asc' },
        take: 80
      })
    : [];

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1180 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">成本科目映射</p>
            <h1 className="title">{project?.name || '项目'} · Excel 科目映射</h1>
            <p className="subtitle">把 Excel 里的科目名称绑定到系统标准成本科目。下次导入会优先按这里的映射归集。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${params.id}/export`} className="btn btn-primary">返回 Excel 导入</Link>
            <Link href={`/projects/${params.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>映射已保存。下次导入成本明细会优先使用该映射。</div> : null}
        {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>映射已删除。</div> : null}
        {searchParams?.missing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>请填写 Excel 科目，并选择系统标准科目。</div> : null}
        {searchParams?.targetMissing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9' }}>未找到选择的系统标准科目。</div> : null}

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>新增 / 更新映射</h2>
          <form action={`/api/projects/${params.id}/cost-mapping`} method="post" style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <label>
              <div className="meta">Excel 科目名称 / 科目路径 / 科目编码</div>
              <input name="sourceText" placeholder="例如：主体建安 / 主体结构 / 土建工程费" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }} />
            </label>
            <label>
              <div className="meta">映射到系统标准科目</div>
              <select name="targetCode" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <option value="">请选择标准科目</option>
                {subjects.map((subject) => (
                  <option key={subject.code} value={subject.code}>{subject.code}｜{subject.fullPath || subject.name}</option>
                ))}
              </select>
            </label>
            <label>
              <div className="meta">备注</div>
              <input name="remark" placeholder="可选" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }} />
            </label>
            <div><button className="btn btn-primary">保存映射</button></div>
          </form>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>已保存映射</h2>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Excel 科目', '系统标准科目编码', '备注', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{short(mapping.detailSubject)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(mapping.targetMappingCode)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(mapping.remark)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                      <form action={`/api/projects/${params.id}/cost-mapping`} method="post">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="mappingId" value={mapping.id} />
                        <button className="btn" style={{ borderColor: '#ffc9c9' }}>删除</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!mappings.length ? <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>暂无映射。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>最近 Excel 导入科目参考</h2>
          <p className="meta">可以复制这些科目名称或路径，填到上面的“Excel 科目名称”。</p>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['工作表/分组', '当前明细科目', '当前系统科目', '科目路径'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {recentLines.map((line) => (
                  <tr key={line.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(line.professionalGroup)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{line.detailName}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.costSubject.code}｜{line.costSubject.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(line.description)}</td>
                  </tr>
                ))}
                {!recentLines.length ? <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>暂无 Excel 导入科目。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
