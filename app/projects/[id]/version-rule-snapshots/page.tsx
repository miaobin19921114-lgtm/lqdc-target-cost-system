import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SnapshotSummary = {
  versionId: string;
  versionName: string;
  versionStage: string | null;
  versionStatus: string;
  snapshotId: string | null;
  snapshotName: string | null;
  snapshotStatus: string | null;
  isActive: boolean | null;
  subjectCount: number;
  ruleCount: number;
  enabledRuleCount: number;
};

async function loadRows(projectId: string) {
  try {
    return await prisma.$queryRawUnsafe<SnapshotSummary[]>(`
      SELECT
        pv."id" AS "versionId",
        pv."name" AS "versionName",
        pv."stage" AS "versionStage",
        pv."status" AS "versionStatus",
        vrs."id" AS "snapshotId",
        vrs."snapshotName" AS "snapshotName",
        vrs."snapshotStatus" AS "snapshotStatus",
        vrs."isActive" AS "isActive",
        COALESCE(subjects."count", 0)::int AS "subjectCount",
        COALESCE(rules."count", 0)::int AS "ruleCount",
        COALESCE(rules."enabledCount", 0)::int AS "enabledRuleCount"
      FROM "ProjectVersion" pv
      LEFT JOIN "VersionRuleSnapshot" vrs ON vrs."versionId" = pv."id"
      LEFT JOIN (
        SELECT "snapshotId", COUNT(*) AS "count"
        FROM "VersionRuleSubjectSnapshot"
        GROUP BY "snapshotId"
      ) subjects ON subjects."snapshotId" = vrs."id"
      LEFT JOIN (
        SELECT "snapshotId", COUNT(*) AS "count", COUNT(*) FILTER (WHERE "isEnabled" = TRUE) AS "enabledCount"
        FROM "VersionUnifiedRuleSnapshot"
        GROUP BY "snapshotId"
      ) rules ON rules."snapshotId" = vrs."id"
      WHERE pv."projectId" = $1
      ORDER BY pv."createdAt" ASC
    `, projectId);
  } catch {
    return [];
  }
}

function yesNo(value: boolean | null) {
  return value ? '是' : '否';
}

function short(value?: string | null) {
  return value || '-';
}

export default async function VersionRuleSnapshotsPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const rows = await loadRows(project.id);
  const versionCount = rows.length;
  const snapshotCount = rows.filter((row) => row.snapshotId).length;
  const totalRules = rows.reduce((sum, row) => sum + row.ruleCount, 0);
  const enabledRules = rows.reduce((sum, row) => sum + row.enabledRuleCount, 0);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1400 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">版本规则</p>
        <h1 className="title">{project.name} · 版本规则快照</h1>
        <p className="subtitle">版本规则快照从项目规则快照复制而来。后续投前版、方案版、目标版、动态版和结算版可以各自调整规则。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/project-rule-snapshot`} className="btn btn-primary">项目规则快照</Link>
        <Link href={`/projects/${project.id}/versions`} className="btn">版本管理</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">测算版本</div><div className="stat-value">{versionCount}</div><div className="meta">当前项目</div></div>
      <div className="stat"><div className="stat-label">版本快照</div><div className="stat-value">{snapshotCount}</div><div className="meta">已复制规则</div></div>
      <div className="stat"><div className="stat-label">规则总数</div><div className="stat-value">{totalRules}</div><div className="meta">所有版本合计</div></div>
      <div className="stat"><div className="stat-label">启用规则</div><div className="stat-value">{enabledRules}</div><div className="meta">参与版本测算</div></div>
    </div>

    {!rows.length ? <section className="card" style={{ borderColor: '#ffd8a8', background: '#fff9db' }}>
      <b>暂无测算版本</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>请先进入版本管理创建测算版本。</p>
    </section> : null}

    <section className="card">
      <h2 style={{ marginTop: 0 }}>版本快照清单</h2>
      <p className="meta">这里显示每个版本是否已经拥有独立规则快照。以后版本规则编辑会修改这些快照，不会影响项目规则快照和模板母版。</p>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
          <thead><tr style={{ background: '#f1f5f9' }}>
            {['版本名称', '阶段', '版本状态', '快照名称', '快照状态', '是否启用', '科目数', '规则数', '启用规则'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{head}</th>)}
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.versionId}>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}><b>{row.versionName}</b></td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.versionStage)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.versionStatus}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.snapshotName)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{short(row.snapshotStatus)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{yesNo(row.isActive)}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.subjectCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.ruleCount}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #edf2f7' }}>{row.enabledRuleCount}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div></main>;
}
