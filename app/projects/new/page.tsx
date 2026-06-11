export default function NewProjectPage() {
  return (
    <main className="page">
      <form action="/api/projects" method="post" className="form-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">项目初始化</p>
            <h1 className="title">新建项目</h1>
            <p className="subtitle">先录入基础经济技术指标，后续版本会接入 V57 目标成本测算模板。</p>
          </div>
        </div>
        <div className="form-grid">
          <label>项目名称<input name="name" placeholder="如：龙泉140亩项目" required /></label>
          <label>城市<input name="city" placeholder="城市" defaultValue="成都" /></label>
          <label>区域<input name="district" placeholder="区域" defaultValue="龙泉驿" /></label>
          <label>土地面积㎡<input name="landArea" placeholder="土地面积㎡" type="number" step="0.01" /></label>
          <label>容积率<input name="plotRatio" placeholder="容积率" type="number" step="0.01" /></label>
          <label>总建筑面积㎡<input name="totalBuildingArea" placeholder="总建筑面积㎡" type="number" step="0.01" /></label>
          <label>可售面积㎡<input name="saleableArea" placeholder="可售面积㎡" type="number" step="0.01" /></label>
          <label>车位数量<input name="parkingCount" placeholder="车位数量" type="number" /></label>
        </div>
        <div style={{ marginTop: 14 }}>
          <label>备注<textarea name="remark" placeholder="项目定位、测算口径、版本说明等" /></label>
        </div>
        <div className="actions">
          <button className="btn btn-primary">保存项目</button>
          <a href="/projects" className="btn">返回列表</a>
        </div>
      </form>
    </main>
  );
}
