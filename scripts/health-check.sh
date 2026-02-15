#!/bin/bash
# Basic health check script for LOS services

echo "Running health checks..."

# Check Backend
if curl -s http://localhost:3000/health | grep -q '"status":"ok"'; then
  echo "✅ Backend is HEALTHY"
else
  echo "❌ Backend is UNHEALTHY"
fi

# Check Frontend (Port 8080 in prod config)
if curl -s -I http://localhost:8080 | grep -q "200 OK"; then
  echo "✅ Frontend is HEALTHY"
else
  echo "❌ Frontend is UNHEALTHY"
fi
