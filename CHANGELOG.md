# Changelog

## [Unreleased] - 2026-01-09

### Added
- **Nightly Backup Toggle**: Added an automation toggle in Household Maintenance to enable/disable nightly backups.
- **Custom Retention**: Households can now specify how many days of backups to retain.
- **Persistent Dashboard**: Layouts are now stored on the backend per user/household, enabling multi-device synchronization.
- **Multi-Page Dashboard**: Added support for multiple dashboard pages with a dedicated page switcher.
- **Household-Level Backups**: Household admins can now create, download, and restore their own database backups directly from Settings.
- **Direct DB Download**: Admins can now download the raw SQLite `.db` file for easy local management.
- **Update Notifications**: Proactive "New version available" prompt for PWA/Web updates.
- **Project Guidelines**: Introduced `gemini.md` for project-specific workflow and architecture standards.

### Changed
- **Backup Logic**: The nightly cron now performs a full system backup AND individual household backups for those with the feature enabled.
- **Folder Structure**: Cleaned up nested `web/household-manager` project.
- **Server Services**: Refactored backup logic to support scoped (household) and full (system) backups.
- **UI Refinements**: 
    - Reduced excessive top spacing in main layouts.
    - Improved calendar contrast in Dark and Dracula modes.
    - More prominent "Today" highlight on calendars.
- **Admin Dashboard**: Simplified AccessControl to focus on platform-wide management and full system backups.

### Fixed
- **Frontend Runtime Errors**: Fixed `ReferenceError: Divider is not defined` in `EnergyView.jsx` by adding the missing import.
- **Frontend Build Errors**: Fixed a mismatched JSX tag in `PetsView.jsx` and removed a non-existent `Insurance` icon import in `VehiclesView.jsx`.
- **Docker Config**: Removed obsolete `version` attribute from `docker-compose.yml`.
- **API Routing**: Fixed duplicate routes and corrected tenant deletion in tests.
- **API Tests**: Updated and synchronized API tests with recent server changes.
- **Admin Page Crash**: Fixed a regression where the Admin page would crash due to missing `api` context.