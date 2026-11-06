#!/bin/sh
set -e

# Generate Prisma Client
npx prisma generate

# Apply pending database migrations
npx prisma migrate deploy

# Execute CMD with process replacement so signals (SIGTERM/SIGINT) are handled cleanly
exec "$@"
