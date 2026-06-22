#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Please configure it in .env."
  exit 1
fi

export PORT="${PORT:-3000}"
export UPLOAD_DIR="${UPLOAD_DIR:-/app/storage/uploads}"
mkdir -p "$UPLOAD_DIR"

echo "Upload directory: ${UPLOAD_DIR}"
echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Ensuring database foundation tables..."
npm run db:ensure:foundation || true
echo "Ensuring project building table..."
npm run db:ensure:buildings || true
echo "Ensuring product type extra fields..."
npm run db:ensure:product-types-extra || true
echo "Ensuring cost extra fields..."
npm run db:ensure:cost-extra || true
echo "Ensuring measure rule extra fields..."
npm run db:ensure:measure-rules-extra || true
echo "Ensuring price indicator extra fields..."
npm run db:ensure:price-indicators-extra || true

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "Running seed..."
  npm run db:seed || true
  echo "Seeding product type presets..."
  npm run db:seed:product-types || true
  echo "Seeding cost subjects..."
  npm run db:seed:cost-subjects || true
  echo "Seeding project metric definitions..."
  npm run db:seed:project-metrics || true
  echo "Seeding measure basis rules..."
  npm run db:seed:measure-rules || true
  echo "Seeding price indicators..."
  npm run db:seed:price-indicators || true
  echo "Syncing project metric values..."
  npm run db:sync:metric-values || true
  echo "Syncing V60 land cost subjects..."
  npm run db:sync:v60-land || true
fi

echo "Starting Next.js on port ${PORT}..."
npx next start -p "$PORT"
