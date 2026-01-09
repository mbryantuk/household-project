# Changelog

## [1.1.0] - 2026-01-09

### Added
- **Multi-Tenancy Isolation**: Strictly enforced data isolation at the database and middleware level. Every request now validates the household context.
- **Asset-First Financial Modeling**:
    - **Vehicles**: Track purchase value, replacement cost, and maintenance fees. Added sub-modules for History, Finance, Insurance, and MOT.
    - **Appliance Register**: New register for household assets with warranty tracking and depreciation modeling.
- **Advanced Waste Management**: Replaced static info with a dynamic collection registry supporting multiple types, frequencies, and collection days.
- **Nested Navigation**: Organized Sidebar with collapsible submenus for "House" and "Vehicles" for improved UX.
- **GitHub Ready Documentation**: Created a comprehensive root `README.md` with features, tech stack, and setup guides.
- **Automated Isolation Tests**: New integration suite verifying tenant isolation and role-based access control (RBAC).

### Changed
- **UX Standards Implementation**:
    - Replaced all `window.alert` calls with Material UI Snackbars/Notifications.
    - Replaced `window.prompt` with dedicated Dialog modals.
    - Standardized feedback loop using centralized `showNotification` context.
- **Database Architecture**: Migrated all tables to include `household_id`. Every query now filters by the active tenant.

### Fixed
- **Build Errors**: Resolved mismatched JSX tags in `PetsView.jsx`.
- **Runtime Errors**: Fixed missing `Divider` import in `EnergyView.jsx`.
- **Icon Warnings**: Removed non-existent `Insurance` icon import in `VehiclesView.jsx`.
- **Docker Warnings**: Cleaned up obsolete `version` field in `docker-compose.yml`.
