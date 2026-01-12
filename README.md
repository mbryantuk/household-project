# Totem: Multi-Tenant Household Management System

Totem is a high-performance, multi-tenant Household Management SaaS designed with an **Asset-First** approach. It treats every household item not just as data, but as a financial asset that integrates directly into a monthly budget and maintenance forecast.

## 🚀 Key Features

*   **SaaS Architecture:** Global User System allowing single sign-on across multiple households.
*   **Strict Multi-Tenancy:** Secure data isolation using tenant-specific database contexts.
*   **Modern UI/UX:** Built with **MUI Joy UI** for a sleek, modern aesthetic.
    *   **Theme Options:** Supports Light, Dark, and a custom **Dracula/Alucard** high-contrast theme.
    *   **Dynamic Layout:** Salesforce-style bottom Utility Bar with **Taskbar-like expansion** and integrated **Status Bar**.
    *   **Financial Tools:** Built-in Compound Interest and Mortgage/Loan calculators.
*   **Enhanced Unified Calendar:** 
    *   **Pop-out Support:** Open the Calendar, Calculator, or Financial Tools in separate windows for multi-screen workflows.
    *   **Financial Integration:** Automated expansion of recurring costs onto the calendar.
    *   **Bank Holiday Support:** Automated import of UK Bank Holidays (gov.uk API).
    *   **Smart Scheduling:** Support for "Nearest Working Day" logic (prior working day) for recurring items.
*   **Asset-First Financial Modeling:**
    *   **Appliance Register:** Track purchase value, replacement cost, and depreciation for all household items.
    *   **Vehicle Fleet Management:** Comprehensive tracking of service history, finance agreements, insurance, and MOT/Tax schedules.
*   **Physical Asset CRUD with Date Tracking:** Full lifecycle management for Vehicles, Assets, and Energy accounts with automated date-based tracking (MOT, Warranty, Contract Ends).
*   **Role-Based Access Control (RBAC):** Granular permissions supporting Admin (Full Access), Member (Standard), and Viewer (Read-only) roles.

## 🛠️ Tech Stack

*   **Frontend:** React 19, Vite, **MUI Joy UI**, React Router 6.
*   **Backend:** Node.js, Express 5, JWT Authentication.
*   **Database:** SQLite (Global Registry + Individual Tenant Databases).
*   **DevOps:** Docker, Docker Compose, GitHub Actions Ready.

## 📦 Setup & Installation

### Prerequisites
*   Docker & Docker Compose
*   Node.js 20+

### Quick Start (Production)
```bash
# Build and start the unified container
docker compose up -d --build
```
Access the application at `http://localhost:4001`.

### Development Setup
```bash
# Install server dependencies
cd server && npm install

# Install web dependencies
cd ../web && npm install

# Run backend
cd ../server && npm start

# Run frontend (in a separate terminal)
cd ../web && npm run dev
```

## 🧪 Testing & Verification
The system includes a comprehensive multi-tier testing suite:
1. **CRUD Isolation:** Verified in `server/tests/comprehensive_crud.test.js`. Covers all entities (Members, Assets, Vehicles, etc.) with strict tenant isolation.
2. **Performance:** Benchmarked in `server/tests/performance.test.js`. Monitors API latency and concurrent load capacity.
3. **Stress & Security:** Combinatorial role-based access control (RBAC) verification in `server/tests/stress_matrix.test.js`.

**Commands:**
- `npm test`: Run all core tests.
- `npm run test:perf`: Run performance benchmarks.
- `./deploy_verify.sh`: Full deployment, verification, and commit cycle.

## 🛡️ Security & Privacy
*   **Global User Store:** Centralized user management with secure password hashing.
*   **Tenant Isolation:** Data isolation at the database file level.
*   **Context Enforcement:** Middleware enforcement of household context for every API request.
*   **Zero Leakage:** No cross-tenant data leakages (Verified via Automated Isolation Tests).