# User Stories & Functional Requirements

This document catalogs the user stories for the Household Management System ("Hearthside"), derived from the existing codebase capabilities. It serves as the "source of truth" for rebuilding or refactoring features without incurring technical debt.

## 1. Authentication & Onboarding

### Registration & Login

- **As a** new user, **I want** to register with my email and password, **so that** I can create a secure account.
- **As a** registered user, **I want** to log in, **so that** I can access my private data.
- **As a** user, **I want** my session to persist (JWT), **so that** I don't have to log in every time I refresh.

### Household Management (Tenancy)

- **As a** user, **I want** to see a list of households I belong to, **so that** I can select which workspace to enter.
- **As a** new user, **I want** a default household created for me upon registration, **so that** I can start immediately.
- **As a** user, **I want** the application to remember my last visited household, **so that** I am redirected there automatically upon login.

## 2. Dashboard (Home)

- **As a** user, **I want** to see a high-level dashboard ("HomeView"), **so that** I can get an immediate overview of my household's status.
- **As a** user, **I want** to see widgets for key metrics (e.g., Budget Health, Upcoming Bills), **so that** I can take quick actions.

## 3. People & Members

### Member Management

- **As a** household admin, **I want** to add members (people) to my household, **so that** I can track data specific to them.
- **As a** user, **I want** to categorize members as "Adults" or "Children", **so that** the system can apply appropriate logic (e.g., financial ownership).
- **As a** user, **I want** to record details like Date of Birth, **so that** the calendar can automatically populate birthdays.

### Pets

- **As a** user, **I want** to add pets to the household, **so that** I can track their specific needs (e.g., vet bills, insurance).
- **As a** user, **I want** to view a dedicated list of pets, **so that** their information is organized separately from humans.

## 4. Assets & Inventory

### General Assets

- **As a** user, **I want** to catalog physical assets (electronics, furniture, etc.), **so that** I have a record for insurance and net worth calculations.
- **As a** user, **I want** to record purchase value, replacement cost, and warranty expiry, **so that** I can manage lifecycle and financial risks.
- **As a** user, **I want** to store encrypted serial numbers, **so that** I can retrieve them securely in case of theft.

### Vehicles

- **As a** user, **I want** to track vehicles (cars, bikes), **so that** I can manage their specific compliance and maintenance needs.
- **As a** user, **I want** to track MOT and Tax due dates, **so that** I never miss a legal deadline.
- **As a** user, **I want** to log service history (mileage, cost), **so that** I have a maintenance record for resale or upkeep.

## 5. Calendar & Planning

### Calendar View

- **As a** user, **I want** a unified calendar view, **so that** I can see all household events in one place.
- **As a** user, **I want** to see automatically generated events for Birthdays, MOTs, Insurance Renewals, and Bill Payments, **so that** I don't have to manually enter them.
- **As a** user, **I want** to manually add one-off events, **so that** I can track ad-hoc appointments.

### Meal Planning

- **As a** user, **I want** to maintain a library of meals/recipes, **so that** I can easily choose what to cook.
- **As a** user, **I want** to assign meals to specific dates on a weekly planner, **so that** the household knows what's for dinner.

## 6. Household Operations

### House Details

- **As a** user, **I want** to store property details (e.g., WiFi password, emergency contacts), **so that** this information is easily accessible to all members.

### Utilities Management

- **As a** user, **I want** to track Energy (Gas/Elec), Water, and Waste details, **so that** I can manage providers and costs.
- **As a** user, **I want** to track Council Tax details, **so that** I can ensure payments are correct.

## 7. Finance (The Core)

### Income

- **As a** user, **I want** to record income sources (Salary, etc.) for each member, **so that** we can calculate total household inflow.
- **As a** user, **I want** to specify the frequency and bank account for each income, **so that** cash flow projections are accurate.

### Banking & Accounts

- **As a** user, **I want** to list Current Accounts with their balances, **so that** I know my liquid cash position.
- **As a** user, **I want** to encrypt sensitive account numbers, **so that** my banking data is secure.

### Savings & Investments

- **As a** user, **I want** to track Savings Accounts and specific "Pots" (goals), **so that** I can monitor progress toward financial targets.
- **As a** user, **I want** to track Investments (Stocks, Crypto) with unit counts and values, **so that** I can see my wider net worth.
- **As a** user, **I want** to track Pensions, **so that** I can plan for retirement.

### Liabilities (Debts)

- **As a** user, **I want** to track Credit Cards (Balance, Limit, APR), **so that** I can manage debt repayment.
- **As a** user, **I want** to track Loans and Mortgages, **so that** I have a complete picture of liabilities.
- **As a** user, **I want** to track Vehicle Finance specifically, **so that** it links to the relevant vehicle asset.

### Recurring Costs (Subscriptions & Bills)

- **As a** user, **I want** a centralized register of all recurring costs (Utilities, Subscriptions, Insurance), **so that** nothing is missed.
- **As a** user, **I want** to link a cost to a specific asset or vehicle (e.g., "Car Insurance" linked to "Ford Fiesta"), **so that** the total cost of ownership is clear.
- **As a** user, **I want** the system to project these costs onto the calendar ("Nearest Working Day" logic), **so that** I know exactly when money leaves my account.

### Budgeting

- **As a** user, **I want** to see a "Budget Progress" view, **so that** I can compare actual spending against the projected recurring costs for the month.
- **As a** user, **I want** to close a budget cycle, **so that** I can archive the month's performance and reset for the next.

## 8. Settings & Admin

### User Profile

- **As a** user, **I want** to update my personal profile (theme preference, password), **so that** I can customize my experience.

### System Admin

- **As a** user, **I want** to configure global application settings, **so that** I can toggle modules (e.g., turn off "Pets" if I don't have any).
- **As a** user, **I want** to view system health or version history, **so that** I trust the platform's stability.
