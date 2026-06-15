export function suggestQuantityFromOverview(project: any, row: any) {
  const text = [row.measureBasis, row.detailSubject, row.thirdSubject, row.secondSubject, row.firstSubject].filter(Boolean).join(' ');
  const pick = (value: unknown, unit?: string, source?: string) => ({ quantity: Number(value || 0), unit: unit || row.unit || '㎡', source });

  if (/周界|围墙|围挡/.test(text)) return pick(project.sitePerimeter, 'm', '概况表：周界长度');
  if (/硬景|铺装/.test(text)) return pick(project.hardscapeArea, '㎡', '概况表：硬景面积');
  if (/软景/.test(text)) return pick(project.softscapeArea, '㎡', '概况表：软景面积');
  if (/绿化|绿地/.test(text)) return pick(project.greenArea || project.softscapeArea, '㎡', '概况表：绿地/软景面积');
  if (/景观|园林|综合管网|室外管网|管线/.test(text)) return pick(project.landscapeArea, '㎡', '概况表：景观面积');
  if (/道路|总平|交安|标识|沥青/.test(text)) return pick(project.roadArea, '㎡', '概况表：道路面积');
  if (/地下车库|车库面积|纯地库|非主楼/.test(text)) return pick(project.basementParkingArea, '㎡', '概况表：地下车库面积');
  if (/主楼地下|主楼地下室/.test(text)) return pick(project.mainBuildingUndergroundArea, '㎡', '概况表：主楼地下室面积');
  if (/地下室|人防|非人防|防火分区/.test(text)) return pick(project.undergroundArea, '㎡', '概况表：地下建筑面积');
  if (/大堂|入户大堂|首层大堂/.test(text)) return pick(project.lobbyArea, '㎡', '概况表：一楼入户大堂面积');
  if (/公区|走道|电梯厅/.test(text)) return pick(project.publicArea, '㎡', '概况表：公区面积');
  if (/单元/.test(text)) return pick(project.unitCount, '个', '概况表：单元数量');
  if (/电梯/.test(text)) return pick(project.unitCount, '台', '概况表：单元数量暂代电梯数量');
  if (/车位/.test(text)) return pick(project.parkingCount, '个', '概况表：总车位数');
  if (/充电桩|充电/.test(text)) return pick(project.chargingPileCount, '个', '概况表：充电桩总数');
  if (/楼栋|栋数/.test(text)) return pick(project.buildingCount, '栋', '概况表：楼栋数量');
  if (/标准层/.test(text)) return pick(project.standardFloorArea, '㎡', '概况表：标准层面积');
  if (/地上|上部|主体|建筑面积/.test(text)) return pick(project.aboveGroundArea || project.totalBuildingArea, '㎡', '概况表：地上/总建筑面积');
  if (/可售/.test(text)) return pick(project.saleableArea, '㎡', '概况表：可售面积');
  if (/计容/.test(text)) return pick(project.capacityBuildingArea, '㎡', '概况表：计容建筑面积');
  if (/土地|用地/.test(text)) return pick(project.landArea, '㎡', '概况表：土地面积');

  return { quantity: 0, unit: row.unit || '', source: '' };
}
