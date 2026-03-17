#!/bin/bash
set -e

echo "Starting TicketFlow..."

# Check for .env.local
if [ ! -f ".env.local" ]; then
  echo "⚠️  No .env.local found. Copying from example..."
  cp .env.local.example .env.local
  echo "✅ Created .env.local — please edit it with your API keys before continuing."
  echo "   At minimum, set JWT_SECRET and ENCRYPTION_KEY."
  exit 1
fi

# Load env vars so prisma can see DATABASE_URL
set -a
source .env.local
set +a

# Start Docker postgres
echo "Starting PostgreSQL..."
docker compose up -d

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker compose exec db pg_isready -U ticketflow > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL ready."

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start Next.js
echo "Starting app at http://localhost:3000"
npm run dev
