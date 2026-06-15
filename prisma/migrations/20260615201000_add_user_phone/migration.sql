ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

UPDATE "User"
SET "phone" = COALESCE(NULLIF(current_setting('app.admin_phone', true), ''), NULL)
WHERE "email" = COALESCE(NULLIF(current_setting('app.admin_email', true), ''), 'admin@lqdc.local')
  AND "phone" IS NULL;
