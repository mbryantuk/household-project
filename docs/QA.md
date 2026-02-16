# QA Standards & Protocols

## 1. API Coverage Mandate
**Rule:** The system must maintain **100% Swagger API Coverage** at all times.

### Definition of Done
No backend feature or refactor is considered complete until:
1.  **Swagger Definition:** Every new or modified endpoint is fully defined in `server/swagger.json`.
2.  **Test Implementation:** A corresponding test case exists in `server/tests/` that exercises the endpoint.
3.  **Verification:** The coverage check passed:
    ```bash
    cd server && npm run test:coverage
    ```
    (This script typically runs `jest` and checks against the `swagger.json` definition).

### Enforcement
- The `api_coverage_and_rbac.test.js` (or equivalent) serves as the gatekeeper.
- CI/CD pipelines and Nightly builds will fail if coverage drops below 100%.

## 2. Testing Layers

### Unit & Integration (Backend)
- **Tool:** Jest / Supertest
- **Scope:** All controllers, models, and utility functions.
- **Requirement:** Positive and negative test cases (success vs. error handling).

### Smoke & E2E (Frontend)
- **Tool:** Playwright
- **Scope:** Critical user flows (Login, Dashboard loading, CRUD operations).
- **Requirement:** Tests must pass in a headless environment.

## 3. Operations
- **Data Hygiene:** Tests must clean up after themselves or use the `test:tidy` script.
- **Tenancy:** Tests must verify that users cannot access data from other households.
