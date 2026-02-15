# Development Guide

Welcome to the VistLos development guide. This document explains how to set up your local environment and follow our development workflow.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## Local Setup

The easiest way to get started is by running the setup script:

```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

This will:
1. Create your local `.env.development` file.
2. Start the PostgreSQL database in Docker.
3. Install all dependencies for both client and server.
4. Run database migrations.

## Running the Application

### Option 1: Manual (Hot Reload)

Start the backend:
```bash
npm run server
```

Start the frontend:
```bash
cd client
npm run dev
```

### Option 2: Docker Compose (Production-like)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Development Workflow

We use **Trunk-Based Development**:

1. **Main Branch**: Always production-ready.
2. **Feature Branches**: Use short-lived branches (`feature/your-feature`) for larger changes.
3. **Commits**: Small, frequent commits are preferred.
4. **Pull Requests**: Open a PR to `main` for review. Once approved, it will be merged and automatically deployed (with an approval gate).

## Deployment

Deployments are handled automatically via GitHub Actions.

- **CI**: Runs on every push to verify builds.
- **Production**: Deploys to `www.vist.am` when code is pushed to `main` (requires manual approval in GitHub).

To deploy manually or selectively:
```bash
./scripts/deploy.sh [all|server|client]
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Connection string for PostgreSQL |
| `JWT_SECRET` | Secret key for JWT signing |
| `ENRICHMENT_MOCK_MODE` | Set to 'true' to use simulated data for external APIs |
