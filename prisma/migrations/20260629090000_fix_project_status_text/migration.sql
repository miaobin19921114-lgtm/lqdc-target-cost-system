DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ProjectVersion'
      AND column_name = 'status'
      AND udt_name NOT IN ('text', 'varchar')
  ) THEN
    ALTER TABLE "ProjectVersion"
      ALTER COLUMN "status" DROP DEFAULT;

    ALTER TABLE "ProjectVersion"
      ALTER COLUMN "status" TYPE TEXT USING "status"::text;

    ALTER TABLE "ProjectVersion"
      ALTER COLUMN "status" SET DEFAULT 'draft';
  END IF;
END $$;

ALTER TABLE "ProjectVersion"
  ALTER COLUMN "status" SET DEFAULT 'draft';
