import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type StageCode = 'INVESTMENT' | 'CONCEPT' | 'SCHEME' | 'DRAWING' | 'TENDER' | 'DYNAMIC' | 'SETTLEMENT';

type RuleSeed = {
  costCode: string;
  basisName: string;
  metricKey?: string | null;
  metricScope?: string;
  quantityUnit?: string;
  pricingUnit?: string;
  defaultCoefficient?: number;
  quantityFormula?: string;
  amountFormula?: string;
  applicableProductType?: string;
  priority?: number;
  remark?: string;
  stages?: StageCode[];
};

const earlyStages: StageCode[] = ['INVESTMENT', 'CONCEPT', 'SCHEME'];
const designStages: StageCode[] = ['CONCEPT', 'SCHEME', 'DRAWING'];
const allStages: StageCode[] = ['INVESTMENT', 'CONCEPT', 'SCHEME', 'DRAWING', 'TENDER', 'DYNAMIC', 'SETTLEMENT'];

const rules: RuleSeed[] = [
  { costCode: '01.01.01.01', basisName: '用地面积亩数×万元/亩', metricKey: 'landAreaMu', quantityUnit: '亩', pricingUnit: '万元/亩', quantityFormula: 'metric(landAreaMu)', amountFormula: 'quantity * unitPrice', applicableProductType: '项目整体共用', priority: 10, stages: allStages, remark: '土地价款可按亩数和成交单价测算，也可手动覆盖为合同总价。' },
  { costCode: '01.01.01.02', basisName: '固定金额', quantityUnit: '项', pricingUnit: '万元/项', quantityFormula: '1', amountFormula: 'quantity * unitPrice', applicableProductType: '项目整体共用', priority: 20, stages: allStages, remark: '补缴地价/补价款按通知或协议金额录入。' },
  { costCode: '01.01.01.03', basisName: '固定金额', quantityUnit: '项', pricingUnit: '万元/项', quantityFormula: '1', amountFormula: 'quantity * unitPrice', applicableProductType: '项目整体共用', priority: 20, stages: allStages, remark: '拆迁补偿及安置补偿按协议金额录入。' },
  { costCode: '01.02.01.01', basisName: '土地价款×费率', quantityUnit: '万元', pricingUnit: '费率', quantityFormula: 'manualBaseAmount', amountFormula: 'quantity * rate', applicableProductType: '项目整体共用', priority: 30, stages: allStages, remark: '契税按土地价款或成交价款乘以费率。' },

  { costCode: '02.01.01.01', basisName: '固定金额/政府收费文件', quantityUnit: '项', pricingUnit: '万元/项', quantityFormula: '1', amountFormula: 'quantity * unitPrice', applicableProductType: '全项目', priority: 50, stages: allStages },
  { costCode: '02.01.02.01', basisName: '宗地面积', metricKey: 'landArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(landArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 30, stages: earlyStages },
  { costCode: '02.02.03', basisName: '总建筑面积', metricKey: 'totalBuildingArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(totalBuildingArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 20, stages: designStages, remark: '施工图设计费默认按总建筑面积测算。' },
  { costCode: '02.02.04', basisName: '景观面积', metricKey: 'landscapeArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(landscapeArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 20, stages: designStages },
  { costCode: '02.03.01', basisName: '总建筑面积', metricKey: 'totalBuildingArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(totalBuildingArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 40, stages: designStages },
  { costCode: '02.04.06', basisName: '土地面积', metricKey: 'landArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(landArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 20, stages: earlyStages },
  { costCode: '02.05.05', basisName: '周界长度', metricKey: 'sitePerimeter', quantityUnit: 'm', pricingUnit: '元/m', quantityFormula: 'metric(sitePerimeter)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 20, stages: earlyStages },
  { costCode: '02.05.04', basisName: '临时出入口数量', metricKey: 'temporaryGateCount', quantityUnit: '个', pricingUnit: '万元/个', quantityFormula: 'metric(temporaryGateCount)', amountFormula: 'quantity * unitPrice', applicableProductType: '全项目', priority: 20, stages: earlyStages },

  { costCode: '03.01.02', basisName: '基底面积×桩长含量', metricKey: 'baseArea', quantityUnit: 'm', pricingUnit: '元/m', defaultCoefficient: 1, quantityFormula: 'metric(baseArea) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '高层住宅/住宅', priority: 10, stages: earlyStages, remark: '工程桩默认按基底面积×桩长含量。' },
  { costCode: '03.01.06', basisName: '基底面积×混凝土含量', metricKey: 'baseArea', quantityUnit: 'm³', pricingUnit: '元/m³', defaultCoefficient: 1, quantityFormula: 'metric(baseArea) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '高层住宅/住宅', priority: 10, stages: earlyStages },
  { costCode: '03.02.01', basisName: '业态建筑面积×钢筋含量', metricKey: 'product.buildingArea', metricScope: 'product', quantityUnit: 't', pricingUnit: '元/t', defaultCoefficient: 1, quantityFormula: 'productMetric(product.buildingArea) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业/地下车库/配套', priority: 10, stages: earlyStages },
  { costCode: '03.02.02', basisName: '业态建筑面积×混凝土含量', metricKey: 'product.buildingArea', metricScope: 'product', quantityUnit: 'm³', pricingUnit: '元/m³', defaultCoefficient: 1, quantityFormula: 'productMetric(product.buildingArea) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业/地下车库/配套', priority: 10, stages: earlyStages },
  { costCode: '03.02.03', basisName: '业态建筑面积×模板含量', metricKey: 'product.buildingArea', metricScope: 'product', quantityUnit: '㎡', pricingUnit: '元/㎡', defaultCoefficient: 1, quantityFormula: 'productMetric(product.buildingArea) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业/地下车库/配套', priority: 10, stages: earlyStages },
  { costCode: '03.03.01', basisName: '外立面面积', metricKey: 'facadeArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(facadeArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业', priority: 20, stages: designStages },
  { costCode: '03.03.04', basisName: '门窗面积', metricKey: 'windowArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(windowArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业', priority: 20, stages: designStages },
  { costCode: '03.03.09.01', basisName: '户数×入户门数量', metricKey: 'householdCount', quantityUnit: '樘', pricingUnit: '元/樘', quantityFormula: 'metric(householdCount) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅', priority: 20, stages: earlyStages },
  { costCode: '03.03.10.01', basisName: '户数×阳台栏杆含量', metricKey: 'householdCount', quantityUnit: 'm', pricingUnit: '元/m', defaultCoefficient: 1, quantityFormula: 'metric(householdCount) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅', priority: 20, stages: earlyStages },
  { costCode: '03.03.11.01', basisName: '户数×空调百叶含量', metricKey: 'householdCount', quantityUnit: '㎡', pricingUnit: '元/㎡', defaultCoefficient: 1, quantityFormula: 'metric(householdCount) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅', priority: 20, stages: earlyStages },
  { costCode: '03.03.12.01', basisName: '户数×厨房防水面积', metricKey: 'householdCount', quantityUnit: '㎡', pricingUnit: '元/㎡', defaultCoefficient: 1, quantityFormula: 'metric(householdCount) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅', priority: 30, stages: earlyStages },
  { costCode: '03.03.12.03', basisName: '消防水池容积', metricKey: 'firePoolVolume', quantityUnit: 'm³', pricingUnit: '元/m³', quantityFormula: 'metric(firePoolVolume)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '地下室/设备用房', priority: 30, stages: designStages },

  { costCode: '03.05.01', basisName: '业态建筑面积×给水含量', metricKey: 'product.buildingArea', metricScope: 'product', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'productMetric(product.buildingArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业/配套', priority: 30, stages: earlyStages },
  { costCode: '03.06.01', basisName: '业态建筑面积×强电指标', metricKey: 'product.buildingArea', metricScope: 'product', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'productMetric(product.buildingArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅/商业/配套', priority: 30, stages: earlyStages },
  { costCode: '03.07.05', basisName: '充电桩数量', metricKey: 'chargingPileCount', quantityUnit: '个', pricingUnit: '元/个', quantityFormula: 'metric(chargingPileCount)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '地下车位/地库', priority: 20, stages: earlyStages },
  { costCode: '03.08.01', basisName: '电梯数量', metricKey: 'elevatorCount', quantityUnit: '台', pricingUnit: '万元/台', quantityFormula: 'metric(elevatorCount)', amountFormula: 'quantity * unitPrice', applicableProductType: '住宅/商业/配套', priority: 10, stages: earlyStages },
  { costCode: '03.09.01', basisName: '慢充数量', metricKey: 'slowChargingPileCount', quantityUnit: '台', pricingUnit: '元/台', quantityFormula: 'metric(slowChargingPileCount)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '地下车位/地库', priority: 10, stages: earlyStages },
  { costCode: '03.09.02', basisName: '快充数量', metricKey: 'fastChargingPileCount', quantityUnit: '台', pricingUnit: '元/台', quantityFormula: 'metric(fastChargingPileCount)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '地下车位/地库', priority: 10, stages: earlyStages },
  { costCode: '03.10.01', basisName: '首层大堂面积', metricKey: 'lobbyArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(lobbyArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '住宅', priority: 20, stages: designStages },
  { costCode: '03.11.01', basisName: '售楼部面积', metricKey: 'salesOfficeArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(salesOfficeArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '示范区/售楼部', priority: 20, stages: designStages },
  { costCode: '03.11.02', basisName: '样板间面积', metricKey: 'showFlatArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(showFlatArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '示范区/样板间', priority: 20, stages: designStages },
  { costCode: '03.12.01', basisName: '景观面积×管网含量', metricKey: 'landscapeArea', quantityUnit: 'm', pricingUnit: '元/m', defaultCoefficient: 1, quantityFormula: 'metric(landscapeArea) * coefficient', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 30, stages: earlyStages },
  { costCode: '03.13.01', basisName: '硬景面积', metricKey: 'hardscapeArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(hardscapeArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 10, stages: earlyStages },
  { costCode: '03.13.02', basisName: '软景面积', metricKey: 'softscapeArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(softscapeArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 10, stages: earlyStages },
  { costCode: '03.14.01', basisName: '道路面积', metricKey: 'roadArea', quantityUnit: '㎡', pricingUnit: '元/㎡', quantityFormula: 'metric(roadArea)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 20, stages: earlyStages },
  { costCode: '03.15.01', basisName: '周界长度', metricKey: 'sitePerimeter', quantityUnit: 'm', pricingUnit: '元/m', quantityFormula: 'metric(sitePerimeter)', amountFormula: 'quantity * unitPrice / 10000', applicableProductType: '全项目', priority: 10, stages: earlyStages },
  { costCode: '03.15.02', basisName: '正式出入口数量', metricKey: 'formalGateCount', quantityUnit: '个', pricingUnit: '万元/个', quantityFormula: 'metric(formalGateCount)', amountFormula: 'quantity * unitPrice', applicableProductType: '全项目', priority: 10, stages: earlyStages },

  { costCode: '04.01.01', basisName: '固定金额/销售收入比例', quantityUnit: '项', pricingUnit: '万元/项或费率', quantityFormula: '1', amountFormula: 'manualAmount or revenue * rate', applicableProductType: '可售业态', priority: 50, stages: allStages, remark: '销售费用后续接收入测算和费率规则。' },
  { costCode: '05.01.01', basisName: '开发周期/月度人员费', quantityUnit: '月', pricingUnit: '万元/月', quantityFormula: 'manualMonths', amountFormula: 'quantity * unitPrice', applicableProductType: '全项目', priority: 50, stages: allStages },
  { costCode: '06.01.01', basisName: '融资金额×利率×周期', quantityUnit: '万元', pricingUnit: '年利率', quantityFormula: 'financingAmount', amountFormula: 'financingAmount * annualRate * months / 12', applicableProductType: '全项目', priority: 50, stages: allStages },
  { costCode: '07.01.01', basisName: '应交增值税×附加税率', quantityUnit: '万元', pricingUnit: '费率', quantityFormula: 'vatPayableAmount', amountFormula: 'quantity * rate', applicableProductType: '全项目', priority: 50, stages: allStages },
  { costCode: '07.02.01', basisName: '目标成本基数×预备费率', quantityUnit: '万元', pricingUnit: '费率', quantityFormula: 'targetCostBaseAmount', amountFormula: 'quantity * rate', applicableProductType: '全项目', priority: 50, stages: allStages }
];

async function main() {
  let ruleCount = 0;
  let stageRuleCount = 0;

  for (const rule of rules) {
    const saved = await prisma.measureBasisRule.upsert({
      where: { costCode_basisName: { costCode: rule.costCode, basisName: rule.basisName } },
      update: {
        metricKey: rule.metricKey || null,
        metricScope: rule.metricScope || 'project',
        quantityUnit: rule.quantityUnit || null,
        pricingUnit: rule.pricingUnit || null,
        defaultCoefficient: rule.defaultCoefficient ?? 1,
        quantityFormula: rule.quantityFormula || null,
        amountFormula: rule.amountFormula || null,
        applicableProductType: rule.applicableProductType || null,
        allowManualOverride: true,
        enabled: true,
        priority: rule.priority || 100,
        remark: rule.remark || null
      },
      create: {
        costCode: rule.costCode,
        basisName: rule.basisName,
        metricKey: rule.metricKey || null,
        metricScope: rule.metricScope || 'project',
        quantityUnit: rule.quantityUnit || null,
        pricingUnit: rule.pricingUnit || null,
        defaultCoefficient: rule.defaultCoefficient ?? 1,
        quantityFormula: rule.quantityFormula || null,
        amountFormula: rule.amountFormula || null,
        applicableProductType: rule.applicableProductType || null,
        allowManualOverride: true,
        enabled: true,
        priority: rule.priority || 100,
        remark: rule.remark || null
      }
    });
    ruleCount += 1;

    for (const [index, stage] of (rule.stages || earlyStages).entries()) {
      await prisma.measureBasisStageRule.upsert({
        where: { costCode_stage_basisRuleId: { costCode: rule.costCode, stage, basisRuleId: saved.id } },
        update: {
          priority: (rule.priority || 100) + index,
          isDefault: index === 0,
          enabled: true,
          remark: `${stage}阶段默认测算依据：${rule.basisName}`
        },
        create: {
          costCode: rule.costCode,
          stage,
          basisRuleId: saved.id,
          priority: (rule.priority || 100) + index,
          isDefault: index === 0,
          enabled: true,
          remark: `${stage}阶段默认测算依据：${rule.basisName}`
        }
      });
      stageRuleCount += 1;
    }
  }

  console.log(`Seeded ${ruleCount} measure basis rules and ${stageRuleCount} stage rules.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
