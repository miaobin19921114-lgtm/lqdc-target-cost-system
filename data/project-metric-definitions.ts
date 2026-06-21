export type ProjectMetricDefinitionSeed = {
  key: string;
  name: string;
  unit: string;
  metricGroup: string;
  scope: 'project' | 'product';
  description: string;
  sortOrder: number;
};

function metric(
  key: string,
  name: string,
  unit: string,
  metricGroup: string,
  description: string,
  sortOrder: number,
  scope: 'project' | 'product' = 'project'
): ProjectMetricDefinitionSeed {
  return { key, name, unit, metricGroup, scope, description, sortOrder };
}

export const v60ProjectMetricDefinitions: ProjectMetricDefinitionSeed[] = [
  metric('landArea', '土地面积', '㎡', '项目基础面积指标', '用于土地、场平、红线相关测算。', 101),
  metric('landAreaMu', '土地面积', '亩', '项目基础面积指标', '用于土地价款、亩单价类测算。', 102),
  metric('redLineArea', '用地红线面积', '㎡', '项目基础面积指标', '用于场平、临设、土方参考。', 103),
  metric('totalBuildingArea', '总建筑面积', '㎡', '项目基础面积指标', '用于建安单方、综合分摊。', 104),
  metric('capacityBuildingArea', '计容建筑面积', '㎡', '项目基础面积指标', '用于容积率、计容面积分摊及单方测算。', 105),
  metric('aboveGroundArea', '地上建筑面积', '㎡', '项目基础面积指标', '用于地上工程分摊。', 106),
  metric('undergroundArea', '地下建筑面积', '㎡', '项目基础面积指标', '用于地下室工程分摊。', 107),
  metric('saleableArea', '可售面积', '㎡', '项目基础面积指标', '用于可售单方、经营分摊。', 108),
  metric('nonSaleableArea', '不可售面积', '㎡', '项目基础面积指标', '用于配套、公区、不可售成本分摊。', 109),
  metric('baseArea', '基底面积', '㎡', '项目基础面积指标', '用于桩基、基础、基坑相关测算。', 110),
  metric('standardFloorArea', '标准层面积', '㎡', '项目基础面积指标', '用于主体、模板、标准层估算。', 111),

  metric('basementParkingArea', '地下车库面积', '㎡', '地下室/车位指标', '用于非主楼地下室、车库土建安装。', 201),
  metric('mainBuildingUndergroundArea', '主楼地下室面积', '㎡', '地下室/车位指标', '用于主楼地下室归属业态测算。', 202),
  metric('civilDefenseArea', '人防面积', '㎡', '地下室/车位指标', '用于人防工程、人防设备。', 203),
  metric('nonCivilDefenseArea', '非人防面积', '㎡', '地下室/车位指标', '用于普通地下室工程。', 204),
  metric('parkingCount', '总车位数', '个', '地下室/车位指标', '用于车位、交安、充电桩分摊。', 205),
  metric('undergroundPropertyParkingCount', '地下产权车位', '个', '地下室/车位指标', '用于地下产权车位收入及成本分摊。', 206),
  metric('undergroundUseRightParkingCount', '地下使用权车位', '个', '地下室/车位指标', '用于地下使用权车位收入及成本分摊。', 207),
  metric('civilDefenseParkingCount', '人防车位', '个', '地下室/车位指标', '用于人防车位测算。', 208),
  metric('aboveGroundParkingCount', '地上车位', '个', '地下室/车位指标', '用于地上停车相关测算。', 209),

  metric('buildingCount', '楼栋数量', '栋', '楼栋/单元/户数/电梯指标', '用于楼栋级费用。', 301),
  metric('unitCount', '单元数量', '个', '楼栋/单元/户数/电梯指标', '用于电梯、门禁、入户大堂等测算。', 302),
  metric('householdCount', '户数', '户', '楼栋/单元/户数/电梯指标', '用于户内门窗、表箱、分户配置。', 303),
  metric('elevatorCount', '电梯数量', '台', '楼栋/单元/户数/电梯指标', '用于电梯设备、电梯安装。', 304),
  metric('aboveGroundFloors', '地上层数', '层', '楼栋/单元/户数/电梯指标', '用于主体测算参考。', 305),
  metric('basementFloors', '地下层数', '层', '楼栋/单元/户数/电梯指标', '用于地下室测算参考。', 306),
  metric('standardFloorHeight', '标准层层高', 'm', '楼栋/单元/户数/电梯指标', '用于结构、外墙、体积类参考。', 307),
  metric('basementFloorHeight', '地下室层高', 'm', '楼栋/单元/户数/电梯指标', '用于地下室结构、安装参考。', 308),

  metric('sitePerimeter', '周界长度', 'm', '场地/前期/临设指标', '用于围墙、围挡、周界报警。', 401),
  metric('gateCount', '出入口数量', '个', '场地/前期/临设指标', '用于出入口、大门、门岗。', 402),
  metric('formalGateCount', '正式出入口数量', '个', '场地/前期/临设指标', '用于正式出入口。', 403),
  metric('temporaryGateCount', '临时出入口数量', '个', '场地/前期/临设指标', '用于临时出入口。', 404),
  metric('temporaryFacilityArea', '临设面积', '㎡', '场地/前期/临设指标', '用于临设工程。', 405),
  metric('siteLevelingArea', '场平面积', '㎡', '场地/前期/临设指标', '用于三通一平、场地平整。', 406),

  metric('landscapeArea', '景观面积', '㎡', '景观/室外/道路指标', '用于景观综合、室外综合管网。', 501),
  metric('hardscapeArea', '硬景面积', '㎡', '景观/室外/道路指标', '用于硬景铺装。', 502),
  metric('softscapeArea', '软景面积', '㎡', '景观/室外/道路指标', '用于绿化、乔灌木。', 503),
  metric('greenArea', '绿地面积', '㎡', '景观/室外/道路指标', '用于绿化指标。', 504),
  metric('waterFeatureArea', '水景面积', '㎡', '景观/室外/道路指标', '用于水景工程。', 505),
  metric('childrenActivityArea', '儿童活动场地面积', '㎡', '景观/室外/道路指标', '用于儿童设施。', 506),
  metric('elevatedFloorLandscapeArea', '架空层景观面积', '㎡', '景观/室外/道路指标', '用于架空层景观。', 507),
  metric('roadArea', '道路面积', '㎡', '景观/室外/道路指标', '用于道路工程。', 508),
  metric('fireRoadArea', '消防道路面积', '㎡', '景观/室外/道路指标', '用于消防道路。', 509),
  metric('asphaltRoadArea', '沥青道路面积', '㎡', '景观/室外/道路指标', '用于沥青路面。', 510),

  metric('pileFoundationArea', '桩基面积', '㎡', '土建工程量指标', '用于桩基工程。', 601),
  metric('earthworkVolume', '土方量', 'm³', '土建工程量指标', '用于土方开挖、回填。', 602),
  metric('waterproofArea', '防水面积', '㎡', '土建工程量指标', '用于防水工程。', 603),
  metric('roofArea', '屋面面积', '㎡', '土建工程量指标', '用于屋面工程。', 604),
  metric('insulationArea', '保温面积', '㎡', '土建工程量指标', '用于保温工程。', 605),
  metric('facadeArea', '外立面面积', '㎡', '土建工程量指标', '用于外墙、幕墙、涂料。', 606),
  metric('windowArea', '门窗面积', '㎡', '土建工程量指标', '用于门窗工程。', 607),
  metric('railingLength', '栏杆长度', 'm', '土建工程量指标', '用于栏杆、栏板、扶手。', 608),

  metric('publicArea', '公区面积', '㎡', '精装/公区/配套/示范区指标', '用于公区精装。', 701),
  metric('lobbyArea', '入户大堂面积', '㎡', '精装/公区/配套/示范区指标', '用于大堂精装。', 702),
  metric('salesOfficeArea', '售楼部面积', '㎡', '精装/公区/配套/示范区指标', '用于示范区、售楼部。', 703),
  metric('showFlatArea', '样板房面积', '㎡', '精装/公区/配套/示范区指标', '用于样板房精装。', 704),
  metric('propertyManagementArea', '物业用房面积', '㎡', '精装/公区/配套/示范区指标', '用于物业用房建安、精装。', 705),
  metric('communityServiceArea', '社区配套面积', '㎡', '精装/公区/配套/示范区指标', '用于社区用房建安、精装。', 706),

  metric('powerRoomCount', '配电房数量', '个', '设备/机电专项指标', '用于变配电、电气设备。', 801),
  metric('pumpRoomCount', '水泵房数量', '个', '设备/机电专项指标', '用于给排水设备。', 802),
  metric('firePoolVolume', '消防水池容积', 'm³', '设备/机电专项指标', '用于消防水池、防水、设备。', 803),
  metric('chargingPileCount', '充电桩总数', '个', '设备/机电专项指标', '用于充电桩工程。', 804),
  metric('fastChargingPileCount', '快充桩数量', '个', '设备/机电专项指标', '用于快充桩。', 805),
  metric('slowChargingPileCount', '慢充桩数量', '个', '设备/机电专项指标', '用于慢充桩。', 806),
  metric('reservedChargingPileCount', '预留充电桩数量', '个', '设备/机电专项指标', '用于预留工程。', 807),
  metric('parkingPowerCapacity', '车库充电容量', 'kW/kVA', '设备/机电专项指标', '用于配电容量参考。', 808),

  metric('product.buildingArea', '业态建筑面积', '㎡', '业态级指标', '用于业态建筑面积测算、分摊。', 901, 'product'),
  metric('product.saleableArea', '业态可售面积', '㎡', '业态级指标', '用于业态可售面积测算、分摊。', 902, 'product'),
  metric('product.capacityArea', '业态计容面积', '㎡', '业态级指标', '用于业态计容面积测算、分摊。', 903, 'product'),
  metric('product.nonSaleableArea', '业态不可售面积', '㎡', '业态级指标', '用于业态不可售面积测算、分摊。', 904, 'product')
];
