ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "sourceProjectId" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "sourceProjectName" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sourceTemplateId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sourceTemplateName" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sourceTemplateType" TEXT;
CREATE INDEX IF NOT EXISTS "Template_sourceProjectId_idx" ON "Template"("sourceProjectId");
CREATE INDEX IF NOT EXISTS "Project_sourceTemplateId_idx" ON "Project"("sourceTemplateId");
