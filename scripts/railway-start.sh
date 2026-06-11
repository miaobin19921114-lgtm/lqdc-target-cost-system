#!/usr/bin/env sh
set -eu

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Running seed..."
npm run db:seed || true

echo "Starting Next.js on port ${PORT:-8080}..."
npx next start -p "${PORT:-8080}"
