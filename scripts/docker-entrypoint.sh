#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Please configure it in .env."
  exit 1
fi

export PORT="${PORT:-3000}"
export UPLOAD_DIR="${UPLOAD_DIR:-/app/storage/uploads}"
mkdir -p "$UPLOAD_DIR"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js on port ${PORT}..."
npx next start -p "$PORT"
