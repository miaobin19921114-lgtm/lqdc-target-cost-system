# Prisma schema V1 check

## Current branch

- Branch: `feat/database-prisma-v1`
- PR: #6
- Status: Draft

## Correction made

The first version of PR #6 replaced the legacy Prisma schema directly. That was too risky because existing UI/API code may still depend on legacy Prisma models such as:

- `ProjectVersion`
- `CostLine`
- `RevenueLine`
- `TaxParameter`
- `ImportBatch`
- `ProjectMetricValue`
- `CostDictionaryRow`

The branch has now been corrected to a safer additive approach:

1. Keep all legacy models from the previous schema.
2. Append first-stage target cost MVP models.
3. Use scalar ID links first for the new models to avoid breaking existing relation backrefs.
4. Keep the PR as Draft until validation passes.

## Added first-stage MVP models

- `ProjectInitialization`
- `EstimateVersion`
- `EstimateProductType`
- `ProjectOverviewIndicator`
- `ProductTypeIndicator`
- `QuantityIndicator`
- `BuildingStandard`
- `DetailSubject`
- `QuantityRule`
- `UnitDictionary`
- `PriceTaxRule`
- `AllocationRule`
- `EstimateDetailLine`
- `RevenueEstimate`
- `TaxEstimate`
- `TargetCostSummary`
- `ProjectCostDashboard`
- `ExcelMapping`
- `VersionOperation`
- `CalculationCheck`
- `RegionParameter`
- `DictionaryItem`

## Required verification before merge

Run locally or in CI:

```bash
npx prisma validate
npx prisma generate
npm run build
```

Only after these pass should the PR be marked ready for review.
