# Changelog

## [Unreleased] - 2026-01-09

### Added
- **Persistent Dashboard**: Layouts are now stored on the backend per user/household, enabling multi-device synchronization.
- **Multi-Page Dashboard**: Added support for multiple dashboard pages with a dedicated page switcher.
- **Household-Level Backups**: Household admins can now create, download, and restore their own database backups directly from Settings.
- **Direct DB Download**: Admins can now download the raw SQLite `.db` file for easy local management.
- **Update Notifications**: Proactive "New version available" prompt for PWA/Web updates.
- **Project Guidelines**: Introduced `gemini.md` for project-specific workflow and architecture standards.

### Changed
- **Folder Structure**: Cleaned up nested `web/household-manager` project.
- **Server Services**: Refactored backup logic to support scoped (household) and full (system) backups.
- **UI Refinements**: 
    - Reduced excessive top spacing in main layouts.
    - Improved calendar contrast in Dark and Dracula modes.
    - More prominent "Today" highlight on calendars.
- **Admin Dashboard**: Simplified AccessControl to focus on platform-wide management and full system backups.

### Fixed
- **API Routing**: Fixed duplicate routes and corrected tenant deletion in tests.
- **API Tests**: Updated and synchronized API tests with recent server changes.
- **Admin Page Crash**: Fixed a regression where the Admin page would crash due to missing `api` context.
