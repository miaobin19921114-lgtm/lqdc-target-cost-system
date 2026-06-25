UPDATE "TemplateProduct"
SET "name" = '设备条件项',
    "remark" = COALESCE("remark", '') || '; legacy charging product renamed by seed validation cleanup',
    "isActive" = false
WHERE "name" ILIKE '%充电桩%'
   OR "name" ILIKE '%charging%';

UPDATE "ProductTypePreset"
SET "key" = 'legacy_disabled_equipment_option',
    "name" = '设备条件项',
    "description" = COALESCE("description", '') || '; legacy charging preset renamed by seed validation cleanup',
    "enabled" = false
WHERE "key" ILIKE '%charging%'
   OR "name" ILIKE '%充电桩%';

INSERT INTO "CostSubject" ("id", "code", "name", "level", "parentCode", "fullPath", "defaultTaxRate", "defaultAllocationMethod", "enabled", "sortOrder")
VALUES ('cost-subject-07-99', '07.99', '开发间接费补充科目', 2, '07', '开发间接费 > 开发间接费补充科目', 0.09, '按建筑面积', true, 799)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "level" = EXCLUDED."level",
  "parentCode" = EXCLUDED."parentCode",
  "fullPath" = EXCLUDED."fullPath",
  "defaultTaxRate" = EXCLUDED."defaultTaxRate",
  "defaultAllocationMethod" = EXCLUDED."defaultAllocationMethod",
  "enabled" = EXCLUDED."enabled",
  "sortOrder" = EXCLUDED."sortOrder";
