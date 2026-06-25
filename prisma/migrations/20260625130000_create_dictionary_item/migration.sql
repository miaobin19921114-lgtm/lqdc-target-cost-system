CREATE TABLE IF NOT EXISTS "DictionaryItem" (
  "id" TEXT NOT NULL,
  "dictionaryType" TEXT NOT NULL,
  "dictionaryCode" TEXT NOT NULL,
  "dictionaryName" TEXT NOT NULL,
  "defaultPrecisionLevel" TEXT,
  "defaultSubjectDepth" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "remark" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DictionaryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DictionaryItem_dictionaryType_dictionaryCode_key"
ON "DictionaryItem"("dictionaryType", "dictionaryCode");

CREATE INDEX IF NOT EXISTS "DictionaryItem_dictionaryType_idx"
ON "DictionaryItem"("dictionaryType");

CREATE INDEX IF NOT EXISTS "DictionaryItem_isEnabled_idx"
ON "DictionaryItem"("isEnabled");
