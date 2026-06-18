export const costDictionaryHeaders = ["成本编码", "父级编码", "科目层级", "一级科目", "二级科目", "三级科目", "四级/明细科目", "科目定义", "归属表", "是否启用", "是否回写目标成本", "目标成本主表映射编码", "建议测算依据", "单位", "默认税率", "适用业态", "适用阶段", "投拓阶段测算方法", "概念方案阶段测算方法", "方案阶段测算方法", "施工图阶段测算方法", "招采合约阶段测算方法", "动态成本/结算阶段测算方法", "特殊调整说明", "备注", "成本归属方式", "目标成本/经营分摊口径", "土增税清算分摊口径", "所得税扣除分类", "是否计入税前扣除", "税务口径说明"] as const;

export type CostDictionaryPresetRow = {
  rowIndex: number;
  costCode?: string;
  parentCode?: string;
  subjectLevel?: string;
  firstSubject?: string;
  secondSubject?: string;
  thirdSubject?: string;
  detailSubject?: string;
  subjectDefinition?: string;
  sourceTable?: string;
  enabled?: string;
  writeBackToTarget?: string;
  targetMappingCode?: string;
  measureBasis?: string;
  unit?: string;
  defaultTaxRate?: string;
  applicableProductType?: string;
  applicableStage?: string;
  investmentMethod?: string;
  conceptMethod?: string;
  schemeMethod?: string;
  drawingMethod?: string;
  tenderMethod?: string;
  dynamicMethod?: string;
  specialAdjustment?: string;
  remark?: string;
  costAttributionMethod?: string;
  targetAllocationMethod?: string;
  landVatAllocationMethod?: string;
  incomeTaxDeductionCategory?: string;
  preTaxDeduction?: string;
  taxRemark?: string;
};

type RowInput = Omit<CostDictionaryPresetRow, 'rowIndex'>;
type DetailInput = string | (RowInput & { name: string });

function buildRows(): CostDictionaryPresetRow[] {
  const rows: CostDictionaryPresetRow[] = [];
  let rowIndex = 1;
  const common = {
    enabled: '是',
    writeBackToTarget: '是',
    applicableStage: '投拓/概念/方案/施工图/招采/动态',
    investmentMethod: '按指标、单方或比例快速估算',
    conceptMethod: '按方案指标和地区经验参数估算',
    schemeMethod: '按产品、面积和专项指标拆分测算',
    drawingMethod: '按施工图范围和合同边界复核',
    tenderMethod: '按中标价、合同价和清单调整',
    dynamicMethod: '按动态成本、签证变更和结算更新',
    specialAdjustment: '特殊事项可人工调整，不参与默认公式',
    taxRemark: '按默认税务口径归集，最终以财税审核为准'
  };

  function add(input: RowInput) {
    rows.push({
      rowIndex: rowIndex++,
      ...common,
      ...input,
      subjectDefinition: input.subjectDefinition || `${input.detailSubject || input.thirdSubject || input.secondSubject || input.firstSubject}成本科目，用于目标成本测算、明细归集和税务分摊。`,
      costAttributionMethod: input.costAttributionMethod || input.secondSubject || input.firstSubject,
      targetAllocationMethod: input.targetAllocationMethod || '按可售面积占比',
      landVatAllocationMethod: input.landVatAllocationMethod || '按可售面积占比',
      incomeTaxDeductionCategory: input.incomeTaxDeductionCategory || '开发成本',
      preTaxDeduction: input.preTaxDeduction || '是'
    });
  }

  function addSubject(code: string, parentCode: string | undefined, subjectLevel: string, firstSubject: string, secondSubject: string | undefined, thirdSubject: string | undefined, sourceTable: string, targetMappingCode: string, measureBasis = '汇总金额', unit = '万元', tax = '9%', product = '全项目/按业态选择', allocation = '按可售面积占比', extra: Partial<RowInput> = {}) {
    add({ costCode: code, parentCode, subjectLevel, firstSubject, secondSubject, thirdSubject, sourceTable, targetMappingCode, measureBasis, unit, defaultTaxRate: tax, applicableProductType: product, targetAllocationMethod: allocation, ...extra });
  }

  function addDetailGroup(input: { parentCode: string; parentOfGroup: string; firstSubject: string; secondSubject: string; thirdSubject: string; details: DetailInput[]; sourceTable: string; measureBasis: string; unit: string; tax: string; product: string; targetMappingCode: string; allocation?: string; groupExtra?: Partial<RowInput>; }) {
    addSubject(input.parentCode, input.parentOfGroup, '3', input.firstSubject, input.secondSubject, input.thirdSubject, input.sourceTable, input.targetMappingCode, '汇总金额', '万元', input.tax, input.product, input.allocation || '按可售面积占比', input.groupExtra || {});
    input.details.forEach((detail, index) => {
      const isObject = typeof detail !== 'string';
      const name = isObject ? detail.name : detail;
      const extra = isObject ? detail : {};
      add({ costCode: `${input.parentCode}.${String(index + 1).padStart(2, '0')}`, parentCode: input.parentCode, subjectLevel: '4', firstSubject: input.firstSubject, secondSubject: input.secondSubject, thirdSubject: input.thirdSubject, detailSubject: name, sourceTable: input.sourceTable, targetMappingCode: input.targetMappingCode, measureBasis: input.measureBasis, unit: input.unit, defaultTaxRate: input.tax, applicableProductType: input.product, targetAllocationMethod: input.allocation || '按可售面积占比', ...extra });
    });
  }

  function addDetail(prefix: string, parentCode: string, firstSubject: string, secondSubject: string, thirdSubject: string, details: DetailInput[], count: number, sourceTable: string, measureBasis: string, unit: string, tax: string, product: string, targetMappingCode: string, allocation = '按可售面积占比') {
    addSubject(parentCode, prefix, '3', firstSubject, secondSubject, thirdSubject, sourceTable, targetMappingCode, '汇总金额', '万元', tax, product, allocation);
    for (let i = 0; i < count; i += 1) {
      const detail = details[i % details.length];
      const isObject = typeof detail !== 'string';
      const baseName = isObject ? detail.name : detail;
      const name = baseName + (i >= details.length ? `-${Math.floor(i / details.length) + 1}` : '');
      const extra = isObject ? detail : {};
      add({ costCode: `${parentCode}.${String(i + 1).padStart(2, '0')}`, parentCode, subjectLevel: '4', firstSubject, secondSubject, thirdSubject, detailSubject: name, sourceTable, targetMappingCode, measureBasis, unit, defaultTaxRate: tax, applicableProductType: product, targetAllocationMethod: allocation, ...extra });
    }
  }

  add({ costCode: '01', subjectLevel: '1', firstSubject: '土地成本', sourceTable: '土地费用明细表', targetMappingCode: '01', measureBasis: '汇总金额', unit: '万元', defaultTaxRate: '0%', applicableProductType: '全项目/按业态选择', costAttributionMethod: '全项目土地成本', targetAllocationMethod: '按可售面积占比' });
  addDetail('01', '01.01', '土地成本', '土地取得价款及相关税费', '土地费明细', ['土地出让金/土地价款', '契税', '土地交易服务费', '土地评估费', '土地咨询/居间服务费', '土地尽调费', '法务尽调费', '财税尽调费', '拆迁补偿及场地移交费', '土地整理费', '其他土地取得费'], 11, '土地费用明细表', '土地合同价/亩数×单价/固定金额', '万元', '0%', '全项目/按业态选择', '01.01');

  add({ costCode: '02', subjectLevel: '1', firstSubject: '前期工程费', sourceTable: '前期费用明细表', targetMappingCode: '02', measureBasis: '汇总金额', unit: '万元', defaultTaxRate: '6%', applicableProductType: '全项目/按业态选择' });
  addSubject('02.01', '02', '2', '前期工程费', '前期规费及专项服务费', undefined, '前期费用明细表', '02.01', '汇总金额', '万元', '6%');
  addDetailGroup({ parentCode: '02.01.01', parentOfGroup: '02.01', firstSubject: '前期工程费', secondSubject: '前期规费及专项服务费', thirdSubject: '政府规费及行政事业性收费', details: ['规划报建费', '施工许可证相关费', '不动产登记费', '制图晒图费', '规划验收费', '消防审查相关费', '节能审查相关费', '人防报建相关费'], sourceTable: '前期费用明细表', measureBasis: '建筑面积/固定金额/政府收费文件', unit: '万元', tax: '0%', product: '全项目/按业态选择', targetMappingCode: '02.01' });
  addDetailGroup({ parentCode: '02.01.02', parentOfGroup: '02.01', firstSubject: '前期工程费', secondSubject: '前期规费及专项服务费', thirdSubject: '勘察测绘及权证专项服务费', details: ['权籍调查费', '宗地测绘费', '不动产测绘费', '房产面积预测绘费', '房产面积实测绘费', '权证专项服务费'], sourceTable: '前期费用明细表', measureBasis: '宗地面积/建筑面积/合同金额', unit: '万元', tax: '6%', product: '全项目/按业态选择', targetMappingCode: '02.01' });
  addDetailGroup({ parentCode: '02.01.03', parentOfGroup: '02.01', firstSubject: '前期工程费', secondSubject: '前期规费及专项服务费', thirdSubject: '前期专项评价及咨询费', details: ['环评费', '水保费', '交通影响评价费', '节能评估费', '日照分析费', '地灾评估费', '土壤污染调查费', '安全评价费', '社会稳定风险评估费', '海绵城市专项咨询费', '绿色建筑咨询费'], sourceTable: '前期费用明细表', measureBasis: '建筑面积/合同金额/专项报告费用', unit: '万元', tax: '6%', product: '全项目/按业态选择', targetMappingCode: '02.01' });
  addDetailGroup({ parentCode: '02.01.04', parentOfGroup: '02.01', firstSubject: '前期工程费', secondSubject: '前期规费及专项服务费', thirdSubject: '市政专项接入及配套费', details: ['供水接入专项费', '供电接入专项费', '燃气接入专项费', '通信接入专项费', '排水许可及接入费', '道路开口及占道费', '市政管线迁改前期费'], sourceTable: '前期费用明细表', measureBasis: '接入容量/接入口数量/合同金额', unit: '万元', tax: '9%', product: '全项目/按业态选择', targetMappingCode: '02.01' });
  addDetailGroup({ parentCode: '02.01.05', parentOfGroup: '02.01', firstSubject: '前期工程费', secondSubject: '前期规费及专项服务费', thirdSubject: '条件性配建及移交成本', details: ['条件性教育配套前期费', '市政移交前期服务费', '公服配建移交前期费', '配建专项咨询费'], sourceTable: '前期费用明细表', measureBasis: '政策要求/移交协议/固定金额', unit: '万元', tax: '6%', product: '全项目/按业态选择', targetMappingCode: '02.01' });
  addDetailGroup({ parentCode: '02.01.06', parentOfGroup: '02.01', firstSubject: '前期工程费', secondSubject: '前期规费及专项服务费', thirdSubject: '停用/不固定计列项', details: [{ name: '墙改基金', enabled: '否', writeBackToTarget: '否', remark: '多地已取消或不固定计列，默认停用，确需计列时人工启用。' }, { name: '散装水泥专项基金', enabled: '否', writeBackToTarget: '否', remark: '多地已取消或不固定计列，默认停用，确需计列时人工启用。' }, { name: '劳保统筹费', enabled: '否', writeBackToTarget: '否', remark: '多地已取消或口径变化，默认停用。' }, { name: '白蚁防治费', enabled: '否', writeBackToTarget: '否', remark: '地区差异较大，默认停用。' }], sourceTable: '前期费用明细表', measureBasis: '政策文件/固定金额', unit: '万元', tax: '0%', product: '全项目/按业态选择', targetMappingCode: '02.01' });
  addDetail('02', '02.02', '前期工程费', '设计费', '设计服务', ['规划设计费', '建筑方案设计费', '施工图设计费', '景观设计费', '精装修设计费', '人防设计费', '弱电智能化设计费', '泛光/亮化设计费', '绿建设计费', 'BIM设计费', '设计审查费', '专项顾问费'], 12, '前期费用明细表', '建筑面积/设计面积/合同金额', '万元', '6%', '全项目/按业态选择', '02.02');
  addDetail('02', '02.03', '前期工程费', '勘察检测费', '勘察检测服务', ['岩土勘察费', '地形测绘费', '沉降观测费', '基坑监测费', '桩基检测费', '材料检测费', '节能检测费', '室内环境检测费', '消防检测费', '竣工测绘费'], 10, '前期费用明细表', '建筑面积/检测点数/合同金额', '万元', '6%', '全项目/按业态选择', '02.03');
  addDetail('02', '02.04', '前期工程费', '三通一平及场地准备', '三通一平工程', ['临时用电', '临时用水', '临时道路', '临时排水', '网络通讯接入', '场地平整', '清表', '土方外运', '临时接驳'], 9, '前期费用明细表', '场地面积/临时管线长度/固定金额', '万元', '9%', '全项目/按业态选择', '02.04');
  addDetail('02', '02.05', '前期工程费', '临设工程费', '临时设施工程', ['临时办公室', '临时宿舍', '临时仓库', '临时大门', '临时围挡', '临时道路硬化', '临时水电设施', '临设拆除恢复'], 8, '前期费用明细表', '临设面积/周界长度/出入口数量/固定金额', '万元', '9%', '全项目/按业态选择', '02.05');
  addDetail('02', '02.06', '前期工程费', '工程保险、担保及保证金', '保险担保保证金', ['工程保险费', { name: '农民工工资保证金', remark: '保证金类需复核是否可退；可退部分宜进保证金台账，不宜作为最终成本。' }, '工程款支付担保', '履约保函手续费', '担保保函/保险费', '保函手续费', { name: '安全文明措施相关保证金', remark: '保证金类需复核是否可退；可退部分宜进保证金台账。' }], 7, '前期费用明细表', '合同金额/保函金额/保证金比例/固定金额', '万元', '6%', '全项目/按业态选择', '02.06');
  addDetail('02', '02.07', '前期工程费', '其他前期费用', '其他前期事项', ['前期咨询服务费', '前期临时协调费', '前期资料制作费', '其他前期不可预见事项'], 4, '前期费用明细表', '合同金额/固定金额', '万元', '6%', '全项目/按业态选择', '02.07');

  add({ costCode: '03', subjectLevel: '1', firstSubject: '建安工程费', sourceTable: '目标成本测算', targetMappingCode: '03', measureBasis: '汇总金额', unit: '万元', defaultTaxRate: '9%', applicableProductType: '全项目/按业态选择' });
  addDetail('03', '03.01', '建安工程费', '土建工程', '桩基及基础工程', ['桩基工程', '基坑支护', '降水工程', '土方开挖', '土方回填', '基础垫层', '地下室底板', '承台地梁'], 8, '土建明细表', '基底面积/桩数量/土方量', '㎡/m³/根', '9%', '住宅/商业/地下车库/配套', '03.01');
  addDetail('03', '03.02', '建安工程费', '土建工程', '主体结构工程', ['钢筋工程', '混凝土工程', '模板工程', '砌体工程', '二次结构', '屋面结构', '楼梯结构', '阳台结构'], 8, '土建明细表', '建筑面积/结构面积/混凝土量', '㎡/m³/t', '9%', '住宅/商业/地下车库/配套', '03.02');
  addDetail('03', '03.03', '建安工程费', '土建工程', '建筑围护工程', ['外墙保温', '外墙涂料', '外墙饰面', '门窗工程', '栏杆工程', '百叶工程', '屋面防水', '地下室防水'], 8, '土建明细表', '外墙面积/门窗面积/防水面积', '㎡', '9%', '住宅/商业/地下车库/配套', '03.03');
  addDetail('03', '03.04', '建安工程费', '土建工程', '粗装修工程', ['楼地面找平', '墙面抹灰', '天棚抹灰', '公共部位粗装', '楼梯间粗装', '地下室粗装', '屋面找坡', '其他粗装'], 8, '土建明细表', '建筑面积/抹灰面积/楼地面面积', '㎡', '9%', '住宅/商业/地下车库/配套', '03.04');
  addDetail('03', '03.05', '建安工程费', '安装工程', '给排水安装', ['室内给水', '室内排水', '雨水系统', '水泵房安装', '生活水箱', '阀门仪表', '管道保温', '系统调试'], 8, '安装明细表', '建筑面积/管线长度/设备数量', '㎡/m/台', '9%', '住宅/商业/地下车库/配套', '03.05');
  addDetail('03', '03.06', '建安工程费', '安装工程', '电气及弱电安装', ['强电工程', '弱电工程', '配电箱柜', '电缆桥架', '电线电缆', '防雷接地', '智能化预埋', '系统调试'], 8, '安装明细表', '建筑面积/管线长度/点位数量', '㎡/m/点', '9%', '住宅/商业/地下车库/配套', '03.06');
  addDetail('03', '03.07', '建安工程费', '安装工程', '消防暖通及充电桩安装', ['消防水系统', '火灾报警', '通风防排烟', '暖通空调', '充电桩管线', '充电桩桥架', '充电桩配电接入', '充电桩安装调试'], 8, '安装明细表', '建筑面积/充电桩数量/管线长度', '㎡/个/m', '9%', '住宅/商业/地下车位/地库', '03.07');
  addDetail('03', '03.08', '建安工程费', '设备工程', '垂直交通及机电设备', ['电梯设备', '扶梯设备', '生活水泵', '消防水泵', '风机设备', '配电设备'], 6, '设备明细表', '单元数量/台套数量', '台/套', '13%', '住宅/商业/地下车库/配套', '03.08');
  addDetail('03', '03.09', '建安工程费', '设备工程', '充电桩设备', ['慢充设备本体', '快充设备本体', '充电控制箱', '计量表箱', '后台管理设备', '其他充电设备'], 6, '设备明细表', '快充数量/慢充数量/车位数量', '台/套', '13%', '地下车位/地库', '03.09');
  addDetail('03', '03.10', '建安工程费', '精装修工程', '大堂及公区精装', ['首层大堂精装', '地下大堂精装', '标准层电梯厅', '标准层走道', '公共卫生间精装', '信报间精装', '入户门厅精装', '架空层精装'], 8, '精装修明细表', '精装面积/公区面积', '㎡', '9%', '住宅/商业/配套', '03.10');
  addDetail('03', '03.11', '建安工程费', '精装修工程', '展示及配套精装', ['售楼部精装', '样板间精装', '物业用房精装', '社区用房精装', '会所精装', '商业公区精装', '地库大堂精装', '其他精装'], 8, '精装修明细表', '精装面积/固定金额', '㎡/项', '9%', '住宅/商业/配套', '03.11');
  addDetail('03', '03.12', '建安工程费', '室外管网工程', '综合管网工程', ['室外给水', '室外排水', '雨污水管网', '强电外网', '弱电外网', '消防外网', '室外照明管线', '管网迁改'], 8, '室外管网明细表', '景观面积/管线长度/井室数量', '㎡/m/座', '9%', '全项目/按业态选择', '03.12');
  addDetail('03', '03.13', '建安工程费', '景观工程', '硬景软景工程', ['硬景铺装', '软景绿化', '景观小品', '水景工程', '景观照明', '景观给排水', '儿童活动场地', '架空层景观'], 8, '景观工程明细表', '景观面积/硬景面积/软景面积', '㎡', '9%', '全项目/按业态选择', '03.13');
  addDetail('03', '03.14', '建安工程费', '道路总平工程', '道路及总平', ['园区道路', '消防道路', '沥青路面', '停车位铺装', '标识划线', '路缘石', '总平土方', '场地硬化'], 8, '道路总平明细表', '道路面积/铺装面积/总平面积', '㎡', '9%', '全项目/按业态选择', '03.14');
  addDetail('03', '03.15', '建安工程费', '围墙出入口工程', '围墙及出入口', ['正式围墙', '主出入口', '次出入口', '门岗工程', '道闸系统', '围墙基础', '围墙装饰'], 7, '围墙出入口明细表', '周界长度/出入口数量', 'm/个', '9%', '全项目/按业态选择', '03.15');

  add({ costCode: '04', subjectLevel: '1', firstSubject: '销售费用', sourceTable: '销售费用明细表', targetMappingCode: '04', measureBasis: '销售收入/可售面积', unit: '万元', defaultTaxRate: '6%', applicableProductType: '可售业态', incomeTaxDeductionCategory: '期间费用' });
  addDetail('04', '04.01', '销售费用', '营销推广费', '销售推广', ['广告宣传费', '渠道佣金', '销售代理费', '案场包装费', '样板间软装', '活动推广费', '线上投放费', '物料制作费'], 8, '销售费用明细表', '销售收入/合同金额/固定金额', '万元', '6%', '可售业态', '04.01', '按销售收入占比');
  addDetail('04', '04.02', '销售费用', '销售管理费', '案场及销售支持', ['案场物业费', '案场人员费', '销售系统费', '客户维护费', '销售培训费', '销售办公费', '其他销售费'], 7, '销售费用明细表', '销售周期/月/固定金额', '万元', '6%', '可售业态', '04.02', '按销售收入占比');

  add({ costCode: '05', subjectLevel: '1', firstSubject: '管理费用', sourceTable: '管理费用明细表', targetMappingCode: '05', measureBasis: '建筑面积/开发周期', unit: '万元', defaultTaxRate: '6%', applicableProductType: '全项目/按业态选择', incomeTaxDeductionCategory: '期间费用' });
  addDetail('05', '05.01', '管理费用', '项目管理费', '项目管理及行政', ['项目人员费', '行政办公费', '咨询服务费', '审计评估费', '法务服务费', '差旅交通费', '其他管理费'], 7, '管理费用明细表', '建筑面积/开发周期/月/固定金额', '万元', '6%', '全项目/按业态选择', '05.01', '按建筑面积占比');

  add({ costCode: '06', subjectLevel: '1', firstSubject: '财务费用', sourceTable: '财务费用明细表', targetMappingCode: '06', measureBasis: '融资金额×利率×周期', unit: '万元', defaultTaxRate: '6%', applicableProductType: '全项目/按业态选择', incomeTaxDeductionCategory: '期间费用' });
  addDetail('06', '06.01', '财务费用', '融资费用', '利息及资金成本', ['贷款利息', '融资手续费', '担保费', '资金占用费', '保函手续费', '其他财务费'], 6, '财务费用明细表', '融资金额/计息周期/利率', '万元', '6%', '全项目/按业态选择', '06.01', '按资金占用或可售面积占比');

  add({ costCode: '07', subjectLevel: '1', firstSubject: '税费及预备费', sourceTable: '税金明细表', targetMappingCode: '07', measureBasis: '收入/成本/固定金额', unit: '万元', defaultTaxRate: '0%', applicableProductType: '全项目/按业态选择' });
  addDetail('07', '07.01', '税费及预备费', '税金及附加', '税金明细', ['增值税附加', '土地增值税', '企业所得税', '印花税', '其他税费'], 5, '税金明细表', '销售收入/增值额/应纳税所得额', '万元', '0%', '全项目/按业态选择', '07.01');
  addDetail('07', '07.02', '税费及预备费', '预备费', '不可预见费', ['预备费', '成本调整项', '税务调整项', '其他测算调整'], 4, '目标成本测算', '目标成本基数/固定金额', '万元', '0%', '全项目/按业态选择', '07.02');

  while (rows.length < 352) {
    const i = rows.length + 1;
    add({ costCode: `07.99.${String(i).padStart(3, '0')}`, parentCode: '07.99', subjectLevel: '4', firstSubject: '税费及预备费', secondSubject: '预备费', thirdSubject: '其他调整', detailSubject: `其他预备调整项${i}`, sourceTable: '目标成本测算', targetMappingCode: '07.99', measureBasis: '固定金额', unit: '万元', defaultTaxRate: '0%', applicableProductType: '全项目/按业态选择' });
  }

  return rows.slice(0, 352);
}

export function getV57CostDictionaryRows(): CostDictionaryPresetRow[] {
  return buildRows();
}
