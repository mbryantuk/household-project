# Changelog

## [2.5.4] - 2026-01-15
### Added
- Logout shortcut in mobile bottom navigation bar.
- Logout button in desktop utility bar.
- Palette visualization in Theme Selector (Coolors-style).

### Changed
- Refined Utility Bar widgets to hide visual scrollbars for a native app aesthetic.

## [2.5.3] - 2026-01-14

### Added
- **UI/UX:** Integrated Emoji Picker into the **User Management** modal in Settings.
- **UI/UX:** Standardized Emoji rendering across the app by switching to **Native Emoji Style** for both the picker and display.

### Fixed
- **UI:** Resolved missing emoji selector when editing or inviting users in Settings.
- **Consistency:** Aligned emoji styles between selection and assignment screens.

## [2.5.0] - 2026-01-14
### Added
- **UI Architecture:** Migrated Theme Storage from **Household-level** to **User-level**. User preferences now follow the profile across all devices and households.
- **Theme Library:** Expanded to **51 vibrant themes** (25 Light, 26 Dark).
- **UI:** Enhanced visual impact with deeper color integration in `JoyCard`, `JoySheet`, and background levels.
- **UI:** Grouped themes by **Light Mode** and **Dark Mode** in Settings for better accessibility.

### Changed
- **UI:** Removed Theme Quick Picker from Sidebar to declutter navigation.
- **UI:** Removed theme selection from Household creation (using user's active theme instead).
- **Backend:** Updated `users` schema to include `theme` and synchronized via Profile API.

## [2.4.1] - 2026-01-14
### Added
- **UI:** Replaced legacy theme system with a comprehensive library of **30+ vibrant themes** (15 Light, 15 Dark, 1 High Contrast).
- **UI:** Integrated household-level theme storage, ensuring preferences persist across sessions and users within the same household.
- **UI:** Enhanced **Settings View** with a visual theme gallery for easy personalization.
- **UI:** Added a **Quick Theme Picker** grid to the Navigation Sidebar for rapid mode/color switching.

### Changed
- **Branding:** Removed "Dracula" and "Alucard" specific naming in favor of descriptive, fun theme names (e.g., "Midnight City", "Neon Dreams", "Ocean Breeze").
- **Documentation:** Updated `README.md` and `Gemini.md` to reflect the new 30-theme standard and removed legacy palette references.

## [2.3.0] - 2026-01-14
### Added
- New UI components for household management (FloatingCalculator, FloatingCalendar, Widget system).
- Calendar view for tracking household events and budgets.
- Detailed views for various household aspects (Energy, Waste, Water, etc.).

### Changed
- **UI:** Renamed "Household Settings" header to "Settings".
- **UI:** Renamed "Team" tab to "Users" in Settings.
- **UI:** Moved Theme controls from Settings tab to Sidebar.
- **UI:** Enhanced Sidebar Theme Switcher with Light/Dark/System modes and Dracula/Alucard toggle.
- **UI:** Standardized Settings tabs styling to match People/Pets views.

### Fixed
- **Bug:** Fixed unresponsive "Edit User" button in Settings by restoring the missing Modal component.
- Improved layout and responsiveness of the main dashboard.
- Enhanced authentication and member management.
- Fixed User profile menu click-away behavior and z-index.

### To Do
- Seed realistic budget data for calendar testing.

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