---
description: Run the VistOS project (server + client + database)
---

# Run VistOS Project & Database

IMPORTANT: Always use `docker compose` (with a space, V2) — NEVER `docker-compose` (with a hyphen, V1). The V1 CLI is installed but incompatible with the compose file format used in this project.

// turbo-all
1. Navigate to the project root and bring up all services (db, server, client) with a fresh dev build:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

// turbo
2. Verify all containers are running:
```bash
docker compose ps
```

// turbo
3. Check server logs to confirm the API is healthy (migrations run automatically on startup):
```bash
docker compose logs server --tail=30
```

## Service URLs
- **Frontend**: http://localhost:8080
- **API**: http://localhost:5000
- **API Docs (Swagger)**: http://localhost:5000/api-docs
- **DB port (external)**: localhost:5435

## Useful commands
- Stop all: `docker compose down`
- Stop + wipe DB: `docker compose down -v`
- Tail all logs: `docker compose logs -f`
- Tail server only: `docker compose logs -f server`
- Re-seed DB: `docker compose exec server npx prisma db seed`
