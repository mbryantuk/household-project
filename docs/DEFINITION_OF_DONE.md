# Definition of Done (DoD)

Before any feature, bug fix, or technical task can be considered complete and ready for deployment to the `main` branch, the following criteria **must** be met.

---

## 1. Code Quality & Formatting

- [ ] **No Warnings:** Code passes all ESLint rules (`npm run lint`) with ZERO warnings or errors.
- [ ] **Format Consistency:** Code is formatted according to Prettier standards.
- [ ] **Logging Hygiene:** No `console.log` statements are left in production paths. Use `logger.info()` or `logger.error()`.
- [ ] **Type Safety:** Types are strictly defined (TypeScript/Zod); NO `any` types are permitted.

## 2. Testing & Verification

- [ ] **Test Coverage:** Every bug fix or new feature MUST include at least one corresponding integration test (`*.spec.js`).
- [ ] **Centralized Suite:** The Centralized Test Suite (`./scripts/ops/run_test_suite.sh`) passes with 100% success.
- [ ] **Smoke Tests:** If UI is modified, `web/tests/smoke.spec.js` must be updated and pass.
- [ ] **Failure Modes:** Explicitly verify "unhappy paths" (e.g., unauthorized access, invalid inputs, DB connection loss).

## 3. Architecture & Standards

- [ ] **Design Tokens:** All UI elements use `MUI Joy` tokens (no hardcoded hex values or inline styles).
- [ ] **Schema Evolution:** Database migrations are forward-only, idempotent, and verified by `drizzle-kit`.
- [ ] **API Documentation:** New endpoints are documented in `server/swagger.json` with correct schemas.
- [ ] **Config Schema:** New environment variables are defined in `server/config.ts` (Zod validation).

## 4. Security & Privacy

- [ ] **Tenancy Check:** Verify that `household_id` isolation is enforced in all new DB queries and middleware.
- [ ] **Secret Sanitization:** Ensure no API keys, tokens, or PII are logged to stdout or committed to git.
- [ ] **XSS Protection:** New UI inputs use standard React/Joy components that provide automatic sanitization.

## 5. Process & Documentation

- [ ] **Conventional Commits:** Commit messages follow the spec (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- [ ] **ADR Entry:** If a major architectural decision was made (e.g., changing a storage driver), create a new ADR in `docs/adr/`.
- [ ] **Guide Update:** If a developer workflow changed, update `docs/DEVELOPMENT_GUIDE.md`.
- [ ] **Review:** Code has been reviewed and approved by at least one other engineer or system architect.
