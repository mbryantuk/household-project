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
- [ ] **Item 70: Naming Conventions** - Strictly enforce `use[Feature]` and `handle[Event]`.
- [ ] **Item 71: Dead Code Elimination (Knip)** - Regular audits for unused dependencies.

## 💾 Phase 2: The "Data Backbone" (Core Logic)

_Goal: Secure data persistence, type-safe communication, and centralized state._

- [x] **Item 3: ORM Adoption (Drizzle)** - Connection and schema initialized.
- [x] **Item 5: Centralized Postgres** - Docker container and Drizzle config ready.
- [ ] **Item 51: Auth Provider (Auth.js/Clerk)** - Offload MFA and Passkey complexity.
- [/] **Item 4: Type-Safe APIs (tRPC/Hono)** - Shared types initialized; need to implement router.
- [/] **Item 6: Edge Validation (Zod)** - Shared entity schemas created in `@hearth/shared`.
- [x] **Item 13: Client State (Zustand)** - Global store created in `web/src/stores`.
- [ ] **Item 12: Server State (TanStack Query)** - Replace manual `useEffect` fetching.
- [ ] **Item 53: API Rate Limiting** - Protect endpoints with Redis-based limits.
- [ ] **Item 54: Immutable Audit Logging** - Track sensitive user actions.
- [ ] **Item 55: Encryption at Rest** - Field-level PII encryption in Postgres.
- [ ] **Item 48: Deterministic Seeding** - Build a robust test data generator with Faker.js.
- [ ] **Item 49: Secrets Management (Doppler/Infisical)** - Move secrets out of `.env` files.
- [ ] **Item 8: Background Jobs (BullMQ)** - Move cron tasks to a reliable queue.
- [ ] **Item 9: S3-Compatible File Storage** - Abstract image/asset uploads.
- [x] **Item 10: Structured Logging (Pino)** - Implemented in `server/utils/logger.ts`.

## 🎨 Phase 3: The "Design System" (UI Foundation)

_Goal: Accessible, performant, and customizable UI primitives._

- [ ] **Item 14: Design Tokens First** - Define colors/spacing in `tokens.ts`.
- [ ] **Item 16: Headless Components (Radix/Aria-Kit)** - Accessible UI primitives.
- [ ] **Item 76: Storybook Integration** - Document the component library.
- [ ] **Item 17: Skeleton Loading States** - Replace spinners with layout-mimicking skeletons.
- [ ] **Item 18: Optimistic UI Updates** - Immediate feedback for list interactions.
- [ ] **Item 19: Zod-Powered Forms (React Hook Form)** - Standardize form handling.
- [ ] **Item 20: Modern Toast System (Sonner)** - Light, swipeable notifications.
- [ ] **Item 21: Global Command Palette (Command+K)** - Quick navigation and actions.
- [ ] **Item 24: Optimized Image Pipeline** - AVIF/WebP support and lazy loading.
- [ ] **Item 25: Widget-Level Error Boundaries** - Isolate crashes to individual dashboard cards.

## 🧩 Phase 4: "Feature Parity" (The Hearthstone Core)

_Goal: Porting existing modules to the new architecture with enhanced logic._

- [ ] **Item 60: Zero-Based Budgeting (Envelopes)** - core financial logic overhaul.
- [ ] **Item 64: Gamified Chores** - Points system, leaderboards, and rewards.
- [ ] **Item 65: Intelligent Meal Planning** - Auto-list generation from inventory.
- [ ] **Item 63: Calendar Sync (Google/Apple)** - Two-way CalDAV integration.
- [ ] **Item 61: Receipt Scanning (OCR)** - Auto-fill expenses from photos.
- [ ] **Item 62: Barcode Pantry Tracking** - Quick inventory management.
- [ ] **Item 66: Vehicle VIN Integration** - Auto-populate car details and MOT history.
- [ ] **Item 67: Pet Health Timeline** - Vet records and vaccination tracking.
- [ ] **Item 74: Feature Flags** - Safe rollout of new experimental features.
- [ ] **Item 75: A/B Testing Infrastructure** - Data-driven UI decisions.
- [ ] **Item 79: Soft Deletes** - Allow recovery of accidentally deleted data.
- [ ] **Item 81: Portability (JSON/CSV Export)** - Full data ownership for users.

## 🚀 Phase 5: "Polish & Scale" (The Final Mile)

_Goal: World-class accessibility, mobile experience, and localization._

- [ ] **Items 56-59: Native-Level PWA** - Service Workers, Push API, Haptics, and manifest polish.
- [ ] **Items 26-35: Accessibility Sweep (WCAG AA)** - Semantic HTML, Focus management, ARIA audit.
- [ ] **Items 36-42: Full i18n/L10n** - Translation keys, RTL support, and locale-based formatting.
- [ ] **Item 72: Privacy-First Analytics (PostHog)** - Self-hosted usage tracking.
- [ ] **Item 73: Error Monitoring (Sentry)** - Automated crash reporting.
- [ ] **Item 77: OpenAPI / Swagger Generation** - Sync documentation with Zod/tRPC logic.
- [ ] **Item 82: Contribution Guide** - Open the project to external developers.
- [ ] **Item 83: Open Source Licensing** - Finalize legal framework (MIT/AGPL).

---

_Updated by Gemini CLI - 2026-02-23_
