import { PrismaClient } from '@prisma/client';
import { productTypePresets } from '../data/product-type-presets';

const prisma = new PrismaClient();

async function main() {
  for (const preset of productTypePresets) {
    await prisma.productTypePreset.upsert({
      where: { key: preset.key },
      update: {
        name: preset.name,
        category: preset.category,
        isSaleable: preset.isSaleable,
        participateAllocation: preset.participateAllocation,
        defaultVatRate: preset.defaultVatRate,
        defaultAllocationMethod: preset.defaultAllocationMethod,
        defaultIncomeType: preset.defaultIncomeType,
        description: preset.description,
        enabled: true,
        sortOrder: preset.sortOrder
      },
      create: {
        key: preset.key,
        name: preset.name,
        category: preset.category,
        isSaleable: preset.isSaleable,
        participateAllocation: preset.participateAllocation,
        defaultVatRate: preset.defaultVatRate,
        defaultAllocationMethod: preset.defaultAllocationMethod,
        defaultIncomeType: preset.defaultIncomeType,
        description: preset.description,
        enabled: true,
        sortOrder: preset.sortOrder
      }
    });
  }

  console.log(`Seeded ${productTypePresets.length} product type presets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
