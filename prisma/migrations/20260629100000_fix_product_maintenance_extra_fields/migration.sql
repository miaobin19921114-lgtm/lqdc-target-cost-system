-- Additive fix for product maintenance page raw SQL fields.
-- Do not drop or alter existing columns; only backfill missing optional text fields.

ALTER TABLE "ProductType"
ADD COLUMN IF NOT EXISTS "incomeTaxCostObject" TEXT,
ADD COLUMN IF NOT EXISTS "productCategory" TEXT,
ADD COLUMN IF NOT EXISTS "saleAttribute" TEXT,
ADD COLUMN IF NOT EXISTS "costObject" TEXT,
ADD COLUMN IF NOT EXISTS "clearingObject" TEXT;
