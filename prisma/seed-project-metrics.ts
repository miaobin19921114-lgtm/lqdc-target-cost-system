import { PrismaClient } from '@prisma/client';
import { v60ProjectMetricDefinitions } from '../data/project-metric-definitions';

const prisma = new PrismaClient();

async function main() {
  for (const metric of v60ProjectMetricDefinitions) {
    await prisma.projectMetricDefinition.upsert({
      where: { key: metric.key },
      update: {
        name: metric.name,
        unit: metric.unit,
        metricGroup: metric.metricGroup,
        scope: metric.scope,
        description: metric.description,
        sortOrder: metric.sortOrder,
        enabled: true
      },
      create: {
        key: metric.key,
        name: metric.name,
        unit: metric.unit,
        metricGroup: metric.metricGroup,
        scope: metric.scope,
        description: metric.description,
        sortOrder: metric.sortOrder,
        enabled: true
      }
    });
  }

  console.log(`Seeded ${v60ProjectMetricDefinitions.length} project metric definitions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
