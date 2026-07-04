-- Add optional soft-delete metadata for project recycle bin support.
-- This migration is additive only and does not drop or rewrite existing data.

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT,
ADD COLUMN IF NOT EXISTS "deleteReason" TEXT,
ADD COLUMN IF NOT EXISTS "purgeAfter" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Project_deletedAt_idx" ON "Project"("deletedAt");
