import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Subject = {
  code: string;
  name: string;
  parentCode?: string | null;
  level: number;
  ruleType: 'COST' | 'REVENUE' | 'TAX' | 'FINANCE';
  sortOrder: number;
  participateCost?: boolean;
  participateRevenue?: boolean;
  participateTax?: boolean;
  participateFinance?: boolean;
  showInSummary?: boolean;
  isEnabled?: boolean;
  defaultEnabled?: boolean;
  settlementFeedback?: boolean;
};

const subjects: Subject[] = [
  { code: '01', name: '土地费', level: 1, ruleType: 'COST', sortOrder: 10, participateCost: true },
  { code: '01.01', name: '土地取得价款', parentCode: '01', level: 2, ruleType: 'COST', sortOrder: 11, participateCost: true },
  { code: '01.01.01', name: '土地出让金', parentCode: '01.01', level: 3, ruleType: 'COST', sortOrder: 111, participateCost: true },
  { code: '01.01.02', name: '契税', parentCode: '01.01', level: 3, ruleType: 'COST', sortOrder: 112, participateCost: true },
  { code: '01.01.03', name: '交易服务费', parentCode: '01.01', level: 3, ruleType: 'COST', sortOrder: 113, participateCost: true },
  { code: '01.01.04', name: '土地评估费', parentCode: '01.01', level: 3, ruleType: 'COST', sortOrder: 114, participateCost: true },
  { code: '01.01.05', name: '权籍测绘费', parentCode: '01.01', level: 3, ruleType: 'COST', sortOrder: 115, participateCost: true },
  { code: '01.02', name: '合作开发及其他土地相关成本', parentCode: '01', level: 2, ruleType: 'COST', sortOrder: 12, participateCost: true },
  { code: '01.02.01', name: '合作开发对价', parentCode: '01.02', level: 3, ruleType: 'COST', sortOrder: 121, participateCost: true },
  { code: '01.02.02', name: '股权溢价', parentCode: '01.02', level: 3, ruleType: 'COST', sortOrder: 122, participateCost: true },
  { code: '01.02.03', name: '土地付款财务安排费用', parentCode: '01.02', level: 3, ruleType: 'COST', sortOrder: 123, participateCost: true },

  { code: '02', name: '前期工程费', level: 1, ruleType: 'COST', sortOrder: 20, participateCost: true },
  { code: '02.01', name: '报批报建费', parentCode: '02', level: 2, ruleType: 'COST', sortOrder: 21, participateCost: true },
  { code: '02.01.01', name: '规划报建费', parentCode: '02.01', level: 3, ruleType: 'COST', sortOrder: 211, participateCost: true },
  { code: '02.01.02', name: '人防报建费', parentCode: '02.01', level: 3, ruleType: 'COST', sortOrder: 212, participateCost: true },
  { code: '02.01.03', name: '不动产登记及权籍测绘费', parentCode: '02.01', level: 3, ruleType: 'COST', sortOrder: 213, participateCost: true },
  { code: '02.01.04', name: '制图晒图费', parentCode: '02.01', level: 3, ruleType: 'COST', sortOrder: 214, participateCost: true },
  { code: '02.01.05', name: '环评水保交评能评安评', parentCode: '02.01', level: 3, ruleType: 'COST', sortOrder: 215, participateCost: true },
  { code: '02.02', name: '勘察设计费', parentCode: '02', level: 2, ruleType: 'COST', sortOrder: 22, participateCost: true },
  { code: '02.02.01', name: '地质勘察费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 221, participateCost: true },
  { code: '02.02.02', name: '方案设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 222, participateCost: true },
  { code: '02.02.03', name: '施工图设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 223, participateCost: true },
  { code: '02.02.04', name: '景观设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 224, participateCost: true },
  { code: '02.02.05', name: '精装修设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 225, participateCost: true },
  { code: '02.02.06', name: '幕墙及泛光设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 226, participateCost: true },
  { code: '02.02.07', name: '智能化及综合管网设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 227, participateCost: true },
  { code: '02.02.08', name: 'BIM及专项咨询设计费', parentCode: '02.02', level: 3, ruleType: 'COST', sortOrder: 228, participateCost: true },
  { code: '02.03', name: '三通一平', parentCode: '02', level: 2, ruleType: 'COST', sortOrder: 23, participateCost: true },
  { code: '02.03.01', name: '场地清表及平整', parentCode: '02.03', level: 3, ruleType: 'COST', sortOrder: 231, participateCost: true },
  { code: '02.03.02', name: '临时用水', parentCode: '02.03', level: 3, ruleType: 'COST', sortOrder: 232, participateCost: true },
  { code: '02.03.03', name: '临时用电', parentCode: '02.03', level: 3, ruleType: 'COST', sortOrder: 233, participateCost: true },
  { code: '02.03.04', name: '临时道路', parentCode: '02.03', level: 3, ruleType: 'COST', sortOrder: 234, participateCost: true },
  { code: '02.03.05', name: '临时网络通', parentCode: '02.03', level: 3, ruleType: 'COST', sortOrder: 235, participateCost: true },
  { code: '02.03.06', name: '临时排水', parentCode: '02.03', level: 3, ruleType: 'COST', sortOrder: 236, participateCost: true },
  { code: '02.04', name: '临设围墙及出入口', parentCode: '02', level: 2, ruleType: 'COST', sortOrder: 24, participateCost: true },
  { code: '02.04.01', name: '临时设施', parentCode: '02.04', level: 3, ruleType: 'COST', sortOrder: 241, participateCost: true },
  { code: '02.04.02', name: '围墙工程', parentCode: '02.04', level: 3, ruleType: 'COST', sortOrder: 242, participateCost: true },
  { code: '02.04.03', name: '正式出入口', parentCode: '02.04', level: 3, ruleType: 'COST', sortOrder: 243, participateCost: true },
  { code: '02.04.04', name: '临时出入口', parentCode: '02.04', level: 3, ruleType: 'COST', sortOrder: 244, participateCost: true },
  { code: '02.05', name: '工程保险及担保费用', parentCode: '02', level: 2, ruleType: 'COST', sortOrder: 25, participateCost: true },
  { code: '02.05.01', name: '工程保险费', parentCode: '02.05', level: 3, ruleType: 'COST', sortOrder: 251, participateCost: true },
  { code: '02.05.02', name: '农民工工资保证金', parentCode: '02.05', level: 3, ruleType: 'COST', sortOrder: 252, participateCost: true },
  { code: '02.05.03', name: '工程款支付担保', parentCode: '02.05', level: 3, ruleType: 'COST', sortOrder: 253, participateCost: true },
  { code: '02.05.04', name: '保函手续费', parentCode: '02.05', level: 3, ruleType: 'COST', sortOrder: 254, participateCost: true },
  { code: '02.06', name: '检测测绘及监测', parentCode: '02', level: 2, ruleType: 'COST', sortOrder: 26, participateCost: true },
  { code: '02.06.01', name: '沉降观测', parentCode: '02.06', level: 3, ruleType: 'COST', sortOrder: 261, participateCost: true },
  { code: '02.06.02', name: '基坑监测', parentCode: '02.06', level: 3, ruleType: 'COST', sortOrder: 262, participateCost: true },
  { code: '02.06.03', name: '材料及专项检测', parentCode: '02.06', level: 3, ruleType: 'COST', sortOrder: 263, participateCost: true },
  { code: '02.06.04', name: '竣工测绘及面积测绘', parentCode: '02.06', level: 3, ruleType: 'COST', sortOrder: 264, participateCost: true },

  { code: '03', name: '建安工程费', level: 1, ruleType: 'COST', sortOrder: 30, participateCost: true },
  { code: '03.01', name: '土石方及基坑工程', parentCode: '03', level: 2, ruleType: 'COST', sortOrder: 31, participateCost: true },
  { code: '03.01.01', name: '土石方工程', parentCode: '03.01', level: 3, ruleType: 'COST', sortOrder: 311, participateCost: true },
  { code: '03.01.02', name: '基坑支护', parentCode: '03.01', level: 3, ruleType: 'COST', sortOrder: 312, participateCost: true },
  { code: '03.01.03', name: '降排水工程', parentCode: '03.01', level: 3, ruleType: 'COST', sortOrder: 313, participateCost: true },
  { code: '03.02', name: '桩基及地基处理', parentCode: '03', level: 2, ruleType: 'COST', sortOrder: 32, participateCost: true },
  { code: '03.02.01', name: '桩基工程', parentCode: '03.02', level: 3, ruleType: 'COST', sortOrder: 321, participateCost: true },
  { code: '03.02.02', name: '地基处理', parentCode: '03.02', level: 3, ruleType: 'COST', sortOrder: 322, participateCost: true },
  { code: '03.03', name: '主体结构工程', parentCode: '03', level: 2, ruleType: 'COST', sortOrder: 33, participateCost: true },
  { code: '03.03.01', name: '地上主体结构', parentCode: '03.03', level: 3, ruleType: 'COST', sortOrder: 331, participateCost: true },
  { code: '03.03.02', name: '地下室结构', parentCode: '03.03', level: 3, ruleType: 'COST', sortOrder: 332, participateCost: true },
  { code: '03.03.03', name: '人防结构', parentCode: '03.03', level: 3, ruleType: 'COST', sortOrder: 333, participateCost: true },
  { code: '03.04', name: '建筑及粗装修工程', parentCode: '03', level: 2, ruleType: 'COST', sortOrder: 34, participateCost: true },
  { code: '03.04.01', name: '砌体工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 341, participateCost: true },
  { code: '03.04.02', name: '抹灰工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 342, participateCost: true },
  { code: '03.04.03', name: '楼地面工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 343, participateCost: true },
  { code: '03.04.04', name: '屋面工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 344, participateCost: true },
  { code: '03.04.05', name: '防水工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 345, participateCost: true },
  { code: '03.04.06', name: '保温工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 346, participateCost: true },
  { code: '03.04.07', name: '外墙装饰工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 347, participateCost: true },
  { code: '03.04.08', name: '门窗工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 348, participateCost: true },
  { code: '03.04.09', name: '栏杆栏板工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 349, participateCost: true },
  { code: '03.04.10', name: '入户门及防火门', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 3410, participateCost: true },
  { code: '03.04.11', name: '防火卷帘', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 3411, participateCost: true },
  { code: '03.04.12', name: '烟道工程', parentCode: '03.04', level: 3, ruleType: 'COST', sortOrder: 3412, participateCost: true },
  { code: '03.05', name: '安装工程', parentCode: '03', level: 2, ruleType: 'COST', sortOrder: 35, participateCost: true },
  { code: '03.05.01', name: '给排水工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 351, participateCost: true },
  { code: '03.05.02', name: '强电工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 352, participateCost: true },
  { code: '03.05.03', name: '弱电工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 353, participateCost: true },
  { code: '03.05.04', name: '暖通工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 354, participateCost: true },
  { code: '03.05.05', name: '消防工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 355, participateCost: true },
  { code: '03.05.06', name: '燃气工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 356, participateCost: true },
  { code: '03.05.07', name: '采暖工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 357, participateCost: true },
  { code: '03.05.08', name: '中水工程', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 358, participateCost: true },
  { code: '03.05.09', name: '计量表具及防雷接地', parentCode: '03.05', level: 3, ruleType: 'COST', sortOrder: 359, participateCost: true },
  { code: '03.06', name: '地库及人防专项', parentCode: '03', level: 2, ruleType: 'COST', sortOrder: 36, participateCost: true },
  { code: '03.06.01', name: '地库地坪', parentCode: '03.06', level: 3, ruleType: 'COST', sortOrder: 361, participateCost: true },
  { code: '03.06.02', name: '交通设施', parentCode: '03.06', level: 3, ruleType: 'COST', sortOrder: 362, participateCost: true },
  { code: '03.06.03', name: '标识标牌', parentCode: '03.06', level: 3, ruleType: 'COST', sortOrder: 363, participateCost: true },
  { code: '03.06.04', name: '人防门及人防设备安装', parentCode: '03.06', level: 3, ruleType: 'COST', sortOrder: 364, participateCost: true },

  { code: '04', name: '室外景观及配套', level: 1, ruleType: 'COST', sortOrder: 40, participateCost: true },
  { code: '04.01', name: '综合管网工程', parentCode: '04', level: 2, ruleType: 'COST', sortOrder: 41, participateCost: true },
  { code: '04.01.01', name: '雨污水工程', parentCode: '04.01', level: 3, ruleType: 'COST', sortOrder: 411, participateCost: true },
  { code: '04.01.02', name: '给水及中水工程', parentCode: '04.01', level: 3, ruleType: 'COST', sortOrder: 412, participateCost: true },
  { code: '04.01.03', name: '燃气工程', parentCode: '04.01', level: 3, ruleType: 'COST', sortOrder: 413, participateCost: true },
  { code: '04.01.04', name: '强电外线工程', parentCode: '04.01', level: 3, ruleType: 'COST', sortOrder: 414, participateCost: true },
  { code: '04.01.05', name: '弱电通信及四网合一', parentCode: '04.01', level: 3, ruleType: 'COST', sortOrder: 415, participateCost: true },
  { code: '04.02', name: '道路场地工程', parentCode: '04', level: 2, ruleType: 'COST', sortOrder: 42, participateCost: true },
  { code: '04.02.01', name: '消防道路', parentCode: '04.02', level: 3, ruleType: 'COST', sortOrder: 421, participateCost: true },
  { code: '04.02.02', name: '沥青路面', parentCode: '04.02', level: 3, ruleType: 'COST', sortOrder: 422, participateCost: true },
  { code: '04.02.03', name: '园区铺装', parentCode: '04.02', level: 3, ruleType: 'COST', sortOrder: 423, participateCost: true },
  { code: '04.02.04', name: '地面停车位', parentCode: '04.02', level: 3, ruleType: 'COST', sortOrder: 424, participateCost: true },
  { code: '04.03', name: '景观工程', parentCode: '04', level: 2, ruleType: 'COST', sortOrder: 43, participateCost: true },
  { code: '04.03.01', name: '硬景工程', parentCode: '04.03', level: 3, ruleType: 'COST', sortOrder: 431, participateCost: true },
  { code: '04.03.02', name: '软景工程', parentCode: '04.03', level: 3, ruleType: 'COST', sortOrder: 432, participateCost: true },
  { code: '04.03.03', name: '水景工程', parentCode: '04.03', level: 3, ruleType: 'COST', sortOrder: 433, participateCost: true },
  { code: '04.03.04', name: '儿童活动场地', parentCode: '04.03', level: 3, ruleType: 'COST', sortOrder: 434, participateCost: true },
  { code: '04.03.05', name: '架空层景观', parentCode: '04.03', level: 3, ruleType: 'COST', sortOrder: 435, participateCost: true },
  { code: '04.03.06', name: '景观小品及景观照明', parentCode: '04.03', level: 3, ruleType: 'COST', sortOrder: 436, participateCost: true },
  { code: '04.04', name: '围墙及出入口工程', parentCode: '04', level: 2, ruleType: 'COST', sortOrder: 44, participateCost: true },
  { code: '04.04.01', name: '围墙', parentCode: '04.04', level: 3, ruleType: 'COST', sortOrder: 441, participateCost: true },
  { code: '04.04.02', name: '正式出入口', parentCode: '04.04', level: 3, ruleType: 'COST', sortOrder: 442, participateCost: true },
  { code: '04.04.03', name: '门禁道闸', parentCode: '04.04', level: 3, ruleType: 'COST', sortOrder: 443, participateCost: true },
  { code: '04.05', name: '室外照明及亮化', parentCode: '04', level: 2, ruleType: 'COST', sortOrder: 45, participateCost: true },
  { code: '04.05.01', name: '园区照明', parentCode: '04.05', level: 3, ruleType: 'COST', sortOrder: 451, participateCost: true },
  { code: '04.05.02', name: '泛光照明', parentCode: '04.05', level: 3, ruleType: 'COST', sortOrder: 452, participateCost: true },
  { code: '04.05.03', name: '标识照明', parentCode: '04.05', level: 3, ruleType: 'COST', sortOrder: 453, participateCost: true },

  { code: '05', name: '设备工程', level: 1, ruleType: 'COST', sortOrder: 50, participateCost: true },
  { code: '05.01', name: '电梯设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 51, participateCost: true },
  { code: '05.01.01', name: '住宅电梯', parentCode: '05.01', level: 3, ruleType: 'COST', sortOrder: 511, participateCost: true },
  { code: '05.01.02', name: '商业电梯及扶梯', parentCode: '05.01', level: 3, ruleType: 'COST', sortOrder: 512, participateCost: true },
  { code: '05.01.03', name: '电梯轿厢装修', parentCode: '05.01', level: 3, ruleType: 'COST', sortOrder: 513, participateCost: true },
  { code: '05.02', name: '智能化设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 52, participateCost: true },
  { code: '05.02.01', name: '视频监控', parentCode: '05.02', level: 3, ruleType: 'COST', sortOrder: 521, participateCost: true },
  { code: '05.02.02', name: '周界报警', parentCode: '05.02', level: 3, ruleType: 'COST', sortOrder: 522, participateCost: true },
  { code: '05.02.03', name: '可视对讲及门禁', parentCode: '05.02', level: 3, ruleType: 'COST', sortOrder: 523, participateCost: true },
  { code: '05.02.04', name: '停车场系统', parentCode: '05.02', level: 3, ruleType: 'COST', sortOrder: 524, participateCost: true },
  { code: '05.02.05', name: '电子巡更及机电监控', parentCode: '05.02', level: 3, ruleType: 'COST', sortOrder: 525, participateCost: true },
  { code: '05.02.06', name: '扩声CATV及电信', parentCode: '05.02', level: 3, ruleType: 'COST', sortOrder: 526, participateCost: true },
  { code: '05.03', name: '消防设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 53, participateCost: true },
  { code: '05.03.01', name: '消防泵房设备', parentCode: '05.03', level: 3, ruleType: 'COST', sortOrder: 531, participateCost: true },
  { code: '05.03.02', name: '报警及喷淋设备', parentCode: '05.03', level: 3, ruleType: 'COST', sortOrder: 532, participateCost: true },
  { code: '05.03.03', name: '防排烟设备', parentCode: '05.03', level: 3, ruleType: 'COST', sortOrder: 533, participateCost: true },
  { code: '05.04', name: '供配电设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 54, participateCost: true },
  { code: '05.04.01', name: '高低压柜及变压器', parentCode: '05.04', level: 3, ruleType: 'COST', sortOrder: 541, participateCost: true },
  { code: '05.04.02', name: '发电机及配套设备', parentCode: '05.04', level: 3, ruleType: 'COST', sortOrder: 542, participateCost: true },
  { code: '05.05', name: '给排水设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 55, participateCost: true },
  { code: '05.05.01', name: '水泵及水箱', parentCode: '05.05', level: 3, ruleType: 'COST', sortOrder: 551, participateCost: true },
  { code: '05.05.02', name: '消防水池设备', parentCode: '05.05', level: 3, ruleType: 'COST', sortOrder: 552, participateCost: true },
  { code: '05.06', name: '充电桩设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 56, participateCost: true },
  { code: '05.06.01', name: '慢充充电桩', parentCode: '05.06', level: 3, ruleType: 'COST', sortOrder: 561, participateCost: true },
  { code: '05.06.02', name: '快充充电桩', parentCode: '05.06', level: 3, ruleType: 'COST', sortOrder: 562, participateCost: true },
  { code: '05.06.03', name: '充电桩预留管线', parentCode: '05.06', level: 3, ruleType: 'COST', sortOrder: 563, participateCost: true },
  { code: '05.07', name: '人防设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 57, participateCost: true },
  { code: '05.08', name: '立体车库设备', parentCode: '05', level: 2, ruleType: 'COST', sortOrder: 58, participateCost: true },

  { code: '06', name: '精装修工程', level: 1, ruleType: 'COST', sortOrder: 60, participateCost: true },
  { code: '06.01', name: '住宅公区精装', parentCode: '06', level: 2, ruleType: 'COST', sortOrder: 61, participateCost: true },
  { code: '06.01.01', name: '首层大堂精装', parentCode: '06.01', level: 3, ruleType: 'COST', sortOrder: 611, participateCost: true },
  { code: '06.01.02', name: '地下大堂精装', parentCode: '06.01', level: 3, ruleType: 'COST', sortOrder: 612, participateCost: true },
  { code: '06.01.03', name: '标准层公区及电梯厅精装', parentCode: '06.01', level: 3, ruleType: 'COST', sortOrder: 613, participateCost: true },
  { code: '06.02', name: '批量精装', parentCode: '06', level: 2, ruleType: 'COST', sortOrder: 62, participateCost: true },
  { code: '06.02.01', name: '户内硬装', parentCode: '06.02', level: 3, ruleType: 'COST', sortOrder: 621, participateCost: true },
  { code: '06.02.02', name: '户内软装', parentCode: '06.02', level: 3, ruleType: 'COST', sortOrder: 622, participateCost: true },
  { code: '06.03', name: '售楼部样板间示范区', parentCode: '06', level: 2, ruleType: 'COST', sortOrder: 63, participateCost: true },
  { code: '06.03.01', name: '售楼部硬装', parentCode: '06.03', level: 3, ruleType: 'COST', sortOrder: 631, participateCost: true },
  { code: '06.03.02', name: '售楼部软装', parentCode: '06.03', level: 3, ruleType: 'COST', sortOrder: 632, participateCost: true },
  { code: '06.03.03', name: '样板房硬装', parentCode: '06.03', level: 3, ruleType: 'COST', sortOrder: 633, participateCost: true },
  { code: '06.03.04', name: '样板房软装', parentCode: '06.03', level: 3, ruleType: 'COST', sortOrder: 634, participateCost: true },
  { code: '06.03.05', name: '示范区包装', parentCode: '06.03', level: 3, ruleType: 'COST', sortOrder: 635, participateCost: true },
  { code: '06.04', name: '配套用房精装', parentCode: '06', level: 2, ruleType: 'COST', sortOrder: 64, participateCost: true },
  { code: '06.04.01', name: '物业用房精装', parentCode: '06.04', level: 3, ruleType: 'COST', sortOrder: 641, participateCost: true },
  { code: '06.04.02', name: '社区用房精装', parentCode: '06.04', level: 3, ruleType: 'COST', sortOrder: 642, participateCost: true },
  { code: '06.04.03', name: '会所及商业公区精装', parentCode: '06.04', level: 3, ruleType: 'COST', sortOrder: 643, participateCost: true },

  { code: '07', name: '咨询顾问费', level: 1, ruleType: 'COST', sortOrder: 70, participateCost: true },
  { code: '07.01', name: '监理费', parentCode: '07', level: 2, ruleType: 'COST', sortOrder: 71, participateCost: true },
  { code: '07.02', name: '造价咨询费', parentCode: '07', level: 2, ruleType: 'COST', sortOrder: 72, participateCost: true },
  { code: '07.03', name: '招标代理费', parentCode: '07', level: 2, ruleType: 'COST', sortOrder: 73, participateCost: true },
  { code: '07.04', name: '法律审计财税顾问费', parentCode: '07', level: 2, ruleType: 'COST', sortOrder: 74, participateCost: true },
  { code: '07.05', name: '第三方检测及专项顾问费', parentCode: '07', level: 2, ruleType: 'COST', sortOrder: 75, participateCost: true },

  { code: '08', name: '开发间接费', level: 1, ruleType: 'COST', sortOrder: 80, participateCost: true },
  { code: '08.01', name: '项目管理人员薪酬', parentCode: '08', level: 2, ruleType: 'COST', sortOrder: 81, participateCost: true },
  { code: '08.02', name: '办公差旅费', parentCode: '08', level: 2, ruleType: 'COST', sortOrder: 82, participateCost: true },
  { code: '08.03', name: '行政管理费', parentCode: '08', level: 2, ruleType: 'COST', sortOrder: 83, participateCost: true },
  { code: '08.04', name: '工程管理费', parentCode: '08', level: 2, ruleType: 'COST', sortOrder: 84, participateCost: true },
  { code: '08.05', name: '审计及综合咨询费', parentCode: '08', level: 2, ruleType: 'COST', sortOrder: 85, participateCost: true },

  { code: '09', name: '营销费用', level: 1, ruleType: 'COST', sortOrder: 90, participateCost: true },
  { code: '09.01', name: '推广费', parentCode: '09', level: 2, ruleType: 'COST', sortOrder: 91, participateCost: true },
  { code: '09.02', name: '渠道分销费', parentCode: '09', level: 2, ruleType: 'COST', sortOrder: 92, participateCost: true },
  { code: '09.03', name: '代理销售费', parentCode: '09', level: 2, ruleType: 'COST', sortOrder: 93, participateCost: true },
  { code: '09.04', name: '案场物业及销售服务费', parentCode: '09', level: 2, ruleType: 'COST', sortOrder: 94, participateCost: true },
  { code: '09.05', name: '售楼处样板间示范区费用', parentCode: '09', level: 2, ruleType: 'COST', sortOrder: 95, participateCost: true },

  { code: '10', name: '财务费用', level: 1, ruleType: 'COST', sortOrder: 100, participateCost: true },
  { code: '10.01', name: '资本化利息', parentCode: '10', level: 2, ruleType: 'COST', sortOrder: 101, participateCost: true },
  { code: '10.02', name: '费用化利息', parentCode: '10', level: 2, ruleType: 'COST', sortOrder: 102, participateCost: true },
  { code: '10.03', name: '融资手续费', parentCode: '10', level: 2, ruleType: 'COST', sortOrder: 103, participateCost: true },
  { code: '10.04', name: '担保费', parentCode: '10', level: 2, ruleType: 'COST', sortOrder: 104, participateCost: true },

  { code: '11', name: '预备费', level: 1, ruleType: 'COST', sortOrder: 110, participateCost: true },
  { code: '11.01', name: '基本预备费', parentCode: '11', level: 2, ruleType: 'COST', sortOrder: 111, participateCost: true },
  { code: '11.02', name: '价差预备费', parentCode: '11', level: 2, ruleType: 'COST', sortOrder: 112, participateCost: true },
  { code: '11.03', name: '风险预备费', parentCode: '11', level: 2, ruleType: 'COST', sortOrder: 113, participateCost: true },

  { code: '12', name: '税金', level: 1, ruleType: 'TAX', sortOrder: 120, participateTax: true },
  { code: '12.01', name: '增值税', parentCode: '12', level: 2, ruleType: 'TAX', sortOrder: 121, participateTax: true },
  { code: '12.02', name: '附加税', parentCode: '12', level: 2, ruleType: 'TAX', sortOrder: 122, participateTax: true },
  { code: '12.02.01', name: '城建税', parentCode: '12.02', level: 3, ruleType: 'TAX', sortOrder: 1221, participateTax: true },
  { code: '12.02.02', name: '教育费附加', parentCode: '12.02', level: 3, ruleType: 'TAX', sortOrder: 1222, participateTax: true },
  { code: '12.02.03', name: '地方教育附加', parentCode: '12.02', level: 3, ruleType: 'TAX', sortOrder: 1223, participateTax: true },
  { code: '12.02.04', name: '水利建设基金', parentCode: '12.02', level: 3, ruleType: 'TAX', sortOrder: 1224, participateTax: true },
  { code: '12.03', name: '土地增值税', parentCode: '12', level: 2, ruleType: 'TAX', sortOrder: 123, participateTax: true },
  { code: '12.04', name: '企业所得税', parentCode: '12', level: 2, ruleType: 'TAX', sortOrder: 124, participateTax: true },
  { code: '12.05', name: '印花税及其他税费', parentCode: '12', level: 2, ruleType: 'TAX', sortOrder: 125, participateTax: true },

  { code: 'R01', name: '住宅销售收入', level: 1, ruleType: 'REVENUE', sortOrder: 1001, participateRevenue: true },
  { code: 'R02', name: '商业销售及租赁收入', level: 1, ruleType: 'REVENUE', sortOrder: 1002, participateRevenue: true },
  { code: 'R03', name: '车位销售及租赁收入', level: 1, ruleType: 'REVENUE', sortOrder: 1003, participateRevenue: true },
  { code: 'R04', name: '其他收入', level: 1, ruleType: 'REVENUE', sortOrder: 1004, participateRevenue: true },

  { code: 'F01', name: '现金流计划', level: 1, ruleType: 'FINANCE', sortOrder: 2001, participateFinance: true },
  { code: 'F02', name: '融资计划', level: 1, ruleType: 'FINANCE', sortOrder: 2002, participateFinance: true },
  { code: 'F03', name: 'IRR', level: 1, ruleType: 'FINANCE', sortOrder: 2003, participateFinance: true },
  { code: 'F04', name: '税前税后净利润', level: 1, ruleType: 'FINANCE', sortOrder: 2004, participateFinance: true },
  { code: 'F05', name: '资金峰值', level: 1, ruleType: 'FINANCE', sortOrder: 2005, participateFinance: true },
];

function q(value: string | null | undefined) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function pathOf(subject: Subject) {
  const parts: string[] = [subject.name];
  let cursor = subject.parentCode;
  while (cursor) {
    const parent = subjects.find((item) => item.code === cursor && item.ruleType === subject.ruleType);
    if (!parent) break;
    parts.unshift(parent.name);
    cursor = parent.parentCode || null;
  }
  return parts.join(' > ');
}

function ruleDefaults(subject: Subject) {
  const root = subject.code.split('.')[0];
  const defaults: Record<string, { table: string; fields: string; basis: string; formula: string; unit: string }> = {
    '01': { table: '项目概况表,土地费用明细表,税费参数表', fields: '土地成交价,土地面积,土地面积亩,计容建筑面积,契税税率,交易服务费,土地评估费,权籍测绘费,合作开发对价,股权溢价,土地付款节点', basis: '土地合同及税费参数', formula: '土地成交价 + 契税 + 交易服务费 + 评估费 + 其他土地相关成本', unit: '元/项目' },
    '02': { table: '项目概况表,工程量指标表,前期费用明细表,建造配置标准', fields: '总建筑面积,计容建筑面积,土地面积,周界长度,出入口数量,临设面积,场地平整面积,临水容量,临电容量,报规报建固定费用,三通一平单价,围墙单价,出入口单价', basis: '参数化前期工程量', formula: '工程量 × 单价 或 固定费用', unit: '元/㎡,元/m,元/个,元/项' },
    '03': { table: '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库', fields: '地上建筑面积,地下建筑面积,可售面积,不可售面积,基底面积,桩基面积,标准层面积,户数,单元数,楼栋数,地下室层数,层高,人防面积,非人防面积,外立面面积,门窗面积,屋面面积,防水面积,保温面积,栏杆长度,土方量,结构形式,配置档次', basis: '业态拆分 + 工程量含量法', formula: '工程量 × 单价 × 系数', unit: '元/㎡,元/m,元/m³,元/项' },
    '04': { table: '项目概况表,工程量指标表,建造配置标准,量价指标库', fields: '景观面积,硬景面积,软景面积,绿化面积,水景面积,儿童活动场地面积,道路面积,消防道路面积,沥青道路面积,综合管网面积,管线长度,周界长度,围墙长度,正式出入口数量,临时出入口数量,景观档次,道路做法,管网配置', basis: '景观面积/道路面积/周界长度/出入口数量/管线长度', formula: '分项工程量 × 对应单价', unit: '元/㎡,元/m,元/个,元/项' },
    '05': { table: '项目概况表,工程量指标表,建造配置标准,量价指标库', fields: '电梯台数,单元数量,楼栋数量,充电桩数量,快充数量,慢充数量,预留充电桩数量,人防面积,防护单元数量,消防设备面积,配电房数量,水泵房数量,消防水池容量,停车场系统数量,弱电系统配置,设备档次', basis: '设备数量 + 系统配置', formula: '设备数量 × 设备单价 + 系统面积 × 系统单价', unit: '元/台,元/套,元/个,元/㎡' },
    '06': { table: '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库', fields: '大堂面积,地下大堂面积,公区面积,售楼部面积,样板房面积,批量精装面积,物业用房面积,社区用房面积,商业公区面积,精装交付范围,精装标准,售楼部软装范围,样板房软装范围', basis: '精装部位面积 + 配置档次', formula: '精装面积 × 精装单价 + 软装专项费用', unit: '元/㎡,元/项' },
    '07': { table: '项目概况表,前期费用明细表,合同结算表', fields: '总建筑面积,计容建筑面积,合同金额,服务范围,监理费率,造价咨询费率,设计咨询费率,招标代理费率,第三方检测费率,咨询服务周期', basis: '面积/合同金额/费率/固定费用', formula: '计费基数 × 费率 或 固定费用', unit: '元/㎡,%,元/项' },
    '08': { table: '项目概况表,财务测算表,合同结算表', fields: '项目开发周期,项目人员配置,管理费率,办公费用,差旅费用,行政费用,工程管理费用,开发间接费分摊周期,建筑面积,可售面积', basis: '开发周期 + 管理配置 + 面积分摊', formula: '项目周期 × 月度管理费用 或 建筑面积 × 管理单方', unit: '元/月,元/㎡,元/项' },
    '09': { table: '收入明细表,销售计划表,财务测算表', fields: '销售收入,可售面积,销售周期,营销费率,渠道费率,案场费用,广告推广费用,示范区包装费用,销售代理费,销售节点,去化计划', basis: '销售收入/可售面积/销售周期/费率', formula: '销售收入 × 营销费率 + 固定营销费用 + 渠道费用', unit: '%,元/月,元/㎡,元/项' },
    '10': { table: '财务测算表,现金流计划表,融资计划表', fields: '融资金额,融资利率,融资周期,放款节点,还款节点,销售回款计划,资本化周期,费用化周期,资金占用额,资金峰值,现金流计划', basis: '融资金额 + 利率 + 资金占用周期', formula: '资金占用额 × 利率 × 占用时间', unit: '%,元/月,元/年' },
    '11': { table: '目标成本汇总表,风险清单,动态成本表', fields: '计费基数,预备费率,风险等级,未决事项金额,暂估价金额,待明确工程范围,成本偏差率,动态成本余额', basis: '计费基数 + 风险等级 + 未决事项', formula: '计费基数 × 预备费率 + 风险专项预留', unit: '%,元/项' },
    '12': { table: '收入明细表,成本分摊测算表,税费参数表,土地增值税测算表,企业所得税测算表', fields: '销售收入,不含税收入,销项税额,进项税额,不可抵扣进项税,附加税率,土地成本,开发成本,开发费用,加计扣除率,清算对象,可售面积,建筑面积,土地增值税税率,所得税税率,税前扣除口径', basis: '收入、成本、税率、清算对象', formula: '按税种规则计算', unit: '%,元' },
    R01: { table: '收入明细表,业态产品表,销售计划表', fields: '住宅可售面积,住宅销售单价,销售套数,户数,去化率,签约节奏,回款节奏,增值税税率,销售折扣,销售节点', basis: '住宅可售面积 × 销售单价 × 去化率', formula: '住宅可售面积 × 销售单价 × 去化率', unit: '元/㎡,套,元' },
    R02: { table: '商业收入表,业态产品表,销售计划表', fields: '商业可售面积,商业销售单价,商业租金,出租率,租期,销售比例,持有比例,增值税税率,招商周期,运营收入', basis: '商业销售/租赁组合测算', formula: '销售收入 + 租赁收入 + 运营收入', unit: '元/㎡,元/㎡/月,年' },
    R03: { table: '车位收入表,业态产品表,销售计划表', fields: '地下产权车位数量,地下使用权车位数量,人防车位数量,地上车位数量,车位销售单价,车位租金,车位去化率,车位销售节点,增值税税率,充电桩是否含价', basis: '车位数量 × 单价 × 去化率', formula: '可售车位数量 × 单价 × 去化率', unit: '元/个,元/月' },
    R04: { table: '其他收入表,销售计划表,财务测算表', fields: '收入类型,收入金额,确认条件,确认时间,是否含税,增值税税率,政策依据,确定性等级,现金流节点', basis: '收入事项清单', formula: '各项其他收入汇总', unit: '元/项' },
    F01: { table: '财务测算表,现金流计划表', fields: '总投资,销售收入,回款计划,付款计划,净现金流,现金流计划', basis: '现金流计划', formula: '按月度现金流滚动计算', unit: '元,月' },
    F02: { table: '财务测算表,融资计划表', fields: '融资金额,融资利率,融资周期,资本化周期,费用化周期,资金峰值', basis: '融资计划', formula: '资金占用额 × 利率 × 占用时间', unit: '元,%,月' },
    F03: { table: '财务测算表,现金流计划表', fields: 'IRR,净现金流,销售收入,总投资', basis: 'IRR', formula: '基于净现金流计算内部收益率', unit: '%' },
    F04: { table: '财务测算表,利润表', fields: '税前经营利润,所得税,净利润,净利率,销售收入', basis: '利润表', formula: '税后净利 = 税前经营利润 - 所得税', unit: '元,%' },
    F05: { table: '财务测算表,现金流计划表', fields: '资金峰值,融资金额,回款计划,付款计划,现金流计划', basis: '资金峰值', formula: '按月度现金流测算最大资金占用', unit: '元' },
  };
  return defaults[root] || defaults[subject.code] || { table: '项目概况表', fields: '总建筑面积,可售面积,建筑面积', basis: '参数化测算', formula: '工程量 × 单价', unit: '元/㎡' };
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
  for (const subject of subjects) {
    const subjectPath = pathOf(subject);
    await safeExecute(`upsert subject ${subject.code} ${subject.name}`, `
      INSERT INTO "TemplateRuleSubject" (
        "id", "templateCode", "ruleType", "subjectCode", "subjectName", "parentCode", "level", "subjectPath",
        "isEnabled", "isDefaultEnabled", "participateCost", "participateRevenue", "participateTax", "participateFinance",
        "showInSummary", "allowProjectOverride", "allowVersionOverride", "sortOrder"
      ) VALUES (
        ${q(`residential-v1-${subject.ruleType}-${subject.code}`)}, 'residential-v1', ${q(subject.ruleType)}, ${q(subject.code)}, ${q(subject.name)}, ${q(subject.parentCode)}, ${subject.level}, ${q(subjectPath)},
        ${subject.isEnabled === false ? 'FALSE' : 'TRUE'}, ${subject.defaultEnabled === false ? 'FALSE' : 'TRUE'},
        ${subject.participateCost ? 'TRUE' : 'FALSE'}, ${subject.participateRevenue ? 'TRUE' : 'FALSE'}, ${subject.participateTax ? 'TRUE' : 'FALSE'}, ${subject.participateFinance ? 'TRUE' : 'FALSE'},
        ${subject.showInSummary === false ? 'FALSE' : 'TRUE'}, TRUE, TRUE, ${subject.sortOrder}
      )
      ON CONFLICT ("templateCode", "ruleType", "subjectCode") DO UPDATE SET
        "subjectName" = EXCLUDED."subjectName", "parentCode" = EXCLUDED."parentCode", "level" = EXCLUDED."level", "subjectPath" = EXCLUDED."subjectPath",
        "participateCost" = EXCLUDED."participateCost", "participateRevenue" = EXCLUDED."participateRevenue", "participateTax" = EXCLUDED."participateTax", "participateFinance" = EXCLUDED."participateFinance",
        "showInSummary" = EXCLUDED."showInSummary", "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = CURRENT_TIMESTAMP
    `);
  }

  const parentCodes = new Set(subjects.map((item) => item.parentCode).filter(Boolean));
  const leafSubjects = subjects.filter((item) => !parentCodes.has(item.code));

  for (const subject of leafSubjects) {
    const defaults = ruleDefaults(subject);
    await safeExecute(`upsert rule ${subject.code} ${subject.name}`, `
      INSERT INTO "TemplateUnifiedRule" (
        "id", "templateCode", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel",
        "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula",
        "costAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment",
        "isEnabled", "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
      ) VALUES (
        ${q(`rule-residential-v1-${subject.ruleType}-${subject.code}-L3`)}, 'residential-v1', ${q(subject.ruleType)}, ${q(subject.code)}, ${q(subject.name)}, '目标成本', 'L3 目标测算',
        ${q(defaults.table)}, ${q(defaults.fields)}, ${q(defaults.basis)}, ${q(defaults.basis)}, ${q(defaults.unit)}, '模板默认指标库', ${q(defaults.formula)},
        '按受益对象直接归属，不能直接归属时按面积或收入分摊', '直接归属优先；公共成本按建筑面积/可售面积/清算对象分摊', '含税价拆分不含税金额和税额', '按清算对象和扣除类别处理', '按成本对象和税前扣除口径处理', '按现金流和利润表处理',
        TRUE, TRUE, TRUE, ${subject.settlementFeedback === false ? 'FALSE' : 'TRUE'}, ${subject.sortOrder}
      )
      ON CONFLICT ("templateCode", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO UPDATE SET
        "subjectName" = EXCLUDED."subjectName", "dataSourceTable" = EXCLUDED."dataSourceTable", "requiredFields" = EXCLUDED."requiredFields",
        "measureBasis" = EXCLUDED."measureBasis", "quantityFormula" = EXCLUDED."quantityFormula", "pricingUnit" = EXCLUDED."pricingUnit",
        "unitPriceSource" = EXCLUDED."unitPriceSource", "amountFormula" = EXCLUDED."amountFormula", "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = CURRENT_TIMESTAMP
    `);
  }

  console.log(`V60 residential subject tree ensured: ${subjects.length} subjects, ${leafSubjects.length} leaf rules.`);
}

main().finally(async () => prisma.$disconnect());
