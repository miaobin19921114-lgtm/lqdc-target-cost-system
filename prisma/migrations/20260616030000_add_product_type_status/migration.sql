ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ProductType_projectVersionId_isActive_idx" ON "ProductType"("projectVersionId", "isActive");
