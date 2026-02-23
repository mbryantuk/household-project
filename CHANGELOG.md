# Changelog

All notable changes to this project will be documented in this file.

## [3.3.0] - 2026-02-23

### Added

- **Security:** Implemented **Immutable Audit Logging** backed by PostgreSQL. All sensitive actions (Create, Update, Delete) across People, Assets, and Finance are now tracked with user context, IP addresses, and metadata snapshots.
- **Security:** Introduced **Systemic Field-Level Encryption** (AES-256-GCM). Middleware now automatically handles encryption for sensitive fields like account numbers, DOBs, and registrations, ensuring data is never stored in plain text.
- **Architecture:** Formalized transition to **Centralized PostgreSQL** for global identity, tenancy, and audit trails, moving away from legacy SQLite globals.

### Changed

- **Frontend:** Completed the migration to **TanStack Query** for all core modules (Finance, Shopping, Meals, People, Vehicles, Assets, Chores).
- **Frontend:** Refactored all Home Dashboard widgets to use aggregated TanStack Query hooks, significantly reducing redundant API calls and improving data consistency.
- **Frontend:** Standardized entity editing via `GenericObjectView` with automatic cache invalidation and mutation handling.

## [3.2.309] - 2026-02-23

### Added

- **Maintenance:** Introduced "Item 72" to the roadmap (`todo.md`) to ensure all project documentation (.md files) is kept up-to-date with every major change.

## [3.2.308] - 2026-02-23

### Fixed

- **Frontend:** Resolved a critical `ReferenceError` where `authAxios` was accessed before initialization in `AppInner`. Moved `authAxios` and `navigate` definitions above the TanStack Query hook section.
- **Testing:** Fixed flaky `concurrency.test.js` and added detailed failure logging to the backend performance suite.
- **Testing:** Restored 100% pass rate for the Nightly Comprehensive Suite.

... [Rest of file unchanged]
