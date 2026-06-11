#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Running seed..."
npm run db:seed || true

echo "Starting Next.js on port ${PORT:-3000}..."
npx next start -p "${PORT:-3000}"
