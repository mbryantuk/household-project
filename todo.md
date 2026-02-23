# Hearthstone: Phased Execution Roadmap (Greenfield)

This document outlines the logical progression for rebuilding Hearthstone from scratch, moving from a "Walking Skeleton" to a polished, scalable production application.

## 🏁 Phase 1: The "Walking Skeleton" (Infrastructure)

_Goal: A deployable "Hello World" monorepo with strict standards and automated pipelines._

- [x] **Item 1: Strict TypeScript Everywhere** - Initialized root and workspace configs.
- [x] **Item 2: Monorepo Structure** - NPM Workspaces implemented.
- [x] **Item 7: Environment Validation** - Zod-powered `config.ts` implemented.
- [x] **Item 15: Styling Foundation** - Tailwind CSS v4 installed.
- [ ] **Item 11: Frontend Framework (Next.js / TanStack Router)** - Transition from SPA to SSR/File-based routing.
- [x] **Item 68: Strict Linting (ESLint + Prettier)** - Standardized and enforced via lint-staged.
- [x] **Item 69: Commit Hooks (Husky + Lint-Staged)** - Enforced standards from Day 0.
- [x] **Item 43: Tiny Production Images** - Refactored Dockerfile to multi-stage build.
- [ ] **Item 44: Automated CI/CD (GitHub Actions)** - Move away from local deploy scripts.
- [x] **Item 45: Infrastructure as Code (Compose)** - PostgreSQL and App defined in docker-compose.yml.
- [x] **Item 70: Naming Conventions** - Strictly enforce `use[Feature]` and `handle[Event]`.
- [ ] **Item 71: Dead Code Elimination (Knip)** - Regular audits for unused dependencies.
- [x] **Item 72: Continuous Documentation Sync** - Ensure all `.md` files (README, ARCHITECTURE, etc.) are updated with every major change.

## 💾 Phase 2: The "Data Backbone" (Core Logic)

_Goal: Secure data persistence, type-safe communication, and centralized state._

- [x] **Item 3: ORM Adoption (Drizzle)** - Connection and schema initialized (PostgreSQL).
- [x] **Item 5: Centralized Postgres** - Docker container and Drizzle config ready.
- [ ] **Item 51: Auth Provider (Auth.js/Clerk)** - Offload MFA and Passkey complexity.
- [x] **Item 4: Type-Safe APIs (tRPC/Hono)** - Shared types and core Hono router initialized.
- [x] **Item 6: Edge Validation (Zod)** - Shared entity schemas created in `@hearth/shared`.
- [x] **Item 13: Client State (Zustand)** - Global store created in `web/src/stores`.
- [x] **Item 12: Server State (TanStack Query)** - Replaced manual `useEffect` fetching across Finance, Shopping, Meals, People, Vehicles, Assets, Chores, and all Home Dashboard widgets.
- [ ] **Item 53: API Rate Limiting** - Protect endpoints with Redis-based limits.
- [ ] **Item 54: Immutable Audit Logging** - Track sensitive user actions.
- [ ] **Item 55: Encryption at Rest** - Field-level PII encryption in Postgres.
- [ ] **Item 48: Deterministic Seeding** - Build a robust test data generator with Faker.js.
- [ ] **Item 49: Secrets Management (Doppler/Infisical)** - Move secrets out of `.env` files.
- [ ] **Item 8: Background Jobs (BullMQ)** - Move cron tasks to a reliable queue.
- [ ] **Item 9: S3-Compatible File Storage** - Abstract image/asset uploads.
- [x] **Item 10: Structured Logging (Pino)** - Implemented in `server/utils/logger.ts`.
- [ ] **Item 84: Migrate Legacy SQLite to Postgres** - Script to ETL data from household .db files to centralized Postgres.

## 🎨 Phase 3: The "Design System" (UI Foundation)

_Goal: Accessible, performant, and customizable UI primitives._

... [Rest of file unchanged]
