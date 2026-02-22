# Solution Architecture

Hearthstone is architected as a **Self-Contained Multi-Tenant SaaS** designed for deployment on low-cost hardware (e.g., Raspberry Pi) or cloud containers. It prioritizes data privacy, low latency, and ease of backup.

---

## 1. High-Level Topology

```mermaid
graph TD
    Client[Browser (React 19)] <--> API[Node.js Express API]
    API <--> GlobalDB[(Global SQLite Registry)]
    API <--> Router{Tenant Router}
    Router <--> DB1[(Household A DB)]
    Router <--> DB2[(Household B DB)]
    Router <--> DB3[(Household ... DB)]
```

- **Client:** Single Page Application (SPA) served via Vite/Nginx.
- **Server:** Monolithic Node.js process handling API requests, auth, and scheduled tasks.
- **Storage:** File-based SQLite databases. One global file, plus one file per household.

---

## 2. Backend Architecture (Node.js)

### Design Patterns

- **Middleware-Driven Context:**
  - Authentication Middleware verifies JWT.
  - **Context Middleware** inspects the `X-Household-ID` header.
  - It locates the correct SQLite file for that household (`server/data/household-{id}.db`) and attaches a database connection to the `req` object.
  - **Security:** This ensures that a request for Household A literally _cannot_ query Household B's data, as it lacks the database handle.
- **Service Layer (Partial):**
  - Complex logic (e.g., Backup generation, Crypto) resides in `services/`.
  - CRUD logic currently resides primarily in `routes/` (Controllers), with a move towards consolidation.
- **Polymorphic Recurring Costs:**
  - A single `recurring_costs` table handles all periodic outflows (Subscriptions, Mortgage, Vehicle Tax), linking dynamically to other entities via `object_type` and `object_id`.

### Security Implementation

- **At-Rest Encryption:** Sensitive fields (bank account numbers, sort codes, birth dates) are encrypted using AES-256 before storage in SQLite.
- **JWT Auth:** Stateless session management.
- **Role-Based Access Control (RBAC):** Middleware enforces `admin`, `member`, or `viewer` roles per route.

---

## 3. Frontend Architecture (React)

### Frameworks

- **React 19:** Utilizing modern hooks and functional components.
- **MUI Joy UI:** A modern, design-system-first UI library. We use `extendTheme` for a robust CSS variable system supporting 50+ themes.
- **Vite:** High-performance build tool.

### Key Components

- **`AppInner`:** Handles global state (User, Theme, Session Timeout).
- **`HouseholdLayout`:** The shell for authenticated sessions. Manages the "Taskbar", Navigation, and Household Context switching.
- **`FloatingWindow` Pattern:** Calculators, Calendars, and Note tools can be "popped out" into separate browser windows while maintaining state synchronization (via local storage or re-fetching).

### State Management

- **Server State:** Managed via `axios` and `useEffect` hooks (Migrating to TanStack Query is a future roadmap item).
- **UI State:** Local React state + Context API for Theme/User.

---

## 4. DevOps & Reliability

### "Nightly" Philosophy

Hearthside employs a **Nightly Quality Gate**:

1.  **Automated Smoke Tests:** Run every night via cron.
2.  **Database Health:** `cleanup_test_data.js` runs to purge transient test artifacts.
3.  **Reporting:** Results are stored in the `test_results` table and surfaced in the Settings UI.

### Backup Strategy

- **Automated Zips:** The system creates nightly ZIP archives of every household database.
- **Tenant Export:** Admins can trigger a manual "Tenant Export" which packages the household database, global metadata (name, settings), and associated user accounts into a portable ZIP for cross-instance migration.
- **Retention Policy:** Configurable retention (default 7 days).

---

## 5. Directory Structure Strategy

- `/server`: The backend API.
  - `/data`: Contains the live SQLite databases (Gitignored).
  - `/backups`: Zipped backups (Gitignored).
  - `/routes`: API Endpoints.
  - `/middleware`: Auth and Tenant context logic.
- `/web`: The Frontend.
  - `/src/features`: Screen-based organization (Finance, Calendar, People).
  - `/src/components/ui`: Shared, brand-compliant atomic components.
- `/scripts`: DevOps and Maintenance automation (Deploy, Seed, Test).
