import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function writeOperationLog(
  tx: Tx,
  input: {
    projectId: string;
    versionId?: string | null;
    module: string;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    beforeData?: unknown;
    afterData?: unknown;
    operatorName?: string | null;
    remark?: unknown;
  }
) {
  await tx.$executeRaw`
    CREATE TABLE IF NOT EXISTS "OperationLog" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT,
      "projectVersionId" TEXT,
      "module" TEXT,
      "action" TEXT NOT NULL,
      "targetType" TEXT,
      "targetId" TEXT,
      "beforeData" TEXT,
      "afterData" TEXT,
      "operatorName" TEXT,
      "remark" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await tx.$executeRaw`
    INSERT INTO "OperationLog" ("id", "projectId", "projectVersionId", "module", "action", "targetType", "targetId", "beforeData", "afterData", "operatorName", "remark")
    VALUES (
      ${randomUUID()},
      ${input.projectId},
      ${input.versionId || null},
      ${input.module},
      ${input.action},
      ${input.targetType || null},
      ${input.targetId || null},
      ${input.beforeData === undefined ? null : JSON.stringify(input.beforeData)},
      ${input.afterData === undefined ? null : JSON.stringify(input.afterData)},
      ${input.operatorName || 'system'},
      ${input.remark === undefined ? null : JSON.stringify(input.remark)}
    )
  `;
}
