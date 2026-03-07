# VistOS Loan Origination Platform

A slick, multi-tenant loan origination platform with automated Mock APIs for testing complex financial application journeys.

## Project Structure
- **/server**: The Express API & Integration Engine (Port 5000)
- **/client**: The Vite + React Single-Page Application (Port 80 via Nginx in prod, 5173 locally)
- **/docker-compose.yml**: Root orchestrator for full-stack deployment.

## Deployment Instructions

### Option 1: Docker Compose (Local/Production)
You can bring up the entire platform (PostgreSQL Database, Node.js API server, and Nginx-served React App) with a single command:

```bash
docker-compose up -d --build
```

- The API will be exposed on: `http://localhost:5000` (Swagger docs at `/api-docs`)
- The Frontend will be exposed on: `http://localhost:80`
- **Note:** The server's Dockerfile is configured to automatically run `prisma migrate deploy` on startup, ensuring the database schema is immediately synchronized.

### Option 2: CI/CD Pipeline
A robust GitHub Actions workflow is located at `.github/workflows/deploy.yml`. 
By default, pushing to the `main` branch will:
1. Setup Node.js 22 and verify dependencies compile for both front and back ends.
2. Build Docker Images using `docker buildx`.
3. Push those images to `ghcr.io` (GitHub Container Registry).

**Required Secrets:** To use this pipeline, configure your repository's actions to enable `GITHUB_TOKEN` write permissions for package publishing, or supply `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` if pushing to Docker Hub.
