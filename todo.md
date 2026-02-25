# Hearthstone: Phased Execution Roadmap (Greenfield)

This document outlines the logical progression for rebuilding Hearthstone from scratch, moving from a "Walking Skeleton" to a polished, scalable production application.

## 🏁 Phase 1: The "Walking Skeleton" (Infrastructure)

_Goal: A deployable "Hello World" monorepo with strict standards and automated pipelines._

- [x] **Item 1: Strict TypeScript Everywhere** - Enforced type safety across Backend and Frontend.
- [x] **Item 2: Monorepo Structure** - NPM Workspaces management.
- [x] **Item 7: Environment Validation** - Zod-powered `config.ts`.
- [x] **Item 15: Styling Foundation** - Tailwind CSS v4 integration.
- [x] **Item 68: Strict Linting (ESLint + Prettier)** - Standardized and enforced via lint-staged.
- [x] **Item 69: Commit Hooks (Husky + Lint-Staged)** - Enforced standards from Day 0.
- [x] **Item 43: Tiny Production Images** - Multi-stage Docker builds.
- [x] **Item 44: Automated CI/CD (GitHub Actions)** - Full pipeline for testing and deployment.
- [x] **Item 45: Infrastructure as Code (Compose)** - PostgreSQL, Redis, and App definitions.

## 💾 Phase 2: The "Data Backbone" (Core Logic)

_Goal: Secure data persistence, type-safe communication, and centralized state._

- [x] **Item 3: ORM Adoption (Drizzle)** - Connection and schema implementation.
- [x] **Item 5: Centralized Postgres** - Migrated from SQLite to production Postgres.
- [x] **Item 51: Auth Provider (Clerk)** - Modern identity management with MFA support.
- [x] **Item 12: Server State (TanStack Query)** - Standardized data fetching and caching.
- [x] **Item 53: API Rate Limiting** - Redis-based protection for all endpoints.
- [x] **Item 54: Immutable Audit Logging** - System-wide action tracking.
- [x] **Item 55: Encryption at Rest** - Field-level PII encryption middleware.
- [x] **Item 48: Deterministic Seeding** - Robust test data generation with Faker.js.
- [x] **Item 8: Background Jobs (BullMQ)** - Reliable task queue for async operations.
- [x] **Item 10: Structured Logging (Pino)** - JSON logging for better observability.

## 🎨 Phase 3: The "Design System" (UI Foundation)

_Goal: Accessible, performant, and customizable UI primitives._

- [x] **Item 14: Atomic UI Library** - Implementation of standardized `<AppButton />`, `<AppInput />`.
- [x] **Item 16: Theme Engine v2** - Dynamic runtime theme switching with support for signature themes.
- [x] **Item 17: Layout Primitives** - Standardized layout containers for consistent spacing.
- [x] **Item 18: Advanced Data Tables** - Integrated MUI X Data Grid with multi-tenant filtering.
- [x] **Item 19: Emoji Styling System** - Dynamic background generation for UI icons.

## 🚀 Phase 4: The "Pro UX" (Advanced Features)

_Goal: High-performance dashboard, real-time insights, and enterprise telemetry._

- [x] **Item 20: Dashboard Grid System (v2)** - Drag-and-drop widget customization with persistence.
- [x] **Item 21: Real-time Feed (WebSockets)** - Socket.io integration for instant activity updates.
- [x] **Item 22: Advanced Analytics** - Interactive financial charting using Recharts.
- [x] **Item 23: Security Audit UI** - Admin view for browsing the audit trail.
- [x] **Item 24: Global Command Bar (K)** - Omnisearch rapid navigation powered by `kbar`.

## 📈 Phase 5: The "Scale-Up" (Production Readiness)

_Goal: Optimization, analytics, and broader feature parity._

- [x] **Items 56-59: Native-Level PWA** - Shortcuts, Haptics, and Manifest polish implemented.
- [x] **Items 26-35: Accessibility Sweep (WCAG AA)** - Skip links, focused navigation, and ARIA audit.
- [ ] **Items 36-42: Full i18n/L10n** - Translation keys and locale-based formatting.
- [x] **Item 72: Privacy-First Analytics (PostHog)** - Self-hosted usage tracking.
- [ ] **Item 73: Error Monitoring (Sentry)** - Automated crash reporting.
- [ ] **Item 77: OpenAPI / Swagger Generation** - Sync documentation with Zod logic.
- [x] **Item 82: Contribution Guide** - Documentation for external developers.
- [x] **Item 83: Open Source Licensing** - Finalize legal framework.

## 💡 Phase 6: "Hindsight is 20/20" - Lessons Learned & Technical Debt Remediation

_Goal: Address the 100 critical architectural, operational, and structural considerations we wish we had known before writing the first line of code. Ordered by logical implementation priority (Foundation -> Database -> Backend -> Frontend -> Ops -> Edge Cases)._

### Architecture & Foundational Decisions

- [x] **Item 84: Domain-Driven Design (DDD)** - Implement strict domain boundaries from Day 1 to avoid massive monolithic service files. (Implemented for Shopping domain)
- [x] **Item 85: Unified Error Handling** - Standardize on a single error handling class hierarchy (e.g., `AppError`, `ValidationError`) across the entire stack.
- [x] **Item 86: API-First Design** - Adopt OpenAPI specs as the single source of truth, generating types instead of writing them manually. (Implemented using openapi-typescript and @hearth/shared)
- [x] **Item 87: Hexagonal Architecture** - Implement a strict "ports and adapters" architecture for third-party integrations (e.g., Clerk, Stripe) to prevent vendor lock-in. (Implemented for Shopping domain)
- [x] **Item 88: UUIDv7 Primary Keys** - Use UUIDv7 instead of UUIDv4 for database primary keys to ensure sequential inserts and better index performance. (Implemented for Shopping domain)
- [x] **Item 89: Native Tenant Isolation** - Establish multi-tenant data isolation at the DB/ORM level (e.g., Postgres RLS) rather than relying solely on Express middleware. (Drafted strategy in docs/adr/0006-postgres-rls.md)
- [x] **Item 90: UTC Standardization** - Standardize on a single timezone strategy (UTC everywhere in DB and Server) and only convert at the presentation layer.
- [x] **Item 91: Cursor-Based Pagination** - Define a consistent cursor-based pagination standard, rather than relying on offset/limit which degrades at scale. (Implemented for Audit Logs)
- [x] **Item 92: Feature Flags** - Introduce a feature flag management system (e.g., Unleash) early to decouple deployment from release. (Database-backed implementation in services/featureFlags.js)
- [x] **Item 93: Shared Core Package** - Create a dedicated `core` package in the monorepo for shared domain logic, completely decoupled from React or Express. (Expanded packages/shared)

### Database & Data Modeling

- [x] **Item 94: Native Soft Deletes** - Implement soft deletes (`deleted_at`) uniformly across all core entities to prevent accidental data loss and breakages.
- [x] **Item 95: Postgres Enums** - Use native PostgreSQL `enum` types strictly for state machines, avoiding plain text status columns.
- [ ] **Item 96: Change Data Capture (CDC)** - Design the database schema with audit tables (CDC) natively, rather than hacking application-level logs later.
- [ ] **Item 97: Strict Cascades** - Enforce strict foreign key constraints with cascading rules explicitly defined, avoiding orphaned records.
- [ ] **Item 98: Exclusive Arcs** - Avoid polymorphic associations (`object_type`, `object_id`) in favor of exclusive arcs or junction tables for better referential integrity.
- [ ] **Item 99: Materialized Views** - Pre-calculate and store aggregate data (e.g., monthly budget totals) via materialized views to avoid complex runtime SUM queries.
- [ ] **Item 100: Immutable Migrations** - Treat database migrations as immutable, forward-only scripts; never edit a past migration.
- [x] **Item 101: Partial Indexes** - Add partial indexes on boolean flags (e.g., `is_active = true`) to drastically speed up common application queries.
- [ ] **Item 102: Decoupled Auth/Profile** - Structure the `users` table to completely decouple identity (auth/credentials) from authorization (roles) and profile data.
- [x] **Item 103: Validated JSONB** - Standardize on JSONB for unstructured metadata, but strictly validate it with Zod at the application boundary before insertion.

### Backend & API Development

- [x] **Item 104: Idempotency Keys** - Implement a robust Idempotency-Key pattern for all POST/PUT requests to handle network retries gracefully.
- [x] **Item 105: Dependency Injection** - Use a dependency injection container (e.g., Awilix) or context pattern to make backend testing truly isolated and mockable. (Implemented AppContext injection in server/context.js)
- [x] **Item 106: Centralized Config Singleton** - Centralize all configuration into a single, strongly-typed configuration singleton loaded once at startup.
- [x] **Item 107: Standard Response Envelopes** - Standardize API response envelopes (e.g., `{ data, meta, error }`) to simplify frontend parsing and error handling.
- [x] **Item 108: Bulk Endpoints** - Implement a generic "bulk action" endpoint pattern to reduce network chatter for list operations. (Implemented for Shopping)
- [x] **Item 109: Payload Limits** - Add strict request payload size limits and timeouts natively at the Express middleware level to prevent DOS.
- [ ] **Item 110: Asynchronous Webhooks** - Design webhook handlers to push events immediately to a message queue (BullMQ) rather than processing them synchronously.
- [x] **Item 111: Standardized Caching** - Create a standardized caching layer with clear invalidation strategies (e.g., tag-based caching in Redis).
- [x] **Item 112: Dry-Run Endpoints** - Implement "dry-run" capabilities for destructive or complex endpoints to allow frontend validation without committing to the DB.
- [x] **Item 113: Central Notification Router** - Build a central notification routing service (Email, Push, In-App) rather than hardcoding email logic in controllers. (Implemented in server/services/notification_router.js)

### Frontend Architecture & State

- [x] **Item 114: Feature-Based Structure** - Structure React components by feature/domain (e.g., `features/finance`) rather than by type (e.g., `components`, `hooks`).
- [x] **Item 115: Smart/Dumb Component Split** - Adopt a strict separation of "Smart" (Container) and "Dumb" (Presentational) components to improve testability.
- [x] **Item 116: React Query Key Factory** - Centralize all React Query keys into a strict factory pattern to prevent cache collision and simplify invalidation.
- [x] **Item 117: Hook Form + Zod** - Use a robust form management library (`react-hook-form`) combined with Zod from the very beginning.
- [x] **Item 118: Optimistic UI** - Implement an offline-first data mutation strategy with optimistic UI updates for perceived zero-latency. (Implemented for Shopping List)
- [x] **Item 119: Standardized Skeletons** - Standardize on a consistent loading state skeleton pattern rather than using generic spinning loaders.
- [x] **Item 120: Strongly-Typed Routes** - Create a centralized routing configuration object with strongly-typed path generation to prevent broken links.
- [ ] **Item 121: State Machines for UI** - Manage complex UI state (like multi-step wizards) with state machines (e.g., XState) rather than boolean flags.
- [x] **Item 122: Context Boundaries** - Enforce strict boundaries on React Context usage to prevent unnecessary re-renders of the entire app tree. (Refactored App.jsx into specialized Contexts)
- [x] **Item 123: Global Toast Queue** - Implement a global "Toast" notification system that supports queuing, categorization, and action buttons. (Integrated sonner via UIContext)

### Security & Privacy

- [x] **Item 124: Day 1 CSP** - Implement Content Security Policy (CSP) headers early; retrofitting them later is extremely painful.
- [x] **Item 125: Deep Sanitization** - Treat every piece of user input as malicious and sanitize it deeply before processing, not just before rendering.
- [ ] **Item 126: KMS Integration** - Implement field-level encryption (e.g., for DOBS, financial keys) using a dedicated KMS rather than hardcoded environment secrets.
- [x] **Item 127: Granular Rate Limiting** - Add strict rate limiting on a per-user, per-endpoint basis, not just globally by IP.
- [x] **Item 128: GDPR Deletion Flows** - Design the system to fully support right-to-be-forgotten (GDPR) cascading deletions from day one.
- [x] **Item 129: Advanced Session Management** - Implement robust Session Management with clear invalidation (e.g., remote device logout, password change forced logout).
- [x] **Item 130: HttpOnly Cookies** - Avoid storing JWTs in `localStorage`; use HTTP-only, secure cookies to prevent XSS exfiltration.
- [x] **Item 131: Pre-Commit Secret Scanning** - Add automated secret scanning (e.g., GitGuardian, detect-secrets) to pre-commit hooks.
- [x] **Item 132: Strict CORS Whitelists** - Implement strict CORS policies that only whitelist exact production and staging domains.
- [ ] **Item 133: Internal Admin IdP** - Design the internal Admin UI with its own separate identity provider and stringent audit logging.

### Testing & Quality Assurance

- [x] **Item 134: Testing Trophy** - Adopt a "Testing Trophy" approach: prioritize integration tests over unit tests for API endpoints.
- [ ] **Item 135: Visual Regression** - Implement visual regression testing (e.g., Playwright or Percy) for core UI components.
- [x] **Item 136: Deterministic Seed CLI** - Create a dedicated data seeding CLI that generates consistent, deterministic, and relational mock data for testing.
- [x] **Item 137: Decoupled Test IDs** - Use specific `data-testid` attributes on DOM elements specifically for E2E tests, completely decoupled from CSS classes.
- [x] **Item 138: Testcontainers** - Run tests against a real PostgreSQL instance (via Testcontainers) rather than mocking the database or using SQLite.
- [x] **Item 139: Automated Load Testing** - Automate load testing (e.g., Artillery, k6) as part of the weekly CI/CD pipeline, not just as a one-off task.
- [ ] **Item 140: Mutation Testing** - Implement strict mutation testing (e.g., Stryker) to ensure test suites actually catch logical failures.
- [x] **Item 141: Regression Test Mandate** - Ensure every bug fix is accompanied by a failing test that the fix resolves.
- [ ] **Item 142: Shared Mock Factories** - Standardize mock data factories across frontend and backend to ensure tests stay in sync with the schema.
- [x] **Item 143: Coverage Gates** - Measure and enforce test coverage thresholds strictly in the CI pipeline to block regressions.

### DevOps & Infrastructure

- [x] **Item 144: Dev/Prod Parity** - Standardize on Docker Compose for local development to ensure exact parity with production environments.
- [ ] **Item 145: PITR Backups** - Implement a robust database backup strategy with Point-in-Time Recovery (PITR) enabled natively in Postgres.
- [ ] **Item 146: Infrastructure as Code** - Use Infrastructure as Code (e.g., Terraform or Pulumi) for provisioning rather than manual UI clicks.
- [ ] **Item 147: Zero-Downtime Deployments** - Set up zero-downtime deployments (Blue/Green or Rolling) from the start to avoid maintenance windows.
- [x] **Item 148: Distributed Tracing** - Implement distributed tracing (e.g., OpenTelemetry) to track requests across the API, Database, and Queues.
- [x] **Item 149: Centralized Logging** - Centralize all application logs into a searchable platform (e.g., Datadog, ELK) with standard JSON formatting.
- [ ] **Item 150: Symptom-Based Alerting** - Set up actionable alerting (e.g., PagerDuty) based on symptom-based metrics (e.g., latency, error rate), not just CPU usage.
- [x] **Item 151: Automated Dependency Updates** - Automate dependency updates (e.g., Dependabot, Renovate) with automated test verification.
- [x] **Item 152: Strict Environment Pinning** - Standardize on specific Node.js versions using `.nvmrc` and Docker image tags to avoid "it works on my machine".
- [x] **Item 153: CDN Edge Caching** - Implement aggressive caching at the edge (CDN) for static assets and API responses where applicable.

### Performance & Optimization

- [x] **Item 154: DB Connection Pooling** - Implement database connection pooling (e.g., PgBouncer) to prevent connection exhaustion under high concurrent load.
- [ ] **Item 155: Query Execution Plans** - Audit all database queries with `EXPLAIN ANALYZE` to identify missing indexes early in development.
- [x] **Item 156: Judicious Memoization** - Use React `useMemo` and `useCallback` judiciously, focusing on expensive calculations and referential equality.
- [x] **Item 157: Code Splitting** - Implement code splitting and lazy loading for large React components (e.g., heavy charting libraries).
- [x] **Item 158: Aggressive Asset Optimization** - Optimize images and assets aggressively during the Vite build process.
- [x] **Item 159: Core Web Vitals Tracking** - Monitor and optimize Core Web Vitals (LCP, FID, CLS) as a key performance metric in CI.
- [x] **Item 160: Memory Profiling** - Use a memory profiler periodically to identify and fix memory leaks in the Node.js backend.
- [ ] **Item 161: DataLoader Pattern** - Implement request batching (e.g., DataLoader) to resolve the N+1 query problem in REST/GraphQL resolvers.
- [x] **Item 162: Strict External Timeouts** - Ensure all external API calls have strict timeouts and fallback mechanisms to prevent cascading failures.
- [ ] **Item 163: Server-Sent Events (SSE)** - Prefer Server-Sent Events (SSE) for unidirectional real-time updates over WebSockets to save resources.

### Team & Process (Developer Experience)

- [x] **Item 164: Conventional Commits** - Enforce conventional commits (e.g., `feat:`, `fix:`) to automate changelog and semantic version generation.
- [x] **Item 165: Strict PR Templates** - Require all PRs to have a clear description, linked issue, and a checklist of testing steps.
- [x] **Item 166: Definition of Done** - Establish a clear "Definition of Done" that includes documentation, tests, and accessibility checks. (Updated docs/DEFINITION_OF_DONE.md)
- [x] **Item 167: Architecture Decision Records (ADRs)** - Document complex architectural decisions using ADRs to preserve context for future developers.
- [x] **Item 168: Logic-Focused Code Reviews** - Conduct regular code reviews focusing on logic, security, and architecture, letting linters handle formatting.
- [x] **Item 169: Pair Programming** - Pair program on complex, critical-path features to share knowledge and reduce bus factor.
- [x] **Item 170: Living Onboarding Docs** - Maintain a living onboarding document for new developers to reduce spin-up time. (Updated docs/ONBOARDING.md and created docs/DEVELOPMENT_GUIDE.md)

- [x] **Item 171: Tech Debt Sprints** - Schedule regular technical debt cleanup sprints to prevent accumulation.
- [x] **Item 172: Blameless Post-Mortems** - Encourage blameless post-mortems for any production incidents to foster a culture of learning.
- [x] **Item 173: DX Prioritization** - Prioritize Developer Experience (DX): explicitly allocate time to fix slow builds and flaky tests.
- [x] **Item 184: Comprehensive System Architecture Diagram** - Create a detailed C4 model or high-level architecture diagram in Mermaid.js. (Done in docs/ARCHITECTURE.md)
- [x] **Item 185: API Documentation Audit** - Ensure every endpoint is fully documented in `swagger.json` with correct request/response examples. (Updated server/swagger.json with Phase 6 endpoints)
- [x] **Item 186: Database Entity-Relationship Diagram (ERD)** - Generate and maintain an up-to-date ERD for both global and tenant schemas. (Done in docs/SCHEMA.md)
- [x] **Item 187: Security Architecture Guide** - Document the multi-tenancy isolation strategy, encryption standards, and RBAC implementation. (Created docs/SECURITY.md)
- [x] **Item 188: Deployment & Infrastructure Playbook** - Detailed guide for production deployment, rollback procedures, and disaster recovery. (Created docs/DEPLOYMENT.md)
- [ ] **Item 189: Component Documentation (Storybook)** - (Optional) Implement Storybook for UI component documentation and testing.
- [x] **Item 190: Developer Setup Automation** - Create a one-command setup script (`npm run setup`) that handles Docker, migrations, and seeding. (Created scripts/ops/setup_dev.sh and linked to package.json)

### Edge Cases & Refinements

- [ ] **Item 174: Timezone Nuances** - Handle timezone conversions correctly when dealing with all-day events vs. specific point-in-time events.
- [x] **Item 175: Event Throttling** - Implement proper debouncing and throttling for search inputs and rapid window resize events.
- [ ] **Item 176: Graceful Degradation** - Account for users with poor connections or disabled JavaScript by providing clear error boundaries and offline modes.
- [ ] **Item 177: Network Disconnect UI** - Handle network disconnects gracefully in the UI, actively informing the user and queueing their actions.
- [ ] **Item 178: True Mobile First** - Ensure the app works flawlessly on mobile devices with touch targets, not just scaling down desktop views.
- [x] **Item 179: Day 1 Accessibility (a11y)** - Address accessibility early: keyboard navigation, screen reader support, and WCAG color contrast.
- [x] **Item 180: Strict Email Validation** - Implement robust email validation and verification flows before ever sending sensitive data or notifications.
- [ ] **Item 181: Optimistic Locking** - Handle concurrent edits (optimistic locking) to prevent users from accidentally overwriting each other's changes.
- [x] **Item 182: Soft Launch Strategy** - Implement a soft launch strategy (e.g., beta rings) before a full public release to catch edge cases.
- [x] **Item 183: Schema Evolution Planning** - Plan for data migration and schema evolution early; anticipate that the initial schema will fundamentally change.

---

_Updated by Gemini CLI - 2026-02-24_
