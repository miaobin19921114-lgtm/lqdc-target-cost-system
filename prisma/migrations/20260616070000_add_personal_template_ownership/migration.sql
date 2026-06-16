ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "baseTemplateId" TEXT;
CREATE INDEX IF NOT EXISTS "Template_ownerId_idx" ON "Template"("ownerId");
CREATE INDEX IF NOT EXISTS "Template_baseTemplateId_idx" ON "Template"("baseTemplateId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Template_ownerId_fkey'
  ) THEN
    ALTER TABLE "Template" ADD CONSTRAINT "Template_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
