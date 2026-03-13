#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  TicketFlow — First-Time Setup"
echo "============================================"
echo ""

# ── Check Docker ──────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker is not installed."
  echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running."
  echo "Please open Docker Desktop and wait for it to start, then run this script again."
  exit 1
fi

# ── Create .env if missing ────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "Setting up your configuration..."
  echo ""

  read -rp "  Choose a login password for the app: " LOCAL_PASSWORD
  echo ""

  # Generate random secrets automatically
  JWT_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48 || true)
  DB_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 || true)

  cat > .env <<EOF
LOCAL_PASSWORD=${LOCAL_PASSWORD}
JWT_SECRET=${JWT_SECRET}
DB_PASSWORD=${DB_PASSWORD}
EOF

  echo "  Configuration saved to .env"
  echo ""
else
  echo ".env already exists — skipping configuration."
  echo ""
fi

# ── Build and start ───────────────────────────────────────────────────────────
echo "Building and starting TicketFlow (this may take a few minutes the first time)..."
echo ""
docker compose up -d --build

echo ""
echo "============================================"
echo "  TicketFlow is running!"
echo "  Open http://localhost:3000 in your browser"
echo "============================================"
echo ""
echo "To stop:    docker compose stop"
echo "To start:   docker compose start"
echo "To restart: docker compose restart"
echo ""
