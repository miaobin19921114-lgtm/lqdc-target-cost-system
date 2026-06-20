export function suggestQuantityFromOverview(project: any, row: any) {
  const text = [row.measureBasis, row.detailSubject, row.thirdSubject, row.secondSubject, row.firstSubject].filter(Boolean).join(' ');
  const pick = (value: unknown, unit?: string, source?: string) => ({ quantity: Number(value || 0), unit: unit || row.unit || '㎡', source });

  if (/出入口|大门|门岗/.test(text)) return pick(project.gateCount || project.formalGateCount, '个', '概况表：出入口数量');
  if (/临时出入口/.test(text)) return pick(project.temporaryGateCount, '个', '概况表：临时出入口数量');
  if (/正式出入口/.test(text)) return pick(project.formalGateCount, '个', '概况表：正式出入口数量');
  if (/周界|围墙|围挡/.test(text)) return pick(project.sitePerimeter, 'm', '概况表：周界长度');
  if (/临设|临建|临水|临电/.test(text)) return pick(project.temporaryFacilityArea, '㎡', '概况表：临设面积');
  if (/场平|三通一平|土方平整/.test(text)) return pick(project.siteLevelingArea || project.landArea, '㎡', '概况表：场平面积');

  if (/水景|水系/.test(text)) return pick(project.waterFeatureArea, '㎡', '概况表：水景面积');
  if (/儿童|活动场地/.test(text)) return pick(project.childrenActivityArea, '㎡', '概况表：儿童活动场地面积');
  if (/架空层/.test(text)) return pick(project.elevatedFloorLandscapeArea, '㎡', '概况表：架空层景观面积');
  if (/硬景|铺装|透水铺装/.test(text)) return pick(project.hardscapeArea, '㎡', '概况表：硬景面积');
  if (/软景|下凹绿地|雨水花园/.test(text)) return pick(project.softscapeArea, '㎡', '概况表：软景面积');
  if (/绿化|绿地/.test(text)) return pick(project.greenArea || project.softscapeArea, '㎡', '概况表：绿地/软景面积');
  if (/井室数量|检查井|阀门井|水表井|电缆井|弱电井|井室|雨水口|消火栓|水泵接合器|调压箱|调压柜|化粪池|隔油池/.test(text)) return pick(0, row.unit || '个', '需按总图/专项数量输入');
  if (/管线长度|管沟长度|电缆长度|管道长度|长度/.test(text)) return pick(0, row.unit || 'm', '需按总图管线长度输入');
  if (/供电容量/.test(text)) return pick(project.parkingPowerCapacity, 'kVA', '概况表：车库/项目供电容量');
  if (/景观|园林|综合管网|室外管网|管线|海绵城市/.test(text)) return pick(project.landscapeArea || project.redLineArea || project.landArea, '㎡', '概况表：景观面积/红线面积');
  if (/消防道路/.test(text)) return pick(project.fireRoadArea, '㎡', '概况表：消防道路面积');
  if (/沥青/.test(text)) return pick(project.asphaltRoadArea || project.roadArea, '㎡', '概况表：沥青/道路面积');
  if (/道路|总平|交安|标识/.test(text)) return pick(project.roadArea, '㎡', '概况表：道路面积');

  if (/地下车库|车库面积|纯地库|非主楼/.test(text)) return pick(project.basementParkingArea, '㎡', '概况表：地下车库面积');
  if (/主楼地下|主楼地下室/.test(text)) return pick(project.mainBuildingUndergroundArea, '㎡', '概况表：主楼地下室面积');
  if (/非人防/.test(text)) return pick(project.nonCivilDefenseArea, '㎡', '概况表：非人防面积');
  if (/人防/.test(text)) return pick(project.civilDefenseArea || project.undergroundArea, '㎡', '概况表：人防面积');
  if (/地下室|防火分区/.test(text)) return pick(project.undergroundArea, '㎡', '概况表：地下建筑面积');
  if (/售楼部|销售中心/.test(text)) return pick(project.salesOfficeArea, '㎡', '概况表：售楼部面积');
  if (/样板间/.test(text)) return pick(project.showFlatArea, '㎡', '概况表：样板间面积');
  if (/物业/.test(text)) return pick(project.propertyManagementArea, '㎡', '概况表：物业用房面积');
  if (/社区/.test(text)) return pick(project.communityServiceArea, '㎡', '概况表：社区用房面积');
  if (/大堂|入户大堂|首层大堂/.test(text)) return pick(project.lobbyArea, '㎡', '概况表：一楼入户大堂面积');
  if (/公区|走道|电梯厅/.test(text)) return pick(project.publicArea, '㎡', '概况表：公区面积');

  if (/桩基|桩基础/.test(text)) return pick(project.pileFoundationArea || project.baseArea, '㎡', '概况表：桩基面积');
  if (/基底|占地|基础底板/.test(text)) return pick(project.baseArea, '㎡', '概况表：基底/占地面积');
  if (/土方|挖方|填方/.test(text)) return pick(project.earthworkVolume, 'm³', '概况表：土方量');
  if (/防水/.test(text)) return pick(project.waterproofArea, '㎡', '概况表：防水面积');
  if (/屋面/.test(text)) return pick(project.roofArea, '㎡', '概况表：屋面面积');
  if (/保温/.test(text)) return pick(project.insulationArea, '㎡', '概况表：保温面积');
  if (/外墙|幕墙|立面/.test(text)) return pick(project.facadeArea, '㎡', '概况表：外墙面积');
  if (/门窗|窗/.test(text)) return pick(project.windowArea, '㎡', '概况表：门窗面积');
  if (/栏杆|栏板|扶手/.test(text)) return pick(project.railingLength, 'm', '概况表：栏杆长度');

  if (/配电房|变配电/.test(text)) return pick(project.powerRoomCount, '个', '概况表：配电房数量');
  if (/泵房|水泵房/.test(text)) return pick(project.pumpRoomCount, '个', '概况表：水泵房数量');
  if (/消防水池|水池/.test(text)) return pick(project.firePoolVolume, 'm³', '概况表：消防水池容积');
  if (/电梯/.test(text)) return pick(project.elevatorCount || project.unitCount, '台', '概况表：电梯数量');
  if (/单元/.test(text)) return pick(project.unitCount, '个', '概况表：单元数量');
  if (/户数|套数/.test(text)) return pick(project.householdCount, '户', '概况表：户数/套数');
  if (/车位/.test(text)) return pick(project.parkingCount, '个', '概况表：总车位数');
  if (/充电桩|充电/.test(text)) return pick(project.chargingPileCount, '个', '概况表：充电桩总数');
  if (/楼栋|栋数/.test(text)) return pick(project.buildingCount, '栋', '概况表：楼栋数量');
  if (/标准层/.test(text)) return pick(project.standardFloorArea, '㎡', '概况表：标准层面积');
  if (/地上|上部|主体|建筑面积/.test(text)) return pick(project.aboveGroundArea || project.totalBuildingArea, '㎡', '概况表：地上/总建筑面积');
  if (/可售/.test(text)) return pick(project.saleableArea, '㎡', '概况表：可售面积');
  if (/计容/.test(text)) return pick(project.capacityBuildingArea, '㎡', '概况表：计容建筑面积');
  if (/土地|用地|红线/.test(text)) return pick(project.redLineArea || project.landArea, '㎡', '概况表：用地红线/土地面积');

  return { quantity: 0, unit: row.unit || '', source: '' };
}
