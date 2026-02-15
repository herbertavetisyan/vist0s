# VistOs - Loan Origination System

VistOs is a modern Loan Origination System (LOS) built with Node.js, Express, Prisma, PostgreSQL, and React.

## Features
- **User Roles**: Admin, Credit Officer, Relationship Manager, Approver.
- **Loan Workflow**: Configurable stages (Application -> Review -> Approval -> Disbursement).
- **Product Configuration**: Flexible loan products (Personal, Mortgage, Business, etc.).
- **Partner Integration**: API for external partners (Mobile Banking, etc.).
- **Audit Logging**: Comprehensive action tracking.

## Prerequisites
- Node.js (v18+)
- Docker (for PostgreSQL database)

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    # This installs dependencies for root, server, and client
    ```

2.  **Start Database**:
    ```bash
    ./scripts/start-db.sh
    # Starts PostgreSQL in a Docker container on port 5432
    ```

3.  **Setup Database**:
    ```bash
    cd server
    npx prisma migrate dev --name init
    npx prisma db seed
    ```

4.  **Run Application**:
    ```bash
    # From project root
    npm run dev
    ```
    - Client: http://localhost:5173
    - Server: http://localhost:3000

## API Documentation
- `POST /api/v1/external/applications`: Submit loan application (Partner API)
- `GET /api/loans`: List loans (Internal)

## Tech Stack
- **Backend**: Express.js, Prisma ORM
- **Database**: PostgreSQL
- **Frontend**: React, Vite, TailwindCSS
