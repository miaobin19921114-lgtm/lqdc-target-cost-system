ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "activeVersionId" TEXT;

UPDATE "Project" p
SET "activeVersionId" = v."id"
FROM (
  SELECT DISTINCT ON ("projectId") "id", "projectId"
  FROM "ProjectVersion"
  ORDER BY "projectId", "createdAt" ASC
) v
WHERE p."id" = v."projectId" AND p."activeVersionId" IS NULL;
