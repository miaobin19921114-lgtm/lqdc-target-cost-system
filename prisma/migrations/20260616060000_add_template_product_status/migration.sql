ALTER TABLE "TemplateProduct" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TemplateProduct" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "TemplateProduct_templateId_isActive_idx" ON "TemplateProduct"("templateId", "isActive");
