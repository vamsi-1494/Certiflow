# CertiFlow &bull; Quick Start & Setup Guide

This guide provides step-by-step instructions for running CertiFlow locally on any Windows, macOS, or Linux workstation.

You can run CertiFlow using either:
* **Option A: 1-Click Docker Compose** (Full multi-container production stack with PostgreSQL and Redis)
* **Option B: Standalone Zero-Configuration Mode** (Runs instantly with Node.js and built-in in-memory fallback stores &mdash; zero external database setup required!)

---

## System Prerequisites

* **Node.js**: v18.18.0 or newer (v20+ recommended)
* **npm**: v9+ (packaged with Node.js)
* **Docker & Docker Compose** *(Only required for Option A)*

---

## Option A: 1-Click Setup with Docker Compose (Recommended for Production)

CertiFlow includes a complete `docker-compose.yml` that provisions PostgreSQL, Redis, the Express TypeScript backend, and the React Vite frontend in isolated containers:

### 1. Clone & Enter the Directory
```bash
git clone <repository-url>
cd certiflow
```

### 2. Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Build & Launch Containers
```bash
docker-compose up --build -d
```

### 4. Verify Running Services
```bash
docker-compose ps
```
You should see 4 active healthy services:
* `certiflow-db`: PostgreSQL 16 on port `5432`
* `certiflow-redis`: Redis 7 on port `6379`
* `certiflow-backend`: Express Node API on port `5000`
* `certiflow-frontend`: Vite React App on port `5173`

### 5. Access the Platform
* **Frontend Dashboard**: Open your browser to `http://localhost:5173`
* **Public Verification Portal**: `http://localhost:5173/verify`
* **Backend Health Check**: `http://localhost:5000/api/health`

### Stopping the Docker Stack
```bash
docker-compose down -v
```

---

## Option B: Standalone Zero-Configuration Quick Start (Hackathon Evaluation Mode)

CertiFlow features an **intelligent dual-runtime engine**. If PostgreSQL or Redis are not running on the evaluator's machine, CertiFlow automatically falls back to an in-memory transactional store and asynchronous in-process queue dispatcher.  
**Every feature, persona, workflow transition, PDF generator, and test runs 100% out of the box with zero setup!**

### 1. Install Backend Dependencies
```bash
cd certiflow/backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. (Optional) Run PostgreSQL Migrations & Seed Data
*Only execute this step if you have a local PostgreSQL instance running and configured in `certiflow/backend/.env`:*
```bash
cd ../backend
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```
*(If PostgreSQL is not running, skip this step! The backend automatically boots with pre-seeded demo personas and sample batches).*

### 4. Start the Backend Server
```bash
cd certiflow/backend
npm run dev
```
The backend server will start on `http://localhost:5000`.

### 5. Start the Frontend Application
In a separate terminal window:
```bash
cd certiflow/frontend
npm run dev
```
Vite will start the client on `http://localhost:5173`. Open this URL in your web browser.

---

## Running Automated Tests

CertiFlow includes **68 automated tests** covering system health, authentication, RBAC, spreadsheet validation, dual-officer concurrency, quality review, certificate generation, WhatsApp decoupling, and public verification.

In the `certiflow/backend` directory, run:
```bash
npm test
```

To run a specific test suite (e.g. the 15 mandatory evaluation scenarios):
```bash
npx vitest run tests/e2e_scenarios.test.ts
```

To check the frontend production build:
```bash
cd certiflow/frontend
npm run build
```

---

## Pre-Configured Demo Credentials

The top bar of the application features a persistent **Persona Switcher** that allows instant 1-click login. Alternatively, you can log in manually using the following credentials:

| Persona | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Anika Sharma** | Training Centre | `anika@apexskills.org` | `password123` |
| **Dev Verma** | District Officer 1 | `dev.verma@bhopal.gov.in` | `password123` |
| **Meera Nair** | District Officer 2 | `meera.nair@bhopal.gov.in` | `password123` |
| **Kabir Das** | District Officer 3 | `kabir.das@bhopal.gov.in` | `password123` |
| **Neha Gupta** | Quality Assurance Team | `neha.gupta@pragati.gov.in` | `password123` |
| **Farah Khan** | State Office Directorate | `farah.khan@pragati.gov.in` | `password123` |

---

## Directory Structure Overview

```
certiflow/
├── docker-compose.yml          # Multi-container orchestration (Postgres, Redis, App)
├── .env.example                # Sample environment configuration
├── README.md                   # Complete architectural and API documentation
├── SETUP.md                    # This setup guide
├── DEPLOYMENT.md               # Production scaling & cloud deployment blueprint
├── backend/                    # Node.js + Express + TypeScript Backend
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma       # 11 Prisma data models & relational schema
│   │   ├── migrations/         # PostgreSQL DDL migrations
│   │   └── seed.ts             # Demo personas & sample batches seed script
│   ├── src/
│   │   ├── controllers/        # Request handlers (auth, batch, approval, state, cert)
│   │   ├── middleware/         # JWT authentication, role guards, error handlers
│   │   ├── queues/             # BullMQ Redis queues & fallback async dispatcher
│   │   ├── routes/             # Express API route modules
│   │   ├── services/           # Core domain logic & state machines
│   │   ├── utils/              # PDFKit generator, QR code builder, SSE manager, Prisma client
│   │   ├── validators/         # Universal CSV/Excel all-or-nothing parser
│   │   └── server.ts           # Express server entrypoint
│   └── tests/                  # 8 Vitest integration & E2E test suites (68 tests)
└── frontend/                   # React 18 + Vite Frontend (JavaScript / JSX)
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── components/         # StatusBadge, StatCard, UploadModal, CreateBatchModal, etc.
        ├── context/            # AuthContext (JWT session management)
        ├── pages/              # TrainingCentre, DistrictOfficer, Quality, State, PublicVerify, CandidateView
        ├── services/           # Axios API client with automatic JWT token attachment
        ├── utils/              # Real-time Server-Sent Events (SSE) hook
        ├── App.jsx             # Router, layout, SSE indicator & live toast notifications
        └── index.css           # Government/Enterprise clean white & light-blue theme
```

---

## Troubleshooting & FAQs

### 1. Port 5000 or 5173 is already in use
* Change the backend port: Update `PORT=5001` in `backend/.env` and `baseURL: 'http://localhost:5001/api'` in `frontend/src/services/api.js`.
* Change the frontend port: Run `npm run dev -- --port 3000` in `frontend/`.

### 2. Can't connect to PostgreSQL (`localhost:5432`)
* CertiFlow does **not require** a running PostgreSQL instance for development and evaluation! The backend automatically detects when the database is unreachable and activates an in-memory transactional store with zero configuration.
* If you wish to use PostgreSQL, start Docker (`docker-compose up -d certiflow-db`) or ensure your local PostgreSQL service is running.

### 3. PDF Certificate storage location
* Generated PDF certificates are written to `certiflow/backend/storage/certificates/`.
* If the storage directory does not exist, the certificate generator creates it automatically on the first run.
