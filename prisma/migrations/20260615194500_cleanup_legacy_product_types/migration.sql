-- 清理早期概况表里误生成的非标准业态，避免“其它 / 高层”和标准“高层住宅”重复显示。
UPDATE "CostLine"
SET "productTypeId" = NULL
WHERE "productTypeId" IN (
  SELECT id FROM "ProductType" WHERE name IN ('其它', '其他', '高层')
);

DELETE FROM "RevenueLine"
WHERE "productTypeId" IN (
  SELECT id FROM "ProductType" WHERE name IN ('其它', '其他', '高层')
);

DELETE FROM "ProductType"
WHERE name IN ('其它', '其他', '高层');
