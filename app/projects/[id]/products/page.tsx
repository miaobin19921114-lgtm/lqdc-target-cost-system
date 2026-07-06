import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getProductTypeImpact } from '@/lib/product-type-service';
import { activeVersionOrder, activeVersionWhere, isVersionLocked } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const presetGroups = [
  { category: '住宅类', names: ['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '中式合院'] },
  { category: '商业商办', names: ['底商', '独立商业', '商业街', '商业综合体', '办公', '公寓/LOFT', '酒店', '会所'] },
  { category: '车位储藏', names: ['地下产权车位', '地下使用权车位', '地上车位', '人防车位', '储藏室', '其他可售'] },
  { category: '配套用房', names: ['物业用房', '社区用房', '养老用房', '托育用房', '文化活动用房', '幼儿园', '公厕', '门卫', '设备用房'] },
  { category: '地下空间', names: ['高层主楼地下室', '洋房主楼地下室', '别墅地下室', '商业地下室', '非主楼纯地库', '人防地下室'] },
  { category: '专项区域', names: ['示范区', '售楼部', '样板间', '私家庭院', '下沉庭院', '水系', '游泳池'] }
];

const presetMeta = new Map<string, { category: string; rank: number }>();
presetGroups.forEach((group, groupIndex) => {
  group.names.forEach((name, itemIndex) => {
    presetMeta.set(name, { category: group.category, rank: groupIndex * 100 + itemIndex });
  });
});

async function getVersion(project: { id: string; activeVersionId?: string | null }) {
  return prisma.projectVersion.findFirst({
    where: activeVersionWhere(project),
    orderBy: activeVersionOrder(project),
    include: { products: { include: { _count: { select: { revenues: true, costs: true } } } } }
  });
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getCategory(name: string, remark?: string | null) {
  if (presetMeta.has(name)) return presetMeta.get(name)?.category || '其他';
  if (remark?.includes('模板业态｜')) return remark.split('模板业态｜')[1] || '其他';
  return '其他';
}

function getRank(name: string) {
  return presetMeta.get(name)?.rank ?? 9999;
}

export default async function ProductTypesPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string; preset?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await getVersion(project);

  const products = [...(version?.products || [])].sort((a, b) => getRank(a.name) - getRank(b.name) || a.name.localeCompare(b.name));
  const locked = version ? isVersionLocked(version) : false;
  const impactEntries = version ? await Promise.all(products.map(async (item) => [item.id, await getProductTypeImpact(version.id, item.id)] as const)) : [];
  const impactMap = new Map(impactEntries);
  const totalBuildingArea = products.reduce((sum, item) => sum + Number(item.buildingArea || 0), 0);
  const totalSaleableArea = products.reduce((sum, item) => sum + Number(item.saleableArea || 0), 0);
  const totalCapacityArea = products.reduce((sum, item) => sum + Number(item.capacityArea || 0), 0);
  const totalRevenue = products.reduce((sum, item) => sum + Number(item.saleableArea || 0) * Number(item.salePrice || 0), 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">业态面积 / 产品构成</p>
            <h1 className="title">{project.name}</h1>
            <p className="subtitle">这是业态面积表，不是项目概况表。充电桩不作为业态，在车位配置或机电专项中维护。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <form action={`/api/projects/${project.id}/products/presets`} method="post">
              <button className="btn btn-primary">生成模板业态</button>
            </form>
            <Link href={`/projects/${project.id}/product-maintenance`} className="btn btn-primary">业态增减维护</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>业态已保存。同名业态会更新，不会重复创建。</div> : null}
        {searchParams?.preset === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>模板业态已生成，已存在的业态不会重复创建。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">业态数量</div><div className="stat-value">{products.length}</div></div>
          <div className="stat"><div className="stat-label">建筑面积合计</div><div className="stat-value">{money(totalBuildingArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">可售面积合计</div><div className="stat-value">{money(totalSaleableArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">计容面积合计</div><div className="stat-value">{money(totalCapacityArea)}㎡</div></div>
          <div className="stat"><div className="stat-label">含税货值估算</div><div className="stat-value">{money(totalRevenue)}元</div></div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <h2>模板业态范围</h2>
          <p className="meta">充电桩属于车位配置 / 机电专项，不计入业态库。</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
            {presetGroups.map((group) => (
              <div key={group.category} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                <b>{group.category}</b>
                <p className="meta" style={{ marginTop: 6 }}>{group.names.join('、')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>新增 / 更新业态面积</h2>
          <form action={`/api/projects/${project.id}/products`} method="post">
            <div className="form-grid">
              <label>业态名称
                <select name="name" required defaultValue="">
                  <option value="" disabled>请选择固定业态名称</option>
                  {presetGroups.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.names.map((name) => <option key={name} value={name}>{name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>建筑面积㎡<input name="buildingArea" type="number" step="0.01" /></label>
              <label>可售面积㎡<input name="saleableArea" type="number" step="0.01" /></label>
              <label>计容面积㎡<input name="capacityArea" type="number" step="0.01" /></label>
              <label>不可售面积㎡<input name="nonSaleableArea" type="number" step="0.01" /></label>
              <label>含税销售单价 元/㎡<input name="salePrice" type="number" step="0.01" /></label>
              <label>分摊权重<input name="allocationWeight" type="number" step="0.01" defaultValue="1" /></label>
              <label>备注<input name="remark" placeholder="面积口径、售价依据等" /></label>
            </div>
            <div className="actions">
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="isSaleable" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与销售</label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="participateAllocation" type="checkbox" defaultChecked style={{ width: 'auto' }} />参与成本分摊</label>
            </div>
            <div className="actions"><button className="btn btn-primary">保存 / 更新业态</button></div>
          </form>
        </section>

        <section className="card">
          <h2>产品 / 业态构成表</h2>
          <p className="meta">本页支持直接恢复停用业态；停用操作请进入“业态增减维护”，页面会按后端影响判断展示不可停用原因。</p>
          {products.length === 0 ? (
            <p className="meta">暂无业态。建议先点击“生成模板业态”，再录入面积和售价。</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1360 }}>
                <thead>
                  <tr>
                    {['分类', '业态', '建筑面积', '可售面积', '计容面积', '不可售面积', '销售单价', '货值估算', '销售', '分摊', '状态与原因', '操作'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => {
                    const revenue = Number(item.saleableArea || 0) * Number(item.salePrice || 0);
                    const impact = impactMap.get(item.id);
                    const canDisable = Boolean(impact?.canDisable);
                    const blockedReason = impact?.blockedReason || (item.isActive ? '暂无阻断原因。' : '当前业态已停用。');
                    return (
                      <tr key={item.id} style={item.isActive ? undefined : { background: '#fffaf0' }}>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{getCategory(item.name, item.remark)}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{item.name}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.buildingArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.saleableArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.capacityArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.nonSaleableArea)}㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(item.salePrice)}元/㎡</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{money(revenue)}元</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{item.isSaleable ? '参与' : '不参与'}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{item.participateAllocation ? '参与' : '不参与'}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', minWidth: 260 }}>
                          <b style={{ color: item.isActive ? '#2f9e44' : '#c92a2a' }}>{item.isActive ? '启用' : '停用'}</b>
                          <div className="meta">收入 {item._count.revenues} / 成本 {item._count.costs}</div>
                          <div className="meta" style={{ color: item.isActive && !canDisable ? '#c92a2a' : '#667085' }}>{item.isActive ? (canDisable ? '无业务数据，可在维护页停用。' : blockedReason) : '停用业态默认不参与当前测算展示。'}</div>
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', minWidth: 170 }}>
                          {item.isActive ? <Link className="btn" href={`/projects/${project.id}/product-maintenance`}>{canDisable ? '去停用' : '查看原因'}</Link> : <form action={`/api/projects/${project.id}/products/status`} method="post">
                            <input type="hidden" name="productId" value={item.id} />
                            <input type="hidden" name="action" value="restore" />
                            <input type="hidden" name="operationReason" value="业态产品页恢复启用" />
                            <button className="btn btn-primary" disabled={locked}>恢复启用</button>
                          </form>}
                        </td>
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
