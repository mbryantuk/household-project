# Changelog

## [Unreleased] - 2026-01-09

### Added
- **Persistent Dashboard**: Layouts are now stored on the backend per user/household, enabling multi-device synchronization.
- **Multi-Page Dashboard**: Added support for multiple dashboard pages with a dedicated page switcher.
- **Project Guidelines**: Introduced `gemini.md` for project-specific workflow and architecture standards.
- **Vite Build**: Updated web build pipeline and distribution.

### Changed
- **Folder Structure**: Cleaned up nested `web/household-manager` project.
- **Server Services**: Refactored backup logic for better reliability.
- **Docker**: Unified Dockerfile implementation for streamlined deployments.

### Fixed
- **API Tests**: Updated and synchronized API tests with recent server changes.
- **Admin Page Crash**: Fixed a regression where the Admin page would crash due to missing `api` context in the Outlet. The `api` object is now correctly passed from `RootLayout` to child routes.