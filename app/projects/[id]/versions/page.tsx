import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const stages = ['投拓阶段', '定位阶段', '方案阶段', '扩初阶段', '施工图阶段', '招采阶段', '动态成本阶段', '结算阶段'];

function fmt(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusText(status: string) {
  if (status === 'locked') return '已锁定';
  if (status === 'final') return '定稿';
  return '草稿';
}

export default async function ProjectVersionsPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const versions = await prisma.projectVersion.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { products: true, costRules: true, costs: true, taxes: true }
  });
  const activeId = project.activeVersionId || versions[0]?.id || '';
  const activeVersion = versions.find((item) => item.id === activeId);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1240 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">版本管理</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">当前版本：{activeVersion ? `${activeVersion.stage || '未分阶段'}｜${activeVersion.name}｜${statusText(activeVersion.status)}` : '暂无版本'}。锁定版本后，收入、业态和目标成本明细禁止继续编辑。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}`} className="btn btn-primary">返回工作台</Link>
            <Link href="/projects" className="btn">项目列表</Link>
          </div>
        </div>

        {searchParams?.created ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>空白版本已创建，并已设为当前版本。</div> : null}
        {searchParams?.cloned ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>版本已复制，并已设为当前版本。</div> : null}
        {searchParams?.active ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>当前版本已切换。</div> : null}
        {searchParams?.locked ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>版本已锁定，测算明细将禁止编辑。</div> : null}
        {searchParams?.unlocked ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>版本已解锁，可继续编辑。</div> : null}
        {searchParams?.deleted ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>版本已删除。</div> : null}
        {searchParams?.cannotDelete ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>至少保留一个版本，不能删除最后一个版本。</div> : null}
        {searchParams?.lockedDelete ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>锁定版本不能直接删除，请先解锁。</div> : null}

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>新增版本</h2>
          <p className="meta">建议从当前版本复制，保留业态、科目规则、税率和已有测算口径，再在新阶段里深化。</p>
          <form action={`/api/projects/${project.id}/versions`} method="post" style={{ display: 'grid', gridTemplateColumns: '1.2fr 180px 1fr 150px 160px', gap: 10, alignItems: 'end' }}>
            <input type="hidden" name="action" value="copy" />
            <label>版本名称<input name="name" placeholder="如：投拓测算版、方案测算版" required /></label>
            <label>阶段<select name="stage" defaultValue="投拓阶段">{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
            <label>复制来源<select name="sourceVersionId" defaultValue={activeId}><option value="">不复制，创建空白版本</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.id === activeId ? '当前｜' : ''}{version.stage}｜{version.name}</option>)}</select></label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', height: 38 }}><input name="copyCosts" type="checkbox" />复制成本明细</label>
            <button className="btn btn-primary">创建并设为当前</button>
          </form>
        </section>

        <section className="card">
          <h2>已有版本</h2>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1120, fontSize: 13 }}>
              <thead>
                <tr>{['当前', '阶段', '版本名称', '状态', '业态', '科目规则', '成本明细', '含税成本', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {versions.map((version) => {
                  const cost = version.costs.reduce((sum, row) => sum + Number(row.taxInclusiveAmount || 0), 0);
                  const locked = version.status === 'locked' || version.status === 'final';
                  return (
                    <tr key={version.id} style={{ background: version.id === activeId ? '#f0fbfc' : '#fff' }}>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 900 }}>{version.id === activeId ? '当前' : '-'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{version.stage}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{version.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6', color: locked ? '#c92a2a' : '#2f9e44', fontWeight: 900 }}>{statusText(version.status)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{version.products.length}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{version.costRules.length}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{version.costs.length}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>{fmt(cost)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eef2f6' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {version.id !== activeId ? (
                            <form action={`/api/projects/${project.id}/versions`} method="post">
                              <input type="hidden" name="action" value="set-active" />
                              <input type="hidden" name="versionId" value={version.id} />
                              <button className="btn btn-primary">设为当前</button>
                            </form>
                          ) : null}
                          <form action={`/api/projects/${project.id}/versions`} method="post">
                            <input type="hidden" name="action" value="copy" />
                            <input type="hidden" name="sourceVersionId" value={version.id} />
                            <input type="hidden" name="name" value={`${version.name}副本`} />
                            <input type="hidden" name="stage" value={version.stage || ''} />
                            <button className="btn">复制</button>
                            <label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 12 }}><input name="copyCosts" type="checkbox" />含成本</label>
                          </form>
                          <form action={`/api/projects/${project.id}/versions`} method="post">
                            <input type="hidden" name="action" value={locked ? 'unlock' : 'lock'} />
                            <input type="hidden" name="versionId" value={version.id} />
                            <button className="btn" style={{ color: locked ? '#0b7285' : '#c92a2a' }}>{locked ? '解锁' : '锁定'}</button>
                          </form>
                          <form action={`/api/projects/${project.id}/versions`} method="post">
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="versionId" value={version.id} />
                            <button className="btn" style={{ color: '#c92a2a' }}>删除</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
