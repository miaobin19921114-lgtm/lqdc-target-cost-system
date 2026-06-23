import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RuleRow = {
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
};

function q(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function slug(value: string) {
  const pinyinMap: Record<string, string> = {
    土地成交价: 'landTransactionPrice',
    土地面积: 'landArea',
    土地面积亩: 'landAreaMu',
    计容建筑面积: 'capacityBuildingArea',
    契税税率: 'deedTaxRate',
    交易服务费: 'transactionServiceFee',
    土地评估费: 'landAppraisalFee',
    权籍测绘费: 'ownershipSurveyFee',
    合作开发对价: 'cooperationConsideration',
    股权溢价: 'equityPremium',
    土地付款节点: 'landPaymentMilestone',
    总建筑面积: 'totalBuildingArea',
    周界长度: 'sitePerimeter',
    出入口数量: 'gateCount',
    临设面积: 'temporaryFacilityArea',
    场地平整面积: 'siteLevelingArea',
    临水容量: 'temporaryWaterCapacity',
    临电容量: 'temporaryPowerCapacity',
    勘察费单价: 'surveyUnitPrice',
    设计费单价: 'designUnitPrice',
    报规报建固定费用: 'approvalFixedFee',
    三通一平单价: 'sitePreparationUnitPrice',
    围墙单价: 'wallUnitPrice',
    出入口单价: 'gateUnitPrice',
    地上建筑面积: 'aboveGroundArea',
    地下建筑面积: 'undergroundArea',
    可售面积: 'saleableArea',
    不可售面积: 'nonSaleableArea',
    基底面积: 'baseArea',
    桩基面积: 'pileFoundationArea',
    标准层面积: 'standardFloorArea',
    户数: 'householdCount',
    单元数: 'unitCount',
    楼栋数: 'buildingCount',
    地下室层数: 'basementFloors',
    层高: 'floorHeight',
    人防面积: 'civilDefenseArea',
    非人防面积: 'nonCivilDefenseArea',
    外立面面积: 'facadeArea',
    门窗面积: 'windowArea',
    屋面面积: 'roofArea',
    防水面积: 'waterproofArea',
    保温面积: 'insulationArea',
    栏杆长度: 'railingLength',
    土方量: 'earthworkVolume',
    结构形式: 'structureType',
    装配式范围: 'prefabricatedScope',
    装配率: 'prefabricationRate',
    配置档次: 'configurationLevel',
    景观面积: 'landscapeArea',
    硬景面积: 'hardscapeArea',
    软景面积: 'softscapeArea',
    绿化面积: 'greenArea',
    水景面积: 'waterFeatureArea',
    儿童活动场地面积: 'childrenActivityArea',
    架空层景观面积: 'elevatedFloorLandscapeArea',
    道路面积: 'roadArea',
    消防道路面积: 'fireRoadArea',
    沥青道路面积: 'asphaltRoadArea',
    综合管网面积: 'utilityNetworkArea',
    管线长度: 'pipelineLength',
    围墙长度: 'wallLength',
    正式出入口数量: 'formalGateCount',
    临时出入口数量: 'temporaryGateCount',
    景观档次: 'landscapeStandard',
    道路做法: 'roadSpecification',
    管网配置: 'utilityNetworkStandard',
    电梯台数: 'elevatorCount',
    单元数量: 'unitCount',
    楼栋数量: 'buildingCount',
    充电桩数量: 'chargingPileCount',
    快充数量: 'fastChargingPileCount',
    慢充数量: 'slowChargingPileCount',
    预留充电桩数量: 'reservedChargingPileCount',
    防护单元数量: 'civilDefenseUnitCount',
    消防设备面积: 'fireEquipmentArea',
    配电房数量: 'powerRoomCount',
    水泵房数量: 'pumpRoomCount',
    消防水池容量: 'firePoolVolume',
    停车场系统数量: 'parkingSystemCount',
    弱电系统配置: 'weakCurrentSystemStandard',
    设备档次: 'equipmentStandard',
    大堂面积: 'lobbyArea',
    地下大堂面积: 'undergroundLobbyArea',
    公区面积: 'publicArea',
    售楼部面积: 'salesOfficeArea',
    样板房面积: 'showFlatArea',
    批量精装面积: 'bulkFitoutArea',
    物业用房面积: 'propertyManagementArea',
    社区用房面积: 'communityServiceArea',
    商业公区面积: 'commercialPublicArea',
    精装交付范围: 'fitoutDeliveryScope',
    精装标准: 'fitoutStandard',
    售楼部软装范围: 'salesOfficeSoftFitoutScope',
    样板房软装范围: 'showFlatSoftFitoutScope',
    合同金额: 'contractAmount',
    服务范围: 'serviceScope',
    监理费率: 'supervisionRate',
    造价咨询费率: 'costConsultingRate',
    设计咨询费率: 'designConsultingRate',
    招标代理费率: 'biddingAgencyRate',
    第三方检测费率: 'thirdPartyTestingRate',
    咨询服务周期: 'consultingServicePeriod',
    项目开发周期: 'developmentPeriod',
    项目人员配置: 'projectStaffing',
    管理费率: 'managementRate',
    办公费用: 'officeExpense',
    差旅费用: 'travelExpense',
    行政费用: 'administrationExpense',
    工程管理费用: 'engineeringManagementExpense',
    开发间接费分摊周期: 'indirectCostAllocationPeriod',
    销售收入: 'salesRevenue',
    销售周期: 'salesPeriod',
    营销费率: 'marketingRate',
    渠道费率: 'channelRate',
    案场费用: 'salesOfficeOperationFee',
    广告推广费用: 'advertisingFee',
    示范区包装费用: 'demonstrationAreaPackagingFee',
    销售代理费: 'salesAgencyFee',
    销售节点: 'salesMilestone',
    去化计划: 'salesSchedule',
    融资金额: 'financingAmount',
    融资利率: 'financingRate',
    融资周期: 'financingPeriod',
    放款节点: 'loanDisbursementMilestone',
    还款节点: 'repaymentMilestone',
    销售回款计划: 'salesCollectionPlan',
    资本化周期: 'capitalizationPeriod',
    费用化周期: 'expensePeriod',
    资金占用额: 'fundOccupationAmount',
    资金峰值: 'fundPeak',
    现金流计划: 'cashFlowPlan',
    计费基数: 'billingBase',
    预备费率: 'contingencyRate',
    风险等级: 'riskLevel',
    未决事项金额: 'pendingMatterAmount',
    暂估价金额: 'provisionalEstimateAmount',
    待明确工程范围: 'pendingScope',
    成本偏差率: 'costDeviationRate',
    动态成本余额: 'dynamicCostBalance',
    不含税收入: 'taxExclusiveRevenue',
    销项税额: 'outputVat',
    进项税额: 'inputVat',
    不可抵扣进项税: 'nonDeductibleInputVat',
    土地成本: 'landCost',
    开发成本: 'developmentCost',
    开发费用: 'developmentExpense',
    加计扣除率: 'additionalDeductionRate',
    清算对象: 'clearanceObject',
    土地增值税税率: 'landVatRate',
    所得税税率: 'incomeTaxRate',
    税前扣除口径: 'preTaxDeductionBasis',
    住宅可售面积: 'residentialSaleableArea',
    住宅销售单价: 'residentialSalePrice',
    销售套数: 'soldUnits',
    去化率: 'sellThroughRate',
    签约节奏: 'contractSchedule',
    回款节奏: 'collectionSchedule',
    增值税税率: 'vatRate',
    销售折扣: 'salesDiscount',
    商业可售面积: 'commercialSaleableArea',
    商业销售单价: 'commercialSalePrice',
    商业租金: 'commercialRent',
    出租率: 'occupancyRate',
    租期: 'leaseTerm',
    销售比例: 'saleRatio',
    持有比例: 'holdingRatio',
    招商周期: 'leasingPeriod',
    运营收入: 'operationRevenue',
    地下产权车位数量: 'undergroundPropertyParkingCount',
    地下使用权车位数量: 'undergroundUseRightParkingCount',
    人防车位数量: 'civilDefenseParkingCount',
    地上车位数量: 'aboveGroundParkingCount',
    车位销售单价: 'parkingSalePrice',
    车位租金: 'parkingRent',
    车位去化率: 'parkingSellThroughRate',
    车位销售节点: 'parkingSalesMilestone',
    充电桩是否含价: 'chargingPileIncludedInPrice',
    收入类型: 'incomeType',
    收入金额: 'incomeAmount',
    确认条件: 'recognitionCondition',
    确认时间: 'recognitionTime',
    是否含税: 'taxInclusive',
    政策依据: 'policyBasis',
    确定性等级: 'certaintyLevel',
    现金流节点: 'cashFlowMilestone',
    总投资: 'totalInvestment',
    回款计划: 'collectionPlan',
    付款计划: 'paymentPlan',
    净现金流: 'netCashFlow',
    IRR: 'irr',
    净利润: 'netProfit',
    净利率: 'netProfitMargin',
    合同编号: 'contractCode',
    合同名称: 'contractName',
    承包单位: 'contractor',
    原合同金额: 'originalContractAmount',
    补充协议金额: 'supplementaryAgreementAmount',
    变更金额: 'variationAmount',
    签证金额: 'siteInstructionAmount',
    索赔金额: 'claimAmount',
    暂估价调整: 'provisionalEstimateAdjustment',
    甲供材扣减: 'ownerSuppliedMaterialDeduction',
    结算申报金额: 'settlementDeclaredAmount',
    结算审核金额: 'settlementReviewedAmount',
    审减金额: 'settlementReductionAmount',
    最终结算金额: 'finalSettlementAmount',
    已付款金额: 'paidAmount',
    未付款金额: 'unpaidAmount',
    结算日期: 'settlementDate',
    结算状态: 'settlementStatus',
    对应成本科目: 'relatedCostSubject',
    '对应业态/楼栋/区域': 'relatedProductBuildingArea',
  };
  return pinyinMap[value] || value
    .replace(/[\s/／]+/g, '_')
    .replace(/[，,、]+/g, '_')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_]/g, '')
    .slice(0, 60);
}

function splitList(value?: string | null) {
  return String(value || '')
    .split(/[、,，/／]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unitOf(field: string) {
  if (/面积|建面|计容|可售|不可售/.test(field)) return '㎡';
  if (/长度|周界|围墙|栏杆|管线/.test(field)) return 'm';
  if (/数量|台数|套数|户数|单元|楼栋|车位|充电桩|出入口|配电房|水泵房/.test(field)) return '个/台/套';
  if (/金额|价|费|成本|收入|投资|利润|现金流|付款|回款|融资/.test(field)) return '元';
  if (/率|IRR|比例|装配率|去化率|出租率|税率|费率/.test(field)) return '%';
  if (/周期|节点|时间|日期|租期/.test(field)) return '月/日期';
  return '';
}

function typeOf(field: string) {
  if (/日期|时间|节点/.test(field)) return 'date/string';
  if (/是否/.test(field)) return 'boolean';
  if (/范围|状态|类型|依据|对象|档次|标准|配置|条件|名称|编号|单位|做法|结构|计划|节奏|区域/.test(field)) return 'string';
  return 'number';
}

function groupOf(table: string) {
  if (/项目概况|业态产品|工程量/.test(table)) return '基础输入字段';
  if (/收入|销售|车位|商业/.test(table)) return '收入测算字段';
  if (/税|土地增值税|所得税/.test(table)) return '税费测算字段';
  if (/财务|融资|现金流/.test(table)) return '财务评价字段';
  if (/合同|结算|后评估/.test(table)) return '动态成本/结算字段';
  return '其他字段';
}

async function safeExecute(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  await safeExecute('create TemplateFieldDefinition', `
    CREATE TABLE IF NOT EXISTS "TemplateFieldDefinition" (
      "id" TEXT PRIMARY KEY,
      "templateCode" TEXT NOT NULL,
      "fieldKey" TEXT NOT NULL,
      "fieldName" TEXT NOT NULL,
      "fieldGroup" TEXT,
      "sourceTable" TEXT NOT NULL,
      "fieldType" TEXT NOT NULL DEFAULT 'number',
      "unit" TEXT,
      "isRequired" BOOLEAN NOT NULL DEFAULT TRUE,
      "applicableStage" TEXT,
      "precisionLevel" TEXT,
      "sourceRuleType" TEXT,
      "sourceSubjectCodes" TEXT,
      "sourceSubjects" TEXT,
      "description" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TemplateFieldDefinition_unique" UNIQUE ("templateCode", "sourceTable", "fieldKey")
    )
  `);

  const rules = await prisma.$queryRawUnsafe<RuleRow[]>(`
    SELECT "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields"
    FROM "TemplateUnifiedRule"
    WHERE "templateCode" = 'residential-v1' AND "isEnabled" = TRUE
  `);

  const fieldMap = new Map<string, {
    sourceTable: string;
    fieldName: string;
    stages: Set<string>;
    precisionLevels: Set<string>;
    ruleTypes: Set<string>;
    subjectCodes: Set<string>;
    subjects: Set<string>;
  }>();

  for (const rule of rules) {
    const tables = splitList(rule.dataSourceTable || '未指定来源表');
    const fields = splitList(rule.requiredFields || '未指定字段');
    for (const table of tables) {
      for (const field of fields) {
        const key = `${table}::${slug(field)}`;
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            sourceTable: table,
            fieldName: field,
            stages: new Set<string>(),
            precisionLevels: new Set<string>(),
            ruleTypes: new Set<string>(),
            subjectCodes: new Set<string>(),
            subjects: new Set<string>(),
          });
        }
        const item = fieldMap.get(key)!;
        item.stages.add(rule.applicableStage);
        item.precisionLevels.add(rule.precisionLevel);
        item.ruleTypes.add(rule.ruleType);
        item.subjectCodes.add(rule.subjectCode);
        item.subjects.add(rule.subjectName);
      }
    }
  }

  let sortOrder = 0;
  for (const item of Array.from(fieldMap.values()).sort((a, b) => a.sourceTable.localeCompare(b.sourceTable, 'zh-CN') || a.fieldName.localeCompare(b.fieldName, 'zh-CN'))) {
    sortOrder += 10;
    const fieldKey = slug(item.fieldName);
    await safeExecute(`upsert field ${item.sourceTable} ${item.fieldName}`, `
      INSERT INTO "TemplateFieldDefinition" (
        "id", "templateCode", "fieldKey", "fieldName", "fieldGroup", "sourceTable", "fieldType", "unit",
        "isRequired", "applicableStage", "precisionLevel", "sourceRuleType", "sourceSubjectCodes", "sourceSubjects", "description", "sortOrder"
      ) VALUES (
        ${q(`residential-v1-${item.sourceTable}-${fieldKey}`)},
        'residential-v1',
        ${q(fieldKey)},
        ${q(item.fieldName)},
        ${q(groupOf(item.sourceTable))},
        ${q(item.sourceTable)},
        ${q(typeOf(item.fieldName))},
        ${q(unitOf(item.fieldName))},
        TRUE,
        ${q(Array.from(item.stages).join('、'))},
        ${q(Array.from(item.precisionLevels).join('、'))},
        ${q(Array.from(item.ruleTypes).join('、'))},
        ${q(Array.from(item.subjectCodes).join('、'))},
        ${q(Array.from(item.subjects).join('、'))},
        ${q(`由住宅开发模板规则反推字段：${item.fieldName}`)},
        ${sortOrder}
      )
      ON CONFLICT ("templateCode", "sourceTable", "fieldKey") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "fieldGroup" = EXCLUDED."fieldGroup",
        "fieldType" = EXCLUDED."fieldType",
        "unit" = EXCLUDED."unit",
        "isRequired" = EXCLUDED."isRequired",
        "applicableStage" = EXCLUDED."applicableStage",
        "precisionLevel" = EXCLUDED."precisionLevel",
        "sourceRuleType" = EXCLUDED."sourceRuleType",
        "sourceSubjectCodes" = EXCLUDED."sourceSubjectCodes",
        "sourceSubjects" = EXCLUDED."sourceSubjects",
        "description" = EXCLUDED."description",
        "sortOrder" = EXCLUDED."sortOrder",
        "updatedAt" = CURRENT_TIMESTAMP
    `);
  }

  console.log(`Template field definitions ensured: ${fieldMap.size}`);
}

main().finally(async () => prisma.$disconnect());
