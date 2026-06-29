import type { ExcelPreviewResponse } from '@/lib/excel-v60';

const PREVIEW_TTL_MS = 30 * 60 * 1000;

type StoredPreview = {
  importId: string;
  projectId: string;
  versionId: string;
  fileName: string;
  buffer: Buffer;
  preview: ExcelPreviewResponse['data'];
  createdAt: number;
  expiresAt: number;
};

type StoreGlobal = typeof globalThis & {
  __lqdcExcelImportPreviews?: Map<string, StoredPreview>;
};

function store() {
  const globalStore = globalThis as StoreGlobal;
  if (!globalStore.__lqdcExcelImportPreviews) globalStore.__lqdcExcelImportPreviews = new Map();
  return globalStore.__lqdcExcelImportPreviews;
}

function cleanup(now = Date.now()) {
  for (const [key, value] of store()) {
    if (value.expiresAt <= now) store().delete(key);
  }
}

export function saveExcelImportPreview(input: Omit<StoredPreview, 'createdAt' | 'expiresAt'>) {
  const now = Date.now();
  cleanup(now);
  store().set(input.importId, {
    ...input,
    createdAt: now,
    expiresAt: now + PREVIEW_TTL_MS
  });
}

export function getExcelImportPreview(importId: string) {
  cleanup();
  return store().get(importId) || null;
}
