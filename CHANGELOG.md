# Changelog

All notable changes to this project will be documented in this file.

## [2.6.4] - 2026-01-15

### Fixed
- **Navigation:** Fixed sidebar context menu not closing on click-away by adding a global event listener.

## [2.6.3] - 2026-01-15

### Fixed
- **Navigation:** Fixed "invisible sidebar" issue by refactoring `NavSidebar` layout and moving the Context Menu outside the flex container to prevent layout conflicts.

## [2.6.2] - 2026-01-15

### Fixed
- **Navigation:** Fixed "Sidebar not loading" crash caused by incompatible Context Menu implementation. Switched to using a Virtual Anchor Element for Joy UI compatibility.

## [2.6.1] - 2026-01-15

### Added
- **Navigation:** Right-click context menu on sidebar items to quickly hide modules (Pets, Vehicles, Meals).

### Fixed
- **People:** Fixed "Box is not defined" crash by adding missing MUI imports.
- **Settings:** Fixed navigation tab indexing to ensure the correct tab opens (e.g., About).
- **Core:** Fixed module persistence issue. Enabled modules now persist correctly after reload (Added `enabled_modules` to global `households` schema).

## [1.0.0] - 2024-01-14
### Added
- Initial release of Totem Household Management System.
- Core modules: Members, Assets, Vehicles, Meals, Finance, Calendar.
- Multi-tenancy support.