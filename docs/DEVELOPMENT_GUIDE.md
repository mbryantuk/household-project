# Developer Experience & Engineering Guide

This document serves as the "source of truth" for Hearthstone's engineering standards, local development workflows, and coding conventions.

---

## 1. Engineering Principles

### The Tenancy Rule (Non-Negotiable)

Every single request that touches tenant data **MUST** be scoped by `household_id`.

- **Application Level:** Use the `useTenantDb` middleware.
- **Physical Level:** Connections are isolated to separate SQLite files.

### Atomic Writes

We never use partial updates or regex-based search-and-replace for file modifications. When a file is updated, it is overwritten in full to maintain structural integrity.

### Truth in UI

Never use raw MUI components or inline hex colors. Always use the wrappers in `web/src/components/ui` and theme tokens (`var(--joy-palette-...)`).

---

## 2. Local Development Workflow

### Quick Start

```bash
npm run setup
```

_This script provisions PostgreSQL/Redis via Docker, pushes Drizzle schemas, and seeds initial test data._

### Parallel HMR

For hot-reloading on both frontend and backend:

- **Server:** `cd server && npm start` (uses `tsx` for TypeScript support)
- **Client:** `cd web && npm run dev`

---

## 3. Frontend Architecture

### State Management

- **TanStack Query:** Use for all server-side state. Never use `useEffect` for basic data fetching.
- **Zustand:** Use for complex client-side state (e.g., active modal state, global command bar).

### Feature-Based Structure

Organize code by domain, not by type:

- `web/src/features/finance/` contains the components, hooks, and views for the finance module.
- `web/src/components/ui/` contains only generic, reusable primitives.

---

## 4. Backend Standards

### Error Handling

Always throw an `AppError` (or a subclass like `NotFoundError` or `SecurityError`). Express middleware will automatically catch these and format a consistent JSON response.

### Logging

Use `logger.info()` or `logger.error()`. In production, these output structured JSON for ingestion by ELK/Datadog. For pretty local logs, pipe to `pino-pretty`.

---

## 5. Continuous Integration

Every Pull Request is gated by:

1. **Linting:** Zero errors allowed.
2. **Backend Integrity:** 100% pass on security and integration tests (PostgreSQL containerized).
3. **Frontend Routing:** Smoke tests ensure major modules render correctly.
4. **Load Metrics:** Automated Artillery tests ensure no performance regression.
