# Changelog

All notable changes to this project will be documented in this file.

## [3.3.0] - 2026-02-23

### Added

- **Real-time:** Integrated **Socket.io** for instant dashboard updates. The system now automatically broadcasts sensitive data changes to all connected household members, triggering silent TanStack Query cache invalidations for an "always-live" feel.
- **UX:** Implemented **Dashboard Grid System (v2)** using `react-grid-layout`. Users can now fully customize their dashboard via drag-and-drop, with layout persistence saved to their global profile.
- **Auth:** Integrated **Clerk Identity Provider**. This enables enterprise-grade MFA, Passkeys, and secure social login with automatic local user profile and tenancy synchronization.
- **Security:** Implemented **Infisical Secrets Management**. All sensitive configuration is now securely stored and fetched during server startup.
- **Architecture:** Completed the **Migration to Centralized PostgreSQL**. All global identity, tenancy, and telemetry data have been migrated from SQLite to Postgres.
- **Infrastructure:** Integrated **BullMQ & Redis** for high-performance background job processing.
- **Infrastructure:** Integrated **S3-Compatible Storage Abstraction** for handling household assets.
- **Security:** Implemented **Immutable Audit Logging** backed by PostgreSQL.
- **Security:** Introduced **Systemic Field-Level Encryption** (AES-256-GCM).
- **Security:** Implemented **API Rate Limiting** with tiered thresholds.
- **Testing:** Introduced **Deterministic Seeding** using `@faker-js/faker`.

... [Rest of file unchanged]
