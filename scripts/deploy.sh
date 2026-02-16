#!/bin/bash
# Usage: ./deploy.sh [all|server|client]

SERVICE=${1:-all}
ENV=production

echo "Deploying $SERVICE to $ENV..."

# This script is intended to be run from CI/CD or locally if SSH keys are configured
# For local use: ensure you have SSH access to the production server

ssh root@37.27.9.38 << EOF
  cd /opt/vist
  git pull origin main
  
  if [ "$SERVICE" = "all" ]; then
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  else
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build $SERVICE
  fi
  
  echo "✅ Deployment complete. Running health checks..."
  ./scripts/health-check.sh
EOF
