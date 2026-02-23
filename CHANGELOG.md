# Changelog

All notable changes to this project will be documented in this file.

## [3.3.0] - 2026-02-23

### Added

- **Architecture:** Completed the **Migration to Centralized PostgreSQL**. All global identity (Users, Sessions, Passkeys), tenancy (Households, Links), and telemetry (Test Results, Audit Logs) have been migrated from SQLite to Postgres with a full Drizzle ORM schema.
- **Infrastructure:** Integrated **BullMQ & Redis** for high-performance background job processing. This enables reliable, retriable asynchronous tasks such as automated backups and audit log persistence.
- **Infrastructure:** Integrated **S3-Compatible Storage Abstraction**. The new Storage Service supports both local filesystem and S3 drivers for handling household assets (avatars, receipts, scans) with logical isolation.
- **Security:** Implemented **Immutable Audit Logging** backed by PostgreSQL. All sensitive actions (Create, Update, Delete) across People, Assets, and Finance are now tracked with user context, IP addresses, and metadata snapshots.
- **Security:** Introduced **Systemic Field-Level Encryption** (AES-256-GCM). Middleware now automatically handles encryption for sensitive fields like account numbers, DOBs, and registrations, ensuring data is never stored in plain text.
- **Security:** Implemented **API Rate Limiting** with `express-rate-limit`, featuring tiered thresholds for Auth (strict), Standard API, and Sensitive actions (exports/backups).
- **Testing:** Introduced **Deterministic Seeding** using `@faker-js/faker`. The new `seed:deterministic` script allows for repeatable, realistic test data generation using a fixed seed.

### Changed

- **Frontend:** Completed the migration to **TanStack Query** for all core modules (Finance, Shopping, Meals, People, Vehicles, Assets, Chores).
- **Frontend:** Refactored all Home Dashboard widgets to use aggregated TanStack Query hooks, significantly reducing redundant API calls and improving data consistency.
- **Frontend:** Standardized entity editing via `GenericObjectView` with automatic cache invalidation and mutation handling.

... [Rest of file unchanged]
