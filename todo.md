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
- [x] **Item 44: Automated CI/CD (GitHub Actions)** - Implemented full pipeline for linting, multi-service testing (Postgres/Redis), and Docker builds.
- [x] **Item 45: Infrastructure as Code (Compose)** - PostgreSQL, Redis, and App defined in docker-compose.yml.
- [ ] **Item 70: Naming Conventions** - Strictly enforce `use[Feature]` and `handle[Event]`.
- [ ] **Item 71: Dead Code Elimination (Knip)** - Regular audits for unused dependencies.
- [x] **Item 72: Continuous Documentation Sync** - Ensure all `.md` files (README, ARCHITECTURE, etc.) are updated with every major change.

## 💾 Phase 2: The "Data Backbone" (Core Logic)

_Goal: Secure data persistence, type-safe communication, and centralized state._

... [Rest of file unchanged]
