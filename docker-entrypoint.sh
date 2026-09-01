#!/bin/sh
set -e

echo "==> Applying database migrations..."
npx prisma migrate deploy

echo "==> Starting MTG Arena Tracker on port ${PORT:-3000}"
exec node server.js
