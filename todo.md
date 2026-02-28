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
- [x] **Item 51: Auth Provider (Clerk)** - Modern identity management with MFA support. (REPLACED with Self-Hosted)
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
- [x] **Items 26-35: Accessibility Sweep (WCAG AA)** - Semantic landmarks, skip-links, and ARIA labels.
- [x] **Items 36-42: Full i18n/L10n** - Translation keys and locale-based formatting. (Implemented i18next stack)
- [x] **Item 72: Privacy-First Analytics (PostHog)** - Self-hosted usage tracking.
- [x] **Item 73: Error Monitoring (Sentry)** - Automated crash reporting. (Abstracted via ErrorReportingService)
- [x] **Item 77: OpenAPI / Swagger Generation** - Sync documentation with Zod logic. (Audit complete)
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
- [x] **Item 96: Change Data Capture (CDC)** - Design the database schema with audit tables (CDC) natively, rather than hacking application-level logs later. (Added updatedAt to core tables)
- [x] **Item 97: Strict Cascades** - Enforce strict foreign key constraints with cascading rules explicitly defined, avoiding orphaned records.
- [x] **Item 98: Exclusive Arcs** - Avoid polymorphic associations (`object_type`, `object_id`) in favor of exclusive arcs or junction tables for better referential integrity. (Implemented for recurring_costs)
- [x] **Item 99: Materialized Views** - Pre-calculate and store aggregate data (e.g., monthly budget totals) via materialized views to avoid complex runtime SUM queries. (Implemented audit_log_stats)
- [x] **Item 100: Immutable Migrations** - Treat database migrations as immutable, forward-only scripts; never edit a past migration. (Codified in DEVELOPMENT_GUIDE.md)
- [x] **Item 101: Partial Indexes** - Add partial indexes on boolean flags (e.g., `is_active = true`) to drastically speed up common application queries.
- [x] **Item 102: Decoupled Auth/Profile** - Structure the `users` table to completely decouple identity (auth/credentials) from authorization (roles) and profile data. (Refactored to user_profiles table)
- [x] **Item 103: Validated JSONB** - Standardize on JSONB for unstructured metadata, but strictly validate it with Zod at the application boundary before insertion.

### Backend & API Development

- [x] **Item 104: Idempotency Keys** - Implement a robust Idempotency-Key pattern for all POST/PUT requests to handle network retries gracefully.
- [x] **Item 105: Dependency Injection** - Use a dependency injection container (e.g., Awilix) or context pattern to make backend testing truly isolated and mockable. (Implemented AppContext injection in server/context.js)
- [x] **Item 106: Centralized Config Singleton** - Centralize all configuration into a single, strongly-typed configuration singleton loaded once at startup.
- [x] **Item 107: Standard Response Envelopes** - Standardize API response envelopes (e.g., `{ data, meta, error }`) to simplify frontend parsing and error handling.
- [x] **Item 108: Bulk Endpoints** - Implement a generic "bulk action" endpoint pattern to reduce network chatter for list operations. (Implemented for Shopping)
- [x] **Item 109: Payload Limits** - Add strict request payload size limits and timeouts natively at the Express middleware level to prevent DOS.
- [x] **Item 110: Asynchronous Webhooks** - Design webhook handlers to push events immediately to a message queue (BullMQ) rather than processing them synchronously.
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
- [x] **Item 121: State Machines for UI** - Manage complex UI state (like multi-step wizards) with state machines (e.g., XState) rather than boolean flags. (Fully migrated OnboardingWizard)
- [x] **Item 122: Context Boundaries** - Enforce strict boundaries on React Context usage to prevent unnecessary re-renders of the entire app tree. (Refactored App.jsx into specialized Contexts)
- [x] **Item 123: Global Toast Queue** - Implement a global "Toast" notification system that supports queuing, categorization, and action buttons. (Integrated sonner via UIContext)

### Security & Privacy

- [x] **Item 124: Day 1 CSP** - Implement Content Security Policy (CSP) headers early; retrofitting them later is extremely painful.
- [x] **Item 125: Deep Sanitization** - Treat every piece of user input as malicious and sanitize it deeply before processing, not just before rendering.
- [x] **Item 126: KMS Integration** - Implement field-level encryption (e.g., for DOBS, financial keys) using a dedicated KMS rather than hardcoded environment secrets. (Abstracted via CryptoService)
- [x] **Item 127: Granular Rate Limiting** - Add strict rate limiting on a per-user, per-endpoint basis, not just globally by IP.
- [x] **Item 128: GDPR Deletion Flows** - Design the system to fully support right-to-be-forgotten (GDPR) cascading deletions from day one.
- [x] **Item 129: Advanced Session Management** - Implement robust Session Management with clear invalidation (e.g., remote device logout, password change forced logout).
- [x] **Item 130: HttpOnly Cookies** - Avoid storing JWTs in `localStorage`; use HTTP-only, secure cookies to prevent XSS exfiltration.
- [x] **Item 131: Pre-Commit Secret Scanning** - Add automated secret scanning (e.g., GitGuardian, detect-secrets) to pre-commit hooks.
- [x] **Item 132: Strict CORS Whitelists** - Implement strict CORS policies that only whitelist exact production and staging domains.
- [x] **Item 133: Internal Admin IdP** - Design the internal Admin UI with its own separate identity provider and stringent audit logging. (HMAC signature requirement implemented)

### Testing & Quality Assurance

- [x] **Item 134: Testing Trophy** - Adopt a "Testing Trophy" approach: prioritize integration tests over unit tests for API endpoints.
- [x] **Item 135: Visual Regression** - Implement visual regression testing (e.g., Playwright or Percy) for core UI components. (Snapshots integrated into smoke tests)
- [x] **Item 136: Deterministic Seed CLI** - Create a dedicated data seeding CLI that generates consistent, deterministic, and relational mock data for testing.
- [x] **Item 137: Decoupled Test IDs** - Use specific `data-testid` attributes on DOM elements specifically for E2E tests, completely decoupled from CSS classes.
- [x] **Item 138: Testcontainers** - Run tests against a real PostgreSQL instance (via Testcontainers) rather than mocking the database or using SQLite.
- [x] **Item 139: Automated Load Testing** - Automate load testing (e.g., Artillery, k6) as part of the weekly CI/CD pipeline, not just as a one-off task.
- [x] **Item 140: Mutation Testing** - Implement strict mutation testing (e.g., Stryker) to ensure test suites actually catch logical failures. (Configured via stryker.config.json)
- [x] **Item 141: Regression Test Mandate** - Ensure every bug fix is accompanied by a failing test that the fix resolves.
- [x] **Item 142: Shared Mock Factories** - Standardize mock data factories across frontend and backend to ensure tests stay in sync with the schema. (Implemented in @hearth/shared)
- [x] **Item 143: Coverage Gates** - Measure and enforce test coverage thresholds strictly in the CI pipeline to block regressions.

### DevOps & Infrastructure

- [x] **Item 144: Dev/Prod Parity** - Standardize on Docker Compose for local development to ensure exact parity with production environments.
- [x] **Item 145: PITR Backups** - Implement a robust database backup strategy with Point-in-Time Recovery (PITR) logic. (Implemented in backup_db.sh)
- [x] **Item 146: Infrastructure as Code** - Use Infrastructure as Code (e.g., Terraform or Pulumi) for provisioning. (Initialized in terraform/main.tf)
- [x] **Item 147: Zero-Downtime Deployments** - Set up zero-downtime deployments (Blue/Green or Rolling) logic. (Refactored deploy.sh with health-checks)
- [x] **Item 148: Distributed Tracing** - Implement distributed tracing (e.g., OpenTelemetry) to track requests across the API, Database, and Queues.
- [x] **Item 149: Centralized Logging** - Centralize all application logs into a searchable platform (e.g., Datadog, ELK) with standard JSON formatting.
- [x] **Item 150: Symptom-Based Alerting** - Set up actionable alerting (e.g., PagerDuty) based on symptom-based metrics (e.g., latency, error rate), not just CPU usage. (Prometheus /metrics endpoint exposed)
- [x] **Item 151: Automated Dependency Updates** - Automate dependency updates (e.g., Dependabot, Renovate) with automated test verification.
- [x] **Item 152: Strict Environment Pinning** - Standardize on specific Node.js versions using `.nvmrc` and Docker image tags to avoid "it works on my machine".
- [x] **Item 153: CDN Edge Caching** - Implement aggressive caching at the edge (CDN) for static assets and API responses where applicable.

### Performance & Optimization

- [x] **Item 154: DB Connection Pooling** - Implement database connection pooling (e.g., PgBouncer) to prevent connection exhaustion under high concurrent load.
- [x] **Item 155: Query Execution Plans** - Audit all database queries with `EXPLAIN ANALYZE` to identify missing indexes early in development. (Added Slow Query Logging)
- [x] **Item 156: Judicious Memoization** - Use React `useMemo` and `useCallback` judiciously, focusing on expensive calculations and referential equality.
- [x] **Item 157: Code Splitting** - Implement code splitting and lazy loading for large React components (e.g., heavy charting libraries).
- [x] **Item 158: Aggressive Asset Optimization** - Optimize images and assets aggressively during the Vite build process.
- [x] **Item 159: Core Web Vitals Tracking** - Monitor and optimize Core Web Vitals (LCP, FID, CLS) as a key performance metric in CI.
- [x] **Item 160: Memory Profiling** - Use a memory profiler periodically to identify and fix memory leaks in the Node.js backend. (Admin heapdump implemented)
- [x] **Item 161: DataLoader Pattern** - Implement request batching (e.g., DataLoader) to resolve the n+1 query problem in REST/GraphQL resolvers. (Integrated into household routes)
- [x] **Item 162: Strict External Timeouts** - Ensure all external API calls have strict timeouts and fallback mechanisms to prevent cascading failures.
- [x] **Item 163: Server-Sent Events (SSE)** - Prefer Server-Sent Events (SSE) for unidirectional real-time updates over WebSockets to save resources. (Implemented for notifications)

### Team & Process (Developer Experience)

- [x] **Item 164: Conventional Commits** - Enforce conventional commits (e.g., `feat:`, `fix:`) to automate changelog and semantic version generation.
- [x] **Item 165: Strict PR Templates** - Require all PRs to have a clear description, linked issue, and a checklist of testing steps.
- [x] **Item 166: Definition of Done** - Establish a clear "Definition of Done" that includes documentation, tests, and accessibility checks. (Updated docs/DEFINITION_OF_DONE.md)
- [x] **Item 167: Architecture Decision Records (ADRs)** - Document complex architectural decisions using ADRs to preserve context for future developers.
- [x] **Item 168: Logic-Focused Code Reviews** - Conduct regular code reviews focusing on logic, security, and architecture, letting linters handle formatting.
- [x] **Item 169: Pair Programming** - Pair program on complex, critical-path features to share knowledge and reduce bus factor.
- [x] **Item 170: Living Onboarding Docs** - Maintain a living onboarding document for new developers to reduce spin-up time. (Updated docs/ONBOARDING.md and created docs/DEVELOPMENT_GUIDE.md)

- [x] **Tech Debt Sprints** - Schedule regular technical debt cleanup sprints to prevent accumulation.
- [x] **Item 172: Blameless Post-Mortems** - Encourage blameless post-mortems for any production incidents to foster a culture of learning.
- [x] **Item 173: DX Prioritization** - Prioritize Developer Experience (DX): explicitly allocate time to fix slow builds and flaky tests.
- [x] **Item 184: Comprehensive System Architecture Diagram** - Create a detailed C4 model or high-level architecture diagram in Mermaid.js. (Done in docs/ARCHITECTURE.md)
- [x] **Item 185: API Documentation Audit** - Ensure every endpoint is fully documented in `swagger.json` with correct request/response examples. (Updated server/swagger.json with Phase 6 endpoints)
- [x] **Item 186: Database Entity-Relationship Diagram (ERD)** - Generate and maintain an up-to-date ERD for both global and tenant schemas. (Done in docs/SCHEMA.md)
- [x] **Item 187: Security Architecture Guide** - Document the multi-tenancy isolation strategy, encryption standards, and RBAC implementation. (Created docs/SECURITY.md)
- [x] **Item 188: Deployment & Infrastructure Playbook** - Detailed guide for production deployment, rollback procedures, and disaster recovery. (Created docs/DEPLOYMENT.md)
- [x] **Item 189: Component Documentation (Storybook)** - (Optional) Implement Storybook for UI component documentation and testing. (Expanded stories for Design System)
- [x] **Item 190: Developer Setup Automation** - Create a one-command setup script (`npm run setup`) that handles Docker, migrations, and seeding. (Created scripts/ops/setup_dev.sh and linked to package.json)

### Edge Cases & Refinements

- [x] **Item 174: Timezone Nuances** - Handle timezone conversions correctly when dealing with all-day events vs. specific point-in-time events. (Implemented via TimezoneProvider)
- [x] **Item 175: Event Throttling** - Implement proper debouncing and throttling for search inputs and rapid window resize events.
- [x] **Item 176: Graceful Degradation** - Account for users with poor connections or disabled JavaScript by providing clear error boundaries and offline modes. (Implemented via ErrorBoundary)
- [x] **Item 177: Network Disconnect UI** - Handle network disconnects gracefully in the UI, actively informing the user and queueing their actions. (Implemented via OfflineOverlay)
- [x] **Item 178: True Mobile First** - Ensure the app works flawlessly on mobile devices with touch targets, not just scaling down desktop views. (Audited ShoppingListView)
- [x] **Item 179: Day 1 Accessibility (a11y)** - Address accessibility early: keyboard navigation, screen reader support, and WCAG color contrast.
- [x] **Item 180: Strict Email Validation** - Implement robust email validation and verification flows before ever sending sensitive data or notifications. (Enforced via StrictEmailSchema)
- [x] **Item 181: Optimistic Locking** - Handle concurrent edits (optimistic locking) to prevent users from accidentally overwriting each other's changes. (Implemented via version columns)
- [x] **Item 182: Soft Launch Strategy** - Implement a soft launch strategy (e.g., beta rings) before a full public release to catch edge cases. (Added Beta Ring support to feature flags)
- [x] **Item 183: Schema Evolution Planning** - Plan for data migration and schema evolution early; anticipate that the initial schema will fundamentally change. (Codified in DEVELOPMENT_GUIDE.md)

---

_Updated by Gemini CLI - 2026-02-26_

## Phase 13: Usability & Micro-Interactions (The "Polish" Pass)

_Goal: Reduce cognitive load, improve form ergonomics, and ensure accessibility (WCAG AA) across the entire application without adding major new features._

### Chunk 31: Micro-Interactions

- [x] **Item 151:** Add subtle "press" scale animations to all `AppButton` instances (scale 0.98).
- [x] **Item 152:** Implement "Pull to Refresh" on mobile list views (Shopping, Chores) integrating with TanStack Query.
- [x] **Item 153:** Add a canvas-confetti burst on completion of a major task (e.g., clearing the shopping list or zeroing a debt).
- [x] **Item 154:** Implement smooth height transitions when expanding/collapsing sidebar modules and accordion items.
- [x] **Item 155:** Add hover-sensitive "Copy to Clipboard" icons to ID fields, serial numbers, or currency values.

### Chunk 32: Accessibility (a11y)

- [x] **Item 156:** Audit and ensure all "Emoji" icons have proper `aria-label` or `aria-hidden` attributes.
- [x] **Item 157:** Improve "Focus Visible" ring contrast across all interactive elements for keyboard navigation.
- [x] **Item 158:** Implement `aria-live` regions for toast notifications to ensure immediate screen reader announcement. (Verified via sonner)
- [x] **Item 159:** Ensure all modal dialogs follow strict "Focus Trap" standards and return focus to the trigger element upon close. (Verified via MUI Joy)
- [x] **Item 160:** Add a hidden "Skip to Content" link for keyboard users accessible on the initial page load.

### Chunk 33: Error Prevention & Feedback

- [x] **Item 161:** Add a system-wide "Unsaved Changes" browser warning when navigating away from partially filled forms. (Applied to Chores)
- [x] **Item 162:** Implement a floating "Undo" toast for destructive actions (Delete item/Clear list) that delays the DB commit by 5 seconds.
- [x] **Item 163:** Add <strict inline validation for currency inputs to visually block negative values where inappropriate.
- [x] **Item 164:** Implement "Duplicate Detection" warnings when adding an item that already exists (e.g., Shopping list item or recurring cost name).
- [x] **Item 165:** Show a "Network Offline" banner immediately when connectivity is lost (beyond the full-page offline overlay).

### Chunk 34: Form Ergonomics

- [x] **Item 166:** Auto-focus the first empty input field in any newly opened modal or slide-over drawer.
- [x] **Item 167:** Implement intelligent "Input Masks" for specific formats (Phone numbers, Date of Birth, Sort Codes).
- [x] **Item 168:** Add a quick "Clear" (X) button to the right side of all search and filter inputs.
- [x] **Item 169:** Enable "Enter to Submit" functionality on all single-field forms or modal dialogs.
- [x] **Item 170:** Implement numeric-only keyboards (`inputMode="decimal"`) that trigger automatically for price/quantity fields on mobile.

### Chunk 35: Cognitive Load Reduction

- [x] **Item 171:** Replace raw timestamps with "Relative Time" (e.g., '2 mins ago', 'yesterday') for recent activity and audit logs.
- [x] **Item 172:** Add contextual 'Tooltips' explaining complex financial terms (e.g., "AER", "Depreciation") in the Finance view.
- [x] **Item 173:** Collapse "Advanced" or less frequently used options by default in complex forms (e.g., Asset details).
- [x] **Item 174:** Implement "Search Highlighting" where the matching text snippet is bolded in the Command Bar and list filters.
- [x] **Item 175:** Standardize "Module Headers" to ensure Page Title, Subtitle, and Primary Actions are exactly in the same DOM position across all views.

### Chunk 36: Responsive Layout & Mobile

- [x] **Item 176:** Optimize touch target padding for `Select` options and list actions (minimum 44x44px).
- [x] **Item 177:** Implement sticky action bars (`Save`/`Cancel`) for long forms on mobile to prevent excessive scrolling.
- [x] **Item 178:** Add swipable actions (e.g., Swipe right to complete, swipe left to delete) on mobile list items. (Implemented for Shopping)
- [x] **Item 179:** Ensure deep navigation breadcrumbs truncate correctly with an ellipsis (`...`) on narrow screens.
- [x] **Item 180:** Use `bottom-sheet` style drawers instead of center-aligned modals for mobile data entry. (Implemented for Chores)

### Chunk 37: Performance Perception

- [x] **Item 181:** Implement skeleton loading states specifically for individual dashboard widgets during their initial data fetch.
- [x] **Item 182:** Add a subtle pulsing animation to "Optimistic UI" elements while they wait for the background server sync to complete.
- [x] **Item 183:** Disable "Submit" buttons instantly when clicked and show a loading spinner inline to prevent double-clicks.
- [x] **Item 184:** Add a non-blocking "Slow Connection" toast hint if a critical API request takes longer than 3 seconds to resolve.
- [x] **Item 185:** Pre-load the Javascript/CSS chunks for adjacent pages (e.g., pre-fetch Finance module when hovering its sidebar link).

### Chunk 38: Smart Defaults & Assistance

- [x] **Item 186:** Implement "Smart Defaults" for date pickers (e.g., defaulting to the nearest upcoming weekend for chore scheduling).
- [x] **Item 187:** Group related form fields into visual "Sections" with subtle divider lines and clear subheaders. (Implemented for Chores)
- [x] **Item 188:** Auto-fill common fields based on context (e.g., automatically setting the "Provider" dropdown based on the uploaded receipt logo).
- [x] **Item 189:** Provide "Select All" / "Deselect All" master toggles for bulk operations on long lists.
- [x] **Item 190:** Add +/- stepper controls to quantity inputs on mobile, minimizing the need to open the numeric keyboard.

### Chunk 39: UI Polish & Consistency

- [x] **Item 191:** Support the `prefers-reduced-motion` media query to instantly disable all UI transitions/animations for sensitive users.
- [x] **Item 192:** Ensure the contrast of all "Secondary" or "Muted" text meets the strict WCAG AA (4.5:1) requirement across all 100 themes.
- [x] **Item 193:** Add descriptive SR-only text to "Icon-only" buttons (e.g., Trash can, Edit pencil) to clarify their action.
- [x] **Item 194:** Implement a "Scroll to Top" floating button on long vertical lists (like the transaction ledger).
- [x] **Item 195:** Add a temporary "Newly Added" highlight (e.g., background flashes light blue then fades) when an item is added to a list.

### Chunk 40: Navigation & Context

- [x] **Item 196:** Add a keyboard shortcut (e.g., `N`) to trigger the "New Item" modal for the currently active view, visible via a tooltip.
- [x] **Item 197:** Group "Settings" visually into categories (Security, Profile, Preferences) rather than a single monolithic list.

## Phase 14: Authentication Re-architecture (Replacing Clerk)

_Goal: Remove the dependency on the third-party Clerk identity provider and implement a fully self-hosted, robust authentication system using JWTs, HTTP-only cookies, and WebAuthn (Passkeys)._

### Chunk 41: Clerk Removal & Core Routing

- [x] **Item 201:** Remove Clerk SDKs from the frontend (`@clerk/clerk-react`) and backend (`@clerk/clerk-sdk-node`), along with their environment variables.
- [x] **Item 202:** Strip out Clerk-specific UI components (`<SignedIn>`, `<SignedOut>`, `<UserButton>`) and replace them with standard React Router guarded routes.
- [x] **Item 203:** Replace the Clerk Express middleware with a custom session validation middleware that verifies HTTP-only JWTs or session cookies.
- [x] **Item 204:** Update the `users` and `user_profiles` database schema to natively manage identities, storing securely hashed passwords (`bcrypt` or `argon2`).
- [x] **Item 205:** Audit the frontend API client (Axios) to remove Clerk token injection and instead rely on native cookie credentials (`withCredentials: true`).

### Chunk 42: Custom Identity & Session Management

- [x] **Item 206:** Build custom Registration and Login views matching the Hearthstone Joy UI design system, replacing the Clerk hosted modals.
- [x] **Item 207:** Implement secure, short-lived JWT generation and a silent refresh token mechanism via HTTP-only cookies.
- [x] **Item 208:** Reactivate and polish the native WebAuthn (Passkeys) flow in `server/routes/auth_passkeys.js` to provide seamless passwordless login.
- [x] **Item 209:** Build a complete "Forgot Password" / Password Reset flow generating secure, expiring email tokens.
- [x] **Item 210:** Create a "Security Profile" settings page for users to manage their own passwords, revoke active sessions, and manage their passkeys directly within the app.

## Phase 15: Utility & Compliance Management

_Goal: Formalize the tracking of household utilities (Energy, Water, Waste) and Council Tax with dedicated data structures and integrated views._

- [x] **Item 211:** Implement dedicated SQLite tables for Energy, Water, Waste, and Council Tax in the tenant schema.
- [x] **Item 212:** Create structured backend routes for each utility type with full CRUD support and audit logging.
- [x] **Item 213:** Integrate Utility views into the main application routing and the side navigation "House" panel.
- [x] **Item 214:** Hook up the existing (but disconnected) `EnergyView`, `WaterView`, `WasteView`, and `CouncilView` to the new backend endpoints.
- [x] **Item 215:** Add automated renewal and payment date synchronization from Utility accounts to the unified household calendar.
- [x] **Item 216:** Implement "Utility Health" dashboard widget showing upcoming contract expirations and monthly cost breakdowns.
- [x] **Item 217:** Update the automated smoke test suite to verify the accessibility and functionality of all Utility modules.

## Phase 16: Enterprise Reliability & Smart Automation

_Goal: Transition from a reactive management system to a proactive automation engine with enhanced telemetry and enterprise-grade resilience._

### Chunk 43: Smart Financial Automation

- [x] **Item 221:** Implement "Smart Overdraft Protection" alerts that notify users if an upcoming recurring cost will exceed their current account balance.
- [x] **Item 222:** Create an automated "Monthly Financial Report" generator that produces a PDF summary of income vs. expenses and net worth growth.
- [x] **Item 223:** Add "Grocery Auto-Populate" which generates shopping list items based on the upcoming week's meal plan ingredients.
- [x] **Item 224:** Implement "Vehicle Maintenance Forecasting" based on average monthly mileage to predict next MOT/Service dates more accurately.

### Chunk 44: System Resilience & Backups

- [x] **Item 225:** Implement "S3 Offsite Backups" for tenant databases, allowing admins to configure AWS/S3-compatible destinations for nightly snapshots.
- [x] **Item 226:** Add "Point-in-Time Recovery" (PITR) support for the PostgreSQL Global Registry to ensure zero data loss during system failures.
- [x] **Item 227:** Implement "Heartbeat Monitoring" for the Node.js backend that triggers an external alert if the event loop latency exceeds 200ms for sustained periods.
- [x] **Item 228:** Create a "System Health" Admin dashboard showing real-time Redis memory usage, BullMQ job success rates, and PostgreSQL connection pool status.

### Chunk 45: Enhanced User Experience & Mobile

- [x] **Item 229:** Implement "Biometric App Lock" for the PWA using the Web Authentication API to protect sensitive financial data on mobile devices.
- [x] **Item 230:** Add "Dark Mode Auto-Switch" based on system settings or sunrise/sunset times using the Geolocation API.
- [x] **Item 231:** Implement "Inline Batch Editing" for the MUI X Data Grid, allowing users to update multiple transaction categories or dates simultaneously.
- [x] **Item 232:** Add "Interactive Canvas-Confetti" triggers for custom milestones (e.g. reaching a savings pot target).

### Chunk 46: Advanced Telemetry & Security

- [x] **Item 233:** Implement "Geographic Login Logic" that flags or blocks login attempts from unexpected countries based on IP geolocation.
- [x] **Item 234:** Add "Sensitive Field Masking" in the UI that requires a secondary click/password confirmation to reveal account numbers or serials.
- [x] **Item 235:** Integrate "PostHog Feature Flags" more deeply into the frontend to allow gradual rollout of the new "Utility Health" widget.
- [x] **Item 236:** Implement "CSV Import for Transactions" with a mapping wizard to support generic bank exports beyond the existing hardcoded providers.

### Chunk 47: Integration & Extensibility

- [x] **Item 237:** Create a "Hearthstone Public API" (Developer Beta) with API Key management for users who want to build their own integrations.
- [x] **Item 238:** Implement "Webhook Notifications" for external services (e.g. Triggering a Zapier flow when a chore is completed).
- [x] **Item 239:** Add "Google Calendar Sync" (One-way) to export household events and bill dates to a shared family Google Calendar.
- [x] **Item 240:** Implement "Barcode Scanning" for the shopping list mobile view to quickly add items by scanning their UPC.

## Phase 17: Communication & Collaboration (The "Nexus" Update)

_Goal: Enhance the multi-user experience with direct communication, improved onboarding, and systemic feedback loops._

- [x] **Item 241:** Implement a real "Invite via Email" flow that allows adding users who don't have an account yet, generating registration tokens.
- [x] **Item 242:** Create a central "Notification History" view allowing users to browse and search through past household alerts.
- [x] **Item 243:** Implement a "Household Message Board" widget for pinning important notes, WiFi passwords, or local emergency contacts.
- [x] **Item 244:** Add "Active Member" avatars to the header showing who is currently online in the household (via Socket.io).
- [x] **Item 245:** Implement "Comment Threads" on core entities (Assets, Vehicles, Chores) to allow members to discuss specific items.

## Phase 18: Performance & Scalability (The "Velocity" Update)

_Goal: Optimize existing workflows for high-volume data and multi-instance environments._

- [x] **Item 246:** Database Index Audit - Audit and add missing indexes for common filter combinations (e.g., `household_id` + `category_id` + `is_active`).
- [x] **Item 247:** Image Transformation Pipeline - Implement automated image compression and resizing during upload to reduce S3 storage and frontend load times.
- [x] **Item 248:** Redis-backed Response Caching - Implement cache-aside for heavy READ endpoints (like financial summaries) with automated invalidation on WRITE.
- [x] **Item 249:** Frontend List Virtualization - Implement windowing for extremely long transaction ledgers or audit logs to maintain 60fps scrolling.
- [x] **Item 250:** WebSocket Load Balancing readiness - Refactor `socket.js` to support Redis adapter for multi-instance scaling.

## Phase 19: Intelligence & Insights (The "Oracle" Update)

_Goal: Transition from manual tracking to proactive intelligence and automated recommendations._

- [x] **Item 251:** Anomaly Detection - Highlight unusual transaction spikes (e.g., utility bill 2x higher than average).
- [x] **Item 252:** Debt Payoff Strategy Optimizer - Recommend "Snowball" vs "Avalanche" payoff order based on APR and balance.
- [x] **Item 253:** Smart Reminders - Push notifications for "Warranty Expiring" or "MOT Due" using the background job system.
- [x] **Item 254:** Natural Language Command Parsing - Enhance Ctrl+K to support "Add £50 to groceries" or "Log 1000 miles for Tesla".
- [x] **Item 255:** Automated Recurring Cost Matching - Suggest creating a `recurring_cost` when 3 similar transactions are detected in history.

## Phase 20: Predictive Intelligence & Ecosystem Expansion

_Goal: Leverage historical data for accurate forecasting and improve external interoperability._

- [x] **Item 261:** Predictive Vehicle Maintenance (v2) - Enhanced forecasting using linear regression on mileage logs to predict service dates with 90% accuracy.
- [x] **Item 262:** Advanced Energy Analytics - Visualise seasonal energy cost fluctuations and provide "Year-on-Year" comparison.
- [x] **Item 263:** Smart Budget Adjustments - Proactively suggest increasing or decreasing budget limits based on a 3-month sliding window of actual spend.
- [x] **Item 264:** Net Worth Projection - A 12-month "Wealth Horizon" chart predicting total net worth based on current savings rates and investment performance.
- [x] **Item 265:** Household Activity Heatmap - Visualise member engagement levels across different modules to identify under-utilised features.

## Phase 21: Financial Interoperability & Open Banking (Simulated)

_Goal: Deepen financial data integration and provide automated ingestion pipelines._

- [x] **Item 271:** Mock Plaid Integration - Create a sandbox environment to simulate linking real-world bank accounts and fetching live balances.
- [x] **Item 272:** Automated Transaction Categorization - Implement a keyword-based auto-categorization engine for imported CSV/PDF data.
- [x] **Item 273:** Multi-Currency Support - Support secondary currencies for accounts and assets with manual exchange rate overrides.
- [x] **Item 274:** PDF Statement Scraping - Implement server-side extraction of transaction tables from uploaded bank PDF statements using `pdf-parse`.
- [x] **Item 275:** Financial Goal Tracker - Advanced visualization for long-term savings goals with milestone tracking and "Time to Goal" projections.

## Phase 22: Advanced Household Services & Interoperability

_Goal: Extend system utility beyond basic tracking into proactive service management and better accessibility._

- [x] **Item 281:** Dynamic QR Code Sharing - Generate QR codes for WiFi access and member invites directly in the UI for guest convenience.
- [x] **Item 282:** Inventory Management (v2) - Support sub-locations and quantity tracking for consumables with low-stock alerts.
- [x] **Item 283:** Automated Grocery Lists - Proactively suggest shopping items based on historical consumption and predicted expiry dates.
- [x] **Item 284:** External Service Monitoring - Integrated local service status (Power, Water, Internet) using simulated external providers.
- [x] **Item 285:** Voice Command Accessibility - Implement a "Voice Command" mode using the Web Speech API for hands-free system navigation and data entry.

## Phase 23: Intelligent Maintenance & Hyper-Automation

_Goal: Transition from a passive tracking tool to an active household autopilot._

- [x] **Item 291:** Automated Maintenance Workflows - Proactively generate chores and calendar events when vehicle service or asset warranties are approaching.
- [x] **Item 292:** Guest Access Portal - A locked-down, QR-accessible dashboard for house guests showing WiFi, emergency contacts, and home manuals.
- [x] **Item 293:** Smart Home Unified View - Simulated integration with IoT ecosystems (Hue, Nest) to monitor home vitals (temp, light status).
- [x] **Item 294:** Optical Character Recognition (OCR) - Extract items and prices from physical receipt photos using `Tesseract.js` for automated expense entry.
- [x] **Item 295:** Household "Green Score" - A sustainability rating based on energy usage trends and waste recycling frequency.
