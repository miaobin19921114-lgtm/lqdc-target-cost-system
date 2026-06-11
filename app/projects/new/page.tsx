export default function NewProjectPage() {
  return (
    <main className="min-h-screen p-6">
      <form action="/api/projects" method="post" className="max-w-3xl mx-auto bg-white border rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">新建项目</h1>
        <div className="grid md:grid-cols-2 gap-4">
          <input name="name" placeholder="项目名称" required />
          <input name="city" placeholder="城市" defaultValue="成都" />
          <input name="district" placeholder="区域" defaultValue="龙泉驿" />
          <input name="landArea" placeholder="土地面积㎡" type="number" step="0.01" />
          <input name="plotRatio" placeholder="容积率" type="number" step="0.01" />
          <input name="totalBuildingArea" placeholder="总建筑面积㎡" type="number" step="0.01" />
          <input name="saleableArea" placeholder="可售面积㎡" type="number" step="0.01" />
          <input name="parkingCount" placeholder="车位数量" type="number" />
        </div>
        <textarea name="remark" placeholder="备注" className="w-full" />
        <button className="rounded-lg bg-brand text-white px-5 py-3">保存项目</button>
      </form>
    </main>
  );
}
