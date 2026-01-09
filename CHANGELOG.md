# Changelog

## [Unreleased] - 2026-01-09

### Added
- **Swagger UI**: Added `swagger-ui-express` to serve API documentation at `/api-docs`.
- **Tests**: Added integration test for verifying Swagger UI accessibility.

### Fixed
- **Admin Page Crash**: Fixed a regression where the Admin page would crash due to missing `api` context in the Outlet. The `api` object is now correctly passed from `RootLayout` to child routes.
