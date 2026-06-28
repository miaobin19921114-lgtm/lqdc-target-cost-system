import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function percent(value: unknown) {
  return `${(Number(value || 0) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export default async function ParkingConfigPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  const totalParking = Number(project.parkingCount || 0);
  const pileCount = Number(project.chargingPileCount || 0);
  const fastPile = Number(project.fastChargingPileCount || 0);
  const slowPile = Number(project.slowChargingPileCount || 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1280 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">项目基础 / 车位配置</p>
            <h1 className="title">车位配置表</h1>
            <p className="subtitle">充电桩不作为业态，作为车位和机电配置单独维护，后续可联动成本测算和车位收入。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/products`} className="btn btn-primary">业态面积表</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回项目测算中心</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb' }}>车位配置已保存。</div> : null}

        <div className="summary-strip">
          <div className="stat"><div className="stat-label">总车位数</div><div className="stat-value">{fmt(totalParking)}</div></div>
          <div className="stat"><div className="stat-label">充电桩数量</div><div className="stat-value">{fmt(pileCount)}</div></div>
          <div className="stat"><div className="stat-label">快充 / 慢充</div><div className="stat-value">{fmt(fastPile)} / {fmt(slowPile)}</div></div>
          <div className="stat"><div className="stat-label">充电桩比例</div><div className="stat-value">{percent(project.chargingPileRatio)}</div></div>
        </div>

        <section className="form-card" style={{ maxWidth: '100%', marginBottom: 18 }}>
          <h2>车位与充电桩配置</h2>
          <form action={`/api/projects/${project.id}/parking`} method="post">
            <div className="form-grid">
              <label>地下产权车位<input name="undergroundPropertyParkingCount" type="number" step="1" defaultValue={Number(project.undergroundPropertyParkingCount || 0)} /></label>
              <label>地下使用权车位<input name="undergroundUseRightParkingCount" type="number" step="1" defaultValue={Number(project.undergroundUseRightParkingCount || 0)} /></label>
              <label>人防车位<input name="civilDefenseParkingCount" type="number" step="1" defaultValue={Number(project.civilDefenseParkingCount || 0)} /></label>
              <label>地上车位<input name="aboveGroundParkingCount" type="number" step="1" defaultValue={Number(project.aboveGroundParkingCount || 0)} /></label>
              <label>充电桩数量<input name="chargingPileCount" type="number" step="1" defaultValue={Number(project.chargingPileCount || 0)} /></label>
              <label>快充数量<input name="fastChargingPileCount" type="number" step="1" defaultValue={Number(project.fastChargingPileCount || 0)} /></label>
              <label>慢充数量<input name="slowChargingPileCount" type="number" step="1" defaultValue={Number(project.slowChargingPileCount || 0)} /></label>
              <label>预留管线数量<input name="reservedChargingPileCount" type="number" step="1" defaultValue={Number(project.reservedChargingPileCount || 0)} /></label>
              <label>配电容量 kVA<input name="parkingPowerCapacity" type="number" step="0.01" defaultValue={Number(project.parkingPowerCapacity || 0)} /></label>
              <label>备注<input name="parkingRemark" defaultValue={project.parkingRemark || ''} placeholder="配置依据、规划要求、车位售价口径等" /></label>
            </div>
            <div className="actions">
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="chargingIncludedInParkingPrice" type="checkbox" defaultChecked={project.chargingIncludedInParkingPrice} style={{ width: 'auto' }} />充电桩计入车位售价</label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input name="chargingSeparateCostMeasure" type="checkbox" defaultChecked={project.chargingSeparateCostMeasure} style={{ width: 'auto' }} />充电桩单独测算成本</label>
            </div>
            <div className="actions"><button className="btn btn-primary">保存车位配置</button></div>
          </form>
        </section>

        <section className="card">
          <h2>配置口径</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['总车位数', '系统按地下产权车位 + 地下使用权车位 + 人防车位 + 地上车位自动汇总。'],
                  ['充电桩比例', '系统按充电桩数量 / 总车位数自动计算。'],
                  ['预留管线', '只表示预留条件，不等同于已安装充电桩。'],
                  ['配电容量', '用于后续联动供配电工程、车位配置标准和成本测算。'],
                  ['成本口径', '充电桩建议单独进入机电专项或车位配置成本，不作为产品业态。']
                ].map(([name, desc]) => (
                  <tr key={name}>
                    <td style={{ width: 160, padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{desc}</td>
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
