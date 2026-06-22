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

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "Running seed..."
  npm run db:seed || true
  echo "Seeding product type presets..."
  npm run db:seed:product-types || true
  echo "Seeding project metric definitions..."
  npm run db:seed:project-metrics || true
  echo "Syncing V60 land cost subjects..."
  npm run db:sync:v60-land || true
fi

echo "Starting Next.js on port ${PORT}..."
npx next start -p "$PORT"
