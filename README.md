# Hearthstone: Multi-Tenant Household Management System

Hearthstone is a high-performance, multi-tenant Household Management SaaS designed with an **Asset-First** approach. It treats every household item not just as data, but as a financial asset that integrates directly into a monthly budget and maintenance forecast.

## 🚀 Key Features

- **SaaS Architecture:** Global User System allowing single sign-on across multiple households.
  - **Tenant Export:** Admins can export a full tenant's data (database + metadata + users) as a portable zip for backups or migration.
  - **Passkey Support:** Secure, passwordless login using WebAuthn (TouchID, FaceID, YubiKey).
- **Strict Multi-Tenancy:** Secure data isolation using tenant-specific database contexts.
- **Modern UI/UX:** Built with **MUI Joy UI** for a sleek, modern aesthetic.
  - **Theme Library:** Includes a comprehensive library of **100+ vibrant themes** (Light and Dark) stored at the user level, featuring a **visualized palette selector** for precise selection.
  - **Dynamic Layout:** Salesforce-style bottom Utility Bar with **Taskbar-like expansion**, integrated **Status Bar**, and **scrollbar-free** widget interfaces with quick-access logout.
  - **Financial Tools:** Built-in Compound Interest and Mortgage/Loan calculators.
- **Enhanced Unified Calendar:**
  - **Pop-out Support:** Open the Calendar, Calculator, or Financial Tools in separate windows for multi-screen workflows.
  - **Financial Integration:** Automated expansion of recurring costs onto the calendar.
  - **Bank Holiday Support:** Automated import of UK Bank Holidays (gov.uk API).
  - **Smart Scheduling:** Support for "Nearest Working Day" logic (prior working day) for recurring items.
- **Asset-First Financial Modeling:**
  - **Appliance Register:** Track purchase value, replacement cost, and depreciation for all household items.
  - **Advanced Data Views:** Desktop-optimized **DataGrid** with inline sorting/filtering and Mobile-optimized **Card Views** for assets.
  - **Risk Management:** Integrated `insurance_status` tracking (Insured/Uninsured/Self-Insured) across all asset categories.
  - **Vehicle Fleet Management:** Comprehensive tracking of service history, finance agreements, insurance, and MOT/Tax schedules.
  - **Savings & Investments:** Goal-oriented savings with pots, forecasts, and interest tracking.
- **Physical Asset CRUD with Date Tracking:** Full lifecycle management for Vehicles, Assets, and Energy accounts with automated date-based tracking (MOT, Warranty, Contract Ends).
- **Meal Planning Module:**
  - **Advanced Scheduling:** Interactive weekly meal planner with assignment logic.
  - **Library System:** Reusable meal library with emoji support and quick-copy functionality.
  - **Smart Copy:** "Copy Previous Week" feature with intelligent date shifting.
  - **Responsive Design:** Optimized **Mobile Card View** for shopping on the go, and **Desktop Grid View** for planning.
  - **Status Indicators:** Visual cues for days with incomplete meal assignments.
- **Role-Based Access Control (RBAC):** Granular permissions supporting Admin (Full Access), Member (Standard), and Viewer (Read-only) roles.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, **MUI Joy UI**, React Router 6.
- **Backend:** Node.js, Express 5, JWT Authentication.
- **Database:** SQLite (Global Registry + Individual Tenant Databases).
- **DevOps:** Docker, Docker Compose, GitHub Actions Ready.

## 📦 Setup & Installation

### Prerequisites

- Docker & Docker Compose
- Node.js 20+

### Quick Start (Production)

```bash
# Build and start the unified container
docker compose up -d --build
```

Access the application at `http://localhost:4001`.

### Demo Environment (The Brady Master Seed)

For testing and demonstration purposes, you can generate a comprehensive household (The Brady Bunch) populated with complex financial data, vehicles, assets, and recurring costs:

```bash
# Ensure the server is running, then execute:
node scripts/ops/seed_brady_household.js
```

This script creates a realistic multi-generational household with 11 members, 2 vehicles, multiple assets, and 30+ recurring costs including utilities, insurance, and pocket money.

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

- **Global User Store:** Centralized user management with secure password hashing.
- **Tenant Isolation:** Data isolation at the database file level.
- **Context Enforcement:** Middleware enforcement of household context for every API request.
- **Zero Leakage:** No cross-tenant data leakages (Verified via Automated Isolation Tests).

## 📚 Documentation

For deeper technical details, please refer to the internal documentation:

- **[Database Schema](docs/SCHEMA.md):** Detailed breakdown of Global vs. Tenant tables and field types.
- **[Solution Architecture](docs/ARCHITECTURE.md):** High-level topology, security patterns, and frontend/backend design.

## 🐛 Debug Mode

Hearthside includes a dual-layer debug system for troubleshooting:

1.  **Household Debug Mode:** Enabled via **Settings > Household Settings**. This enables verbose logging in the browser console (Axios requests/responses) and detailed server-side request logging for all members of that household.
2.  **System Debug Mode:** Enabled by setting the environment variable `DEBUG=true` on the server. This provides low-level logging for all incoming traffic, including headers and auth-header presence, regardless of household settings.
