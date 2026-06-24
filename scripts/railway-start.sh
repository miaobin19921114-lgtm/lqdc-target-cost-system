#!/usr/bin/env sh
set -eu

LOG_FILE="/tmp/railway-start.log"
: > "$LOG_FILE"

run_quiet() {
  name="$1"
  shift
  echo "[startup] ${name}..."
  if "$@" >> "$LOG_FILE" 2>&1; then
    echo "[startup] ${name} ok"
  else
    echo "[startup] ${name} failed; showing last 120 log lines"
    tail -n 120 "$LOG_FILE" || true
    exit 1
  fi
}

run_npm_quiet() {
  name="$1"
  script="$2"
  echo "[startup] ${name}..."
  if npm run --silent "$script" >> "$LOG_FILE" 2>&1; then
    echo "[startup] ${name} ok"
  else
    echo "[startup] ${name} failed; showing last 120 log lines"
    tail -n 120 "$LOG_FILE" || true
    exit 1
  fi
}

echo "[startup] Railway bootstrapping database and seed data"
run_quiet "prisma db push" npx prisma db push --accept-data-loss

run_npm_quiet "database foundation" db:ensure:foundation
run_npm_quiet "buildings fields" db:ensure:buildings
run_npm_quiet "product type fields" db:ensure:product-types-extra
run_npm_quiet "cost fields" db:ensure:cost-extra
run_npm_quiet "measure rule fields" db:ensure:measure-rules-extra
run_npm_quiet "price indicator fields" db:ensure:price-indicators-extra
run_npm_quiet "revenue tax fields" db:ensure:revenue-tax-extra
run_npm_quiet "procurement contract fields" db:ensure:procurement-contract-extra
run_npm_quiet "dynamic cost fields" db:ensure:dc-extra
run_npm_quiet "financial fields" db:ensure:financial-extra
run_npm_quiet "AI knowledge fields" db:ensure:ai-extra
run_npm_quiet "base seed" db:seed
run_npm_quiet "product type seed" db:seed:product-types
run_npm_quiet "cost subject seed" db:seed:cost-subjects
run_npm_quiet "cost calculation rules" db:ensure:cost-calculation-rules
run_npm_quiet "cost tax fields" db:ensure:cost-calculation-rule-tax-fields
run_npm_quiet "land subject normalization" db:normalize:land-subject-names
run_npm_quiet "rule template center" db:ensure:rule-template-center
run_npm_quiet "V60 subject tree" db:ensure:v60-residential-subject-tree
run_npm_quiet "high precision fields" db:ensure:residential-template-high-precision-fields
run_npm_quiet "leaf rule details" db:ensure:leaf-rule-calculation-details
run_npm_quiet "L1-L5 precision rules" db:ensure:l1-l5-precision-rules
run_npm_quiet "template field definitions" db:ensure:template-field-definitions
run_npm_quiet "project rule snapshots" db:ensure:project-rule-snapshots
run_npm_quiet "version rule snapshots" db:ensure:version-rule-snapshots
run_npm_quiet "rule governance" db:ensure:rule-governance
run_npm_quiet "detail calculation results" db:ensure:detail-calculation-results
run_npm_quiet "project metrics seed" db:seed:project-metrics
run_npm_quiet "measure rules seed" db:seed:measure-rules
run_npm_quiet "price indicators seed" db:seed:price-indicators
run_npm_quiet "metric values sync" db:sync:metric-values
run_npm_quiet "V60 land sync" db:sync:v60-land

echo "[startup] Database bootstrap complete; starting Next.js"
exec next start -H 0.0.0.0 -p "${PORT:-3000}"
