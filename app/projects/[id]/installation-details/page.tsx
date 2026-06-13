import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function text(row: any, key: string) {
  const value = row[key];
  return value === null || value === undefined ? '' : String(value);
}

async function ensurePresetRows(projectId: string) {
  const count = await prisma.costDictionaryRow.count({ where: { projectId } });
  if (count > 0) return;
  const rows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId }));
  if (rows.length) await prisma.costDictionaryRow.createMany({ data: rows });
}

export default async function InstallationDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  await ensurePresetRows(project.id);
  const version = await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' } });

  const dictionaryRows = await prisma.costDictionaryRow.findMany({
    where: {
      projectId: params.id,
      OR: [
        { sourceTable: { contains: '安装' } },
        { secondSubject: { contains: '安装' } },
        { thirdSubject: { contains: '安装' } },
        { detailSubject: { contains: '安装' } },
        { detailSubject: { contains: '管线' } }
      ]
    },
    orderBy: { rowIndex: 'asc' }
  });

  const costs = version ? await prisma.costLine.findMany({
    where: { projectVersionId: version.id, professionalGroup: '安装明细' },
    include: { costSubject: true },
    orderBy: { sortOrder: 'asc' }
  }) : [];

  const totalInclusive = costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
  const totalExclusive = costs.reduce((sum, row) => sum + Number(row.taxExclusiveAmount || 0), 0);
  const totalTax = costs.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1360 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">安装明细表</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">给排水、强电、弱电、消防、暖通、充电桩安装等从成本科目词典选取。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/equipment-details`} className="btn btn-primary">设备明细表</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>安装明细已保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">安装含税合计</div><div className="stat-value">{fmt(totalInclusive)}</div></div>
          <div className="stat"><div className="stat-label">不含税金额</div><div className="stat-value">{fmt(totalExclusive)}</div></div>
          <div className="stat"><div className="stat-label">税额</div><div className="stat-value">{fmt(totalTax)}</div></div>
          <div className="stat"><div className="stat-label">安装词典科目</div><div className="stat-value">{dictionaryRows.length}</div></div>
        </div>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>新增安装工程</h2>
          <p className="meta">充电桩安装只记录管线、桥架、配电接入、安装调试；设备本体进入设备明细表。</p>
          <form action={`/api/projects/${project.id}/professional-costs`} method="post">
            <input type="hidden" name="professionalGroup" value="安装明细" />
            <input type="hidden" name="returnPath" value="installation-details" />
            <div className="form-grid">
              <label>
                成本科目
                <select name="dictionaryRowId" required>
                  <option value="">请选择安装科目</option>
                  {dictionaryRows.map((row) => {
                    const name = [row.firstSubject, row.secondSubject, row.thirdSubject, row.detailSubject].filter(Boolean).join(' / ');
                    return <option key={row.id} value={row.id}>{row.costCode || '-'}｜{name}</option>;
                  })}
                </select>
              </label>
              <label>明细名称<input name="detailName" placeholder="如：充电桩管线安装、强电工程" /></label>
              <label>区域/业态归属<input name="regionOrProductType" defaultValue="项目整体共用" /></label>
              <label>测算依据<input name="measureBasis" placeholder="建筑面积、充电桩数量、预留管线数量" /></label>
              <label>工程量<input name="quantity" type="number" step="0.01" defaultValue="1" /></label>
              <label>单位<input name="unit" placeholder="㎡ / m / 个 / 项" /></label>
              <label>含税单价<input name="taxInclusiveUnitPrice" type="number" step="0.01" defaultValue="0" /></label>
              <label>税率<input name="taxRate" type="number" step="0.01" defaultValue="0.09" /></label>
              <label>分摊方式<input name="allocationMethod" defaultValue="建筑面积分摊" /></label>
              <label>备注<input name="remark" /></label>
            </div>
            <div className="actions"><button className="btn btn-primary">保存安装明细</button></div>
          </form>
        </section>

        <section className="card">
          <h2>安装明细</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['成本编码', '明细名称', '归属', '测算依据', '工程量', '单位', '含税单价', '含税金额', '不含税金额', '税额', '分摊方式'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {costs.length === 0 ? <tr><td colSpan={11} style={{ padding: 12, color: 'var(--muted)' }}>暂无安装明细。</td></tr> : costs.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.costSubject.code}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.detailName}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.regionOrProductType}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.measureBasis}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.quantity)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.unit}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxInclusiveUnitPrice)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxInclusiveAmount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxExclusiveAmount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{fmt(row.taxAmount)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{row.allocationMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
