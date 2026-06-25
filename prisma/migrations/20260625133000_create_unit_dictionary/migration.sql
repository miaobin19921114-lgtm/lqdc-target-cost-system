CREATE TABLE IF NOT EXISTS "UnitDictionary" (
  "id" TEXT NOT NULL,
  "unitType" TEXT NOT NULL,
  "unitName" TEXT NOT NULL,
  "unitDescription" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UnitDictionary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UnitDictionary_unitType_unitName_key"
ON "UnitDictionary"("unitType", "unitName");

CREATE INDEX IF NOT EXISTS "UnitDictionary_unitType_idx"
ON "UnitDictionary"("unitType");

CREATE INDEX IF NOT EXISTS "UnitDictionary_isEnabled_idx"
ON "UnitDictionary"("isEnabled");
