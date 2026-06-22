import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Field = { table: string; name: string; type: string; index?: boolean };

const fields: Field[] = [
  { table: 'AIKnowledgeDocument', name: 'documentType', type: "TEXT DEFAULT 'cost_document'", index: true },
  { table: 'AIKnowledgeDocument', name: 'sourceType', type: "TEXT DEFAULT 'upload'", index: true },
  { table: 'AIKnowledgeDocument', name: 'projectName', type: 'TEXT', index: true },
  { table: 'AIKnowledgeDocument', name: 'region', type: 'TEXT', index: true },
  { table: 'AIKnowledgeDocument', name: 'city', type: 'TEXT', index: true },
  { table: 'AIKnowledgeDocument', name: 'businessType', type: 'TEXT', index: true },
  { table: 'AIKnowledgeDocument', name: 'fileUrl', type: 'TEXT' },
  { table: 'AIKnowledgeDocument', name: 'parseStatus', type: "TEXT DEFAULT 'pending'", index: true },
  { table: 'AIKnowledgeDocument', name: 'confidence', type: 'DECIMAL(18,4) DEFAULT 0' },

  { table: 'AIKnowledgeChunk', name: 'chunkType', type: "TEXT DEFAULT 'paragraph'", index: true },
  { table: 'AIKnowledgeChunk', name: 'sectionTitle', type: 'TEXT' },
  { table: 'AIKnowledgeChunk', name: 'keywordTags', type: 'TEXT' },
  { table: 'AIKnowledgeChunk', name: 'relatedCostCode', type: 'TEXT', index: true },
  { table: 'AIKnowledgeChunk', name: 'relatedProductType', type: 'TEXT', index: true },
  { table: 'AIKnowledgeChunk', name: 'embeddingStatus', type: "TEXT DEFAULT 'pending'", index: true },
  { table: 'AIKnowledgeChunk', name: 'confidence', type: 'DECIMAL(18,4) DEFAULT 0' },

  { table: 'AICostBenchmark', name: 'benchmarkType', type: "TEXT DEFAULT 'unit_cost'", index: true },
  { table: 'AICostBenchmark', name: 'region', type: 'TEXT', index: true },
  { table: 'AICostBenchmark', name: 'city', type: 'TEXT', index: true },
  { table: 'AICostBenchmark', name: 'productType', type: 'TEXT', index: true },
  { table: 'AICostBenchmark', name: 'standardLevel', type: 'TEXT', index: true },
  { table: 'AICostBenchmark', name: 'costCode', type: 'TEXT', index: true },
  { table: 'AICostBenchmark', name: 'costName', type: 'TEXT' },
  { table: 'AICostBenchmark', name: 'measureBasis', type: 'TEXT' },
  { table: 'AICostBenchmark', name: 'unit', type: 'TEXT' },
  { table: 'AICostBenchmark', name: 'lowValue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'AICostBenchmark', name: 'typicalValue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'AICostBenchmark', name: 'highValue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'AICostBenchmark', name: 'taxRate', type: 'DECIMAL(18,4) DEFAULT 0.09' },
  { table: 'AICostBenchmark', name: 'sampleCount', type: 'INTEGER DEFAULT 0' },
  { table: 'AICostBenchmark', name: 'dataSource', type: 'TEXT' },
  { table: 'AICostBenchmark', name: 'effectiveDate', type: 'TEXT', index: true },
  { table: 'AICostBenchmark', name: 'confidence', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'AICostBenchmark', name: 'reviewStatus', type: "TEXT DEFAULT 'draft'", index: true }
];

async function main() {
  for (const field of fields) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${field.table}" ADD COLUMN IF NOT EXISTS "${field.name}" ${field.type}`);
    if (field.index) {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${field.table}_${field.name}_idx" ON "${field.table}" ("${field.name}")`);
    }
  }
  console.log('Ensured AI knowledge and benchmark extra fields.');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
