#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Please add DATABASE_URL in Railway service Variables and redeploy."
  exit 1
fi

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Running seed..."
npm run db:seed || true

echo "Starting Next.js on port ${PORT:-8080}..."
npx next start -p "${PORT:-8080}"
