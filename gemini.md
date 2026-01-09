# Project Guidelines & Workflow Protocols

## 0. Project Mission
**Goal:** Build a **Multi-Tenant** "Household Management System" (SaaS) where:
1.  **Tenancy:** Users join a specific "Household" using a unique Key. Data is strictly isolated.
2.  **Asset-First Approach:** "Household Items" are treated as **Financial Assets** (value, insurance, maintenance) that feed into the Budget.
3.  **Integration:** Assets, Meal Plans, and Expenses all feed into a central **Monthly Budget**.

---

## 1. Architecture & Scalability
* **Multi-Tenancy Enforcement (CRITICAL):**
    * Every data model MUST have a `household_id`.
    * **Every** query MUST filter by `household_id`.
* **Financial Data Modeling:** Include financial fields (`purchase_value`, `monthly_maintenance_cost`) for all physical assets.
* **Modular Design:** Organize code by feature (e.g., `modules/assets`).

## 2. Frontend & UX Standards
* **Centralized Components:** Never duplicate UI logic. Extract shared elements (e.g., `EmojiTracker`, `CurrencyInput`) to `components/ui/`.
* **Design System:** Material Design (MUI/Paper).
* **Interaction:** No `window.alert/prompt`. Use Modals and Snackbars.
* **Calendar Fundamentals (CRITICAL):**
    * ANY item added with a date or "day of the month" MUST be visible in the Calendar view.
    * Recurring items with a "day of the month" MUST support "Nearest Working Day" logic (adjusting to the prior working day if falling on a weekend/bank holiday).

## 3. Documentation (GitHub Ready)
* **README.md Maintenance (CRITICAL):**
    * You MUST update the `README.md` whenever a new feature is added.
    * **Structure:** Ensure the README includes:
        * **Key Features:** A bulleted list of what the app does.
        * **Tech Stack:** Updated list of libraries used.
        * **Setup:** Current commands to run Docker and tests.
* **Swagger/OpenAPI:** Update specs if APIs change.

## 4. Testing Standards
* **Tenant Isolation:** Verify Household A cannot access Household B's data.
* **CRUD Coverage:** Create, Read, Update, Delete tests for all objects.
* **RBAC:** "Viewer" accounts can only Read (GET).

## 5. Deployment & Release Protocol
At the very end of your response, strictly provide a **Bash Script Block**:
1.  **Verify Docker Config:** Check `docker-compose.yml` paths. Update if files moved.
2.  **Rebuild:** `docker compose up -d --build`.
3.  **Verify Tests:** Run tests (e.g., `npm test`) to ensure the build is safe.
4.  **Git Check-in:** Stage files and commit with a descriptive release note.

---

## 6. Stability Protocols (CRITICAL)
* **NO REPLACE TOOL:** Do not use "search and replace".
* **Full Rewrites:** Read the file, modify in memory, then **Overwrite the entire file**.
* **Verification:** Run `cat filename` after writing to verify.

---

### Example Output Structure
1.  [The Modular Code Changes]
2.  [The Swagger & **README.md** Updates]
3.  [The API Test Update]
4.  [**Status Report**: Summary of changes and library warnings]
5.  [The "Finalize" Bash Script]
