# Security Audit Report

**Date:** 2026-02-22
**Auditor:** Gemini CLI Agent

## Executive Summary

The system demonstrates a robust security posture, primarily due to its **Physical Tenancy Isolation** architecture (SQLite-per-household). However, an operational issue with a stale "Maintenance Mode" lock file caused a denial of service for new sessions, which has been resolved. The frontend dependency tree contains high-severity vulnerabilities that require a major version upgrade strategy.

## 1. Tenancy & Isolation

**Status:** ✅ **PASS (Secure by Design)**

- **Architecture:** The system uses a "Database-per-Tenant" model (`server/db.js:getHouseholdDb`).
- **Verification:**
  - `middleware/tenant.js` ensures a specific `.db` file is loaded for each request.
  - `server/routes/finance.js` and `server/routes/chores.js` utilize this isolated connection (`req.tenantDb`).
  - Cross-tenant data leakage is structurally impossible at the SQL level unless the `household_id` parameter itself is manipulated _before_ the DB connection is established (which is protected by Auth Middleware).

## 2. Role-Based Access Control (RBAC)

**Status:** ✅ **PASS**

- **Tests:** All 15 security test suites in `server/tests/security/` passed successfully.
- **Scope:** Verified checks for `requireSystemRole('admin')`, `requireHouseholdRole('admin')`, and `requireHouseholdRole('member')`.
- **Coverage:** Admin routes are correctly protected.

## 3. Operational Security

**Status:** ⚠️ **WARNING (Resolved)**

- **Incident:** The system was rejecting valid requests with "System Upgrade in Progress".
- **Root Cause:** A stale lock file (`server/data/upgrading.lock`) from a failed or interrupted nightly process (likely `2026-02-22 00:00`).
- **Remediation:** Lock file removed. System restored to normal operation.
- **Recommendation:** Update `scripts/ops/nightly_suite.sh` to ensure cleanup of lock files on failure.

## 4. Dependency Vulnerabilities

**Status:** ❌ **FAIL (Action Required)**

### Frontend (`web/`)

- **Severity:** High
- **Issue 1:** `minimatch < 10.2.1` (ReDoS). Dependency of `eslint`.
- **Issue 2:** `esbuild <= 0.24.2` (SSR Request Smuggling). Dependency of `vite`.
- **Impact:** Development-time risks primarily, but `esbuild` affects the build pipeline.
- **Remediation:** Requires `npm audit fix --force`. This will upgrade `vite` to v6 and `eslint` to v9, which are **breaking changes**.
  - _Recommendation:_ Schedule a dedicated task for "Frontend Tooling Upgrade".

### Backend (`server/`)

- **Status:** ✅ **CLEAN**

## 5. Secrets Management

**Status:** ✅ **PASS**

- **Static Analysis:** No hardcoded secrets (API keys, passwords, tokens) were found in the application source code.
- **Config:** Secrets are correctly loaded via `server/config.js` and environment variables.

---

**Next Steps:**

1.  Monitor `nightly_suite.sh` for lock file handling.
2.  Create a ticket/task to upgrade Frontend dependencies (`vite`, `eslint`).
