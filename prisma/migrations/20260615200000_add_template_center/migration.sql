CREATE TABLE "Template" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT '住宅开发',
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateProduct" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isSaleable" BOOLEAN NOT NULL DEFAULT true,
  "participateAllocation" BOOLEAN NOT NULL DEFAULT true,
  "allocationWeight" DECIMAL(65,30) NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "remark" TEXT,
  CONSTRAINT "TemplateProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateCostRule" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "costCode" TEXT,
  "category" TEXT,
  "subjectName" TEXT NOT NULL,
  "sourceTable" TEXT,
  "measureBasis" TEXT,
  "unit" TEXT,
  "defaultTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,
  "allocationMethod" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "remark" TEXT,
  CONSTRAINT "TemplateCostRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateTaxRule" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "scope" TEXT,
  "remark" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TemplateTaxRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateProduct_templateId_name_key" ON "TemplateProduct"("templateId", "name");
CREATE INDEX "TemplateProduct_templateId_idx" ON "TemplateProduct"("templateId");
CREATE INDEX "TemplateCostRule_templateId_idx" ON "TemplateCostRule"("templateId");
CREATE INDEX "TemplateTaxRule_templateId_idx" ON "TemplateTaxRule"("templateId");

ALTER TABLE "TemplateProduct" ADD CONSTRAINT "TemplateProduct_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateCostRule" ADD CONSTRAINT "TemplateCostRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateTaxRule" ADD CONSTRAINT "TemplateTaxRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Template" ("id", "name", "type", "description", "isDefault", "sortOrder") VALUES
('tpl_residential_standard', '住宅开发目标成本标准模板', '住宅开发', '适用于住宅、底商、地下车位、配套、公区、景观及税费的默认测算框架。', true, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TemplateProduct" ("id", "templateId", "category", "name", "isSaleable", "participateAllocation", "allocationWeight", "sortOrder", "remark") VALUES
('tp_highrise', 'tpl_residential_standard', '住宅类', '高层住宅', true, true, 1, 1, '默认可售业态'),
('tp_midrise', 'tpl_residential_standard', '住宅类', '小高层住宅', true, true, 1, 2, '默认可售业态'),
('tp_villa', 'tpl_residential_standard', '住宅类', '别墅/合院', true, true, 1, 3, '按项目需要选择'),
('tp_shop', 'tpl_residential_standard', '商业商办', '底商', true, true, 1, 10, '默认可售业态'),
('tp_parking', 'tpl_residential_standard', '车位储藏', '地下产权车位', true, true, 1, 20, '车位收入进入收入明细表'),
('tp_prop', 'tpl_residential_standard', '配套用房', '物业用房', false, false, 0, 30, '不可售配套'),
('tp_community', 'tpl_residential_standard', '配套用房', '社区用房', false, false, 0, 31, '不可售配套'),
('tp_basement', 'tpl_residential_standard', '地下空间', '非主楼纯地库', false, true, 1, 40, '参与成本分摊'),
('tp_demo', 'tpl_residential_standard', '专项区域', '示范区', false, false, 0, 50, '销售展示相关区域')
ON CONFLICT ("templateId", "name") DO NOTHING;

INSERT INTO "TemplateCostRule" ("id", "templateId", "costCode", "category", "subjectName", "sourceTable", "measureBasis", "unit", "defaultTaxRate", "allocationMethod", "sortOrder", "remark") VALUES
('tcr_land', 'tpl_residential_standard', '01', '一级科目', '土地费', '土地费用明细表', '土地面积/成交总价', '元', 0, '直接归属/按受益对象', 1, '项目里录入土地费明细'),
('tcr_pre', 'tpl_residential_standard', '02', '一级科目', '前期工程费', '前期费用明细表', '建筑面积/专项工程量', '元', 0.06, '按受益对象/建筑面积', 2, '规费、设计、勘察等'),
('tcr_build', 'tpl_residential_standard', '03', '一级科目', '建安工程', '土建明细表', '建筑面积/基底/构件工程量', '元/㎡', 0.09, '按业态直接归属', 3, '土建主表'),
('tcr_install', 'tpl_residential_standard', '04', '一级科目', '安装工程', '安装明细表', '建筑面积/设备数量', '元/㎡', 0.09, '按业态直接归属', 4, '水电暖通消防等'),
('tcr_landscape', 'tpl_residential_standard', '05', '一级科目', '景观及总平', '景观工程明细表', '景观面积/硬景/软景/道路', '元/㎡', 0.09, '按受益对象', 5, '室外景观总平'),
('tcr_device', 'tpl_residential_standard', '06', '一级科目', '设备工程', '设备明细表', '台/套/系统', '元/台', 0.09, '按受益对象', 6, '电梯、智能化等'),
('tcr_tax', 'tpl_residential_standard', '10', '一级科目', '税金', '税金明细表', '收入/成本/清算口径', '元', 0, '按税法清算', 10, '税率进入模板税率')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TemplateTaxRule" ("id", "templateId", "name", "rate", "scope", "remark", "sortOrder") VALUES
('tt_vat', 'tpl_residential_standard', '增值税', 0.09, '销售收入', '销售收入含税拆不含税', 1),
('tt_city', 'tpl_residential_standard', '城建税', 0.07, '增值税额', '附加税组成', 2),
('tt_edu', 'tpl_residential_standard', '教育费附加', 0.03, '增值税额', '附加税组成', 3),
('tt_local_edu', 'tpl_residential_standard', '地方教育附加', 0.02, '增值税额', '附加税组成', 4),
('tt_income', 'tpl_residential_standard', '企业所得税', 0.25, '税前利润', '所得税测算默认值', 5)
ON CONFLICT ("id") DO NOTHING;
