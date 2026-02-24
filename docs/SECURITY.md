# Security Architecture Guide

Hearthstone is built with a **Privacy-First, Zero-Trust** mentality. This document outlines the technical safeguards implemented to protect multi-tenant data.

---

## 1. Multi-Tenancy Isolation

The most critical security boundary in Hearthstone is the isolation between households.

### Physical Isolation (Tier 1)

Unlike traditional SaaS that uses a shared "tenant_id" column in a massive table, Hearthstone uses **Physical Database Sharding**. Every household has its own SQLite file.

- **Impact:** A catastrophic SQL injection vulnerability in one household's context cannot accidentally leak data from another, as the database connections are physically restricted to a single file.

### Context Verification (Tier 2)

The `tenant.js` middleware enforces the following lifecycle:

1. **Header Inspection:** Detects `x-household-id` from the request.
2. **Global Registry Lookup:** Checks the `user_households` table in PostgreSQL to verify that the authenticated `userId` has an active link to that `householdId`.
3. **Connection Scoping:** Only after verification is a scoped SQLite connection opened.

---

## 2. Authentication & Identity

### Password Security

- **Algorithm:** Bcrypt with a cost factor of 12.
- **Policy:** Minimum 8 characters, requiring numbers and special characters.

### Modern Identity Providers

- **Clerk Integration:** Supports enterprise-grade SSO, social login, and managed MFA.
- **Passkeys (WebAuthn):** Fully supported for passwordless, phishing-resistant authentication.

### Session Management

- **Stateless JWTs:** Short-lived tokens for API authorization.
- **HTTP-Only Cookies:** JWTs are stored in secure, `SameSite=Strict` cookies to prevent XSS-based token theft.
- **Session Revocation:** Admins can remotely revoke all active sessions for a user via the global `user_sessions` registry.

---

## 3. Data Protection

### Field-Level Encryption (FLE)

Sensitive financial and personal data is encrypted at the application layer using **AES-256-GCM**.

- **Keys:** Derived from a unique per-tenant salt combined with a master `SECRET_KEY`.
- **Scope:** Includes Bank Account Numbers, Sort Codes, Dates of Birth, and Vehicle Registrations.

### Deep Sanitization

All incoming request payloads (Body, Query, Params) are recursively processed by the `deepSanitize` middleware using the `xss` library.

- **Goal:** Neutralize any potential Stored or Reflected XSS payloads before they reach the database or validation logic.

---

## 4. Network Security

### Content Security Policy (CSP)

Hearthstone implements a restrictive CSP to prevent the execution of untrusted scripts and unauthorized data exfiltration.

- `default-src: 'self'`
- `script-src`: Restricts to trusted domains (e.g., Clerk, Google Fonts).
- `connect-src`: Only allows API calls to the origin and specified analytics endpoints.

### CORS Whitelisting

Cross-Origin Resource Sharing is restricted to a strict whitelist defined in `config.ts`. In production, this only permits the primary application domain.

---

## 5. Audit & Compliance

### Immutable Audit Log

Every state-changing action (Create, Update, Delete) is recorded in the `audit_logs` table.

- **Metadata:** Captures `userId`, `householdId`, `action`, `timestamp`, `ipAddress`, and a delta of changed fields.
- **GDPR Compliance:** Supports full "Right to be Forgotten" via cascading deletes that purge PII while maintaining anonymized financial aggregates if required.
