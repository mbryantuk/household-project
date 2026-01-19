# Changelog

All notable changes to this project will be documented in this file.

## [2.6.42] - 2026-01-19

### Changed
- **Finance:** Temporarily disabled Savings & Pots backend routes for rebuilding.
- **Finance:** Updated Savings UI to display a "Work In Progress" placeholder.

## [2.6.41] - 2026-01-16

### Added
- **Finance:** Implemented functional `IncomeView` for tracking employment and salary details.
- **Finance:** Implemented `BankingView` for managing Current Accounts with multi-user assignment support.
- **Schema:** Extended `finance_income` table to support detailed employment data (Employer, Role, Type, Gross Salary, etc.) and direct assignment to members/bank accounts.

## [2.6.40] - 2026-01-16

### Changed
- **Navigation:** Refactored Finance module navigation to use the side menu (Rail + Panel) pattern, consistent with People and Assets modules. Removed the top Category Bar.

## [2.6.37] - 2026-01-16

### Added
- **Finance:** Introduced `FinanceView` with a tabbed interface for managing Income, Banking, Savings, Credit, Loans, Mortgages, Investments, Pensions, and Budgets (Placeholders).
- **Navigation:** Added "Finance" option to the desktop sidebar and mobile navigation logic.

## [2.6.36] - 2026-01-16

### Fixed
- **Tests:** Fixed `finance_expanded.test.js` to explicitly create a member for assignment tests, resolving a `TypeError` when the member list is empty.

## [2.6.35] - 2026-01-16

### Added
- **Finance:** Added `finance_current_accounts` table for tracking bank accounts, overdrafts, and balances.
- **Finance:** Added API endpoints for Current Accounts CRUD operations.
- **Finance:** Added API endpoints for linking financial entities (Assignments) to household members.

## [2.6.34] - 2026-01-16

### Fixed
- **Theming:** Implemented dynamic browser tab color (`theme-color` meta tag) to match the active theme's primary color, replacing the hardcoded value.

## [2.6.31] - 2026-01-16

### Added
- **Security:** Enhanced "Invite User" flow now generates secure, random passwords and displays them to the admin upon successful invitation.
- **Identity:** User invitations now correctly capture and store First Name, Last Name, and Avatar/Emoji.

### Fixed
- **Theming:** Fixed tab labels in Settings View to correctly respect the selected theme's primary color instead of defaulting to blue.
- **Settings:** Verified and enhanced Regional Settings (Currency, Date Format, Decimals) integration.

## [2.6.24] - 2026-01-15

### Added
- **UI Consistency:** Styled household switcher roles with chips in the account menu for better visual hierarchy.
- **Navigation:** Renamed "House" sidebar option to "Assets" with a new `Inventory2` icon.
- **Assets:** Corrected navigation path for primary asset registry to `house/1`.

### Fixed
- **UX:** Suppressed back button on Asset Registry detail view for desktop users to match Vehicle view behavior.
- **Styling:** Normalized Meal Planner header typography to match system-wide standards.
- **Core:** Improved user role synchronization across multiple households.

## [2.6.6] - 2026-01-15

### Fixed
- **Navigation:** Fixed right-click context menu "Hide Module" requiring a page refresh. It now updates the sidebar immediately by synchronizing with the global household state.
- **Architecture:** Refactored `NavSidebar` to accept `onUpdateHousehold` prop to ensure consistent state propagation from child components.

## [2.6.5] - 2026-01-15

### Fixed
- **Settings:** Fixed module toggle (Pets, Vehicles, Meals) not reflecting immediately in the sidebar. The application now correctly synchronizes the global household state upon update, eliminating the need for a page refresh.

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