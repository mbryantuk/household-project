# Totem: Multi-Tenant Household Management System

Totem is a high-performance, multi-tenant Household Management SaaS designed with an **Asset-First** approach. It treats every household item not just as data, but as a financial asset that integrates directly into a monthly budget and maintenance forecast.

## 🚀 Key Features

*   **Strict Multi-Tenancy:** Secure data isolation using unique Household Keys and tenant-specific database contexts.
*   **Enhanced Unified Calendar:** 
    *   Comprehensive view of events, birthdays, and anniversaries.
    *   **Financial Integration:** Automated expansion of recurring costs onto the calendar.
    *   **Bank Holiday Support:** Automated import of UK Bank Holidays (gov.uk API).
    *   **Smart Scheduling:** Support for "Nearest Working Day" logic (prior working day) for recurring items.
*   **Household Personalization:** Customizable household identity with Emojis and Avatars for better visual recognition.
*   **Comprehensive User Management:** Track detailed user profiles (First Name, Last Name, Email) with customizable Emoji avatars and granular RBAC.
*   **Asset-First Financial Modeling:**
    *   **Appliance Register:** Track purchase value, replacement cost, and depreciation for all household items.
    *   **Vehicle Fleet Management:** Comprehensive tracking of service history, finance agreements, insurance, and MOT/Tax schedules.
*   **Physical Asset CRUD with Date Tracking:** Full lifecycle management for Vehicles, Assets, and Energy accounts with automated date-based tracking (MOT, Warranty, Contract Ends).
*   **Advanced Waste Management:** Multi-type collection scheduling with customizable frequencies (Daily, Weekly, Biweekly, Monthly).
*   **Role-Based Access Control (RBAC):** Granular permissions supporting Admin (Full Access), Member (Standard), and Viewer (Read-only) roles.
*   **Modern UI/UX:** Built with Material Design principles, featuring a responsive Sidebar with nested submenus and Dracula/Dark mode support.

## 🛠️ Tech Stack

*   **Frontend:** React 19, Vite, Material UI (MUI), React Router 6.
*   **Backend:** Node.js, Express 5, JWT Authentication.
*   **Database:** SQLite (Global Registry + Individual Tenant Databases).
*   **DevOps:** Docker, Docker Compose, GitHub Actions Ready.

## 📦 Setup & Installation

### Prerequisites
*   Docker & Docker Compose
*   Node.js 20+

### Quick Start (Production)
```bash
# Build and start the unified container
docker compose up -d --build
```
Access the application at `http://localhost:4001`.

### Development Setup
```bash
# Install server dependencies
cd server && npm install

# Install web dependencies
cd ../web && npm install

# Run backend
cd ../server && npm start

# Run frontend (in a separate terminal)
cd ../web && npm run dev
```

## 🧪 Testing

Totem maintains high stability through rigorous integration and smoke testing.

```bash
# Run all backend and integration tests
cd server && npm test

# Run specific integration suite
npx jest tests/api.test.js
```

## 🛡️ Security & Privacy
*   Data isolation at the database file level.
*   Middleware enforcement of household context for every API request.
*   No cross-tenant data leakages (Verified via Automated Isolation Tests).