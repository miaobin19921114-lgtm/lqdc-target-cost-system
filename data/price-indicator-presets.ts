export type PriceIndicatorPreset = {
  costCode: string;
  subjectName: string;
  indicatorName: string;
  region: string;
  city: string;
  productType: string;
  stage: string;
  standardLevel: string;
  quantityUnit: string;
  pricingUnit: string;
  taxInclusiveUnitPrice: number;
  taxRate: number;
  sourceType: string;
  sourceName: string;
  confidence: number;
  remark?: string;
};

export const priceIndicatorPresets: PriceIndicatorPreset[] = [
  { costCode: '03.02.01', subjectName: '钢筋工程', indicatorName: '主体钢筋综合单价', region: '四川', city: '成都', productType: '住宅/地下室', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: 't', pricingUnit: '元/t', taxInclusiveUnitPrice: 4500, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.75, remark: '先作为成都住宅测算默认值，后续按项目样本修正。' },
  { costCode: '03.02.02', subjectName: '混凝土工程', indicatorName: '主体混凝土综合单价', region: '四川', city: '成都', productType: '住宅/地下室', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: 'm³', pricingUnit: '元/m³', taxInclusiveUnitPrice: 520, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.75 },
  { costCode: '03.02.03', subjectName: '模板工程', indicatorName: '主体模板综合单价', region: '四川', city: '成都', productType: '住宅/地下室', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 58, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.03.01', subjectName: '外墙工程', indicatorName: '外墙涂料保温综合单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 180, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.03.04', subjectName: '门窗工程', indicatorName: '铝合金门窗综合单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 620, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.03.09.01', subjectName: '入户门', indicatorName: '入户门综合单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '樘', pricingUnit: '元/樘', taxInclusiveUnitPrice: 1800, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.03.09.02', subjectName: '防火门', indicatorName: '防火门综合单价', region: '四川', city: '成都', productType: '住宅/地下室', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '樘', pricingUnit: '元/樘', taxInclusiveUnitPrice: 1200, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.65 },
  { costCode: '03.03.10.01', subjectName: '阳台栏杆', indicatorName: '阳台栏杆综合单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: 'm', pricingUnit: '元/m', taxInclusiveUnitPrice: 260, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.03.11.01', subjectName: '空调百叶', indicatorName: '空调百叶综合单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 280, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.65 },
  { costCode: '03.03.12.01', subjectName: '厨房防水', indicatorName: '厨房防水综合单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 55, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.05.01', subjectName: '给排水工程', indicatorName: '给排水安装单方指标', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 95, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.06.01', subjectName: '强电工程', indicatorName: '强电安装单方指标', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 135, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.07.05', subjectName: '充电桩安装', indicatorName: '充电桩安装综合单价', region: '四川', city: '成都', productType: '地下车位', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '个', pricingUnit: '元/个', taxInclusiveUnitPrice: 2800, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.65 },
  { costCode: '03.08.01', subjectName: '电梯设备', indicatorName: '住宅电梯设备及安装单价', region: '四川', city: '成都', productType: '住宅', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '台', pricingUnit: '万元/台', taxInclusiveUnitPrice: 480000, taxRate: 0.13, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7, remark: '系统计算按元/台保存，页面显示为万元/台。' },
  { costCode: '03.10.01', subjectName: '首层大堂精装', indicatorName: '首层大堂精装单价', region: '四川', city: '成都', productType: '住宅公区', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 1800, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.65 },
  { costCode: '03.11.01', subjectName: '售楼部精装', indicatorName: '售楼部精装单价', region: '四川', city: '成都', productType: '示范区', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 3200, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.6 },
  { costCode: '03.11.02', subjectName: '样板间精装', indicatorName: '样板间精装单价', region: '四川', city: '成都', productType: '示范区', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 3600, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.6 },
  { costCode: '03.13.01', subjectName: '硬景工程', indicatorName: '硬景综合单价', region: '四川', city: '成都', productType: '景观', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 520, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.13.02', subjectName: '软景工程', indicatorName: '软景综合单价', region: '四川', city: '成都', productType: '景观', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 260, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.14.01', subjectName: '道路工程', indicatorName: '小区道路综合单价', region: '四川', city: '成都', productType: '总平道路', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '㎡', pricingUnit: '元/㎡', taxInclusiveUnitPrice: 380, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.7 },
  { costCode: '03.15.01', subjectName: '围墙工程', indicatorName: '围墙综合单价', region: '四川', city: '成都', productType: '总平', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: 'm', pricingUnit: '元/m', taxInclusiveUnitPrice: 1500, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.65 },
  { costCode: '03.15.02', subjectName: '正式出入口', indicatorName: '正式出入口综合单价', region: '四川', city: '成都', productType: '总平', stage: 'SCHEME', standardLevel: '普通住宅', quantityUnit: '个', pricingUnit: '万元/个', taxInclusiveUnitPrice: 300000, taxRate: 0.09, sourceType: 'experience', sourceName: '成都市场经验指标', confidence: 0.6 }
];
