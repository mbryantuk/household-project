# Hearthstone Onboarding Guide

Welcome to the Hearthstone engineering team! This is a living document—if you find something confusing or outdated, **please submit a PR to fix it as your first contribution!** This ensures the onboarding path is always smooth for the next person (Item 170).

## 1. The Core Philosophy

Hearthstone is a multi-tenant Household Management SaaS.
The prime directive is **The Tenancy Rule**: EVERY database query MUST explicitly filter by `household_id`. There are zero exceptions.

## 2. Setting Up Your Environment

1. **Prerequisites:** Install Docker, Docker Compose, and Node.js. (We use `.nvmrc` to pin `v22.14.0`).
2. **One-Command Setup (Recommended):**

   ```bash
   npm run setup
   ```

   _This script handles PostgreSQL/Redis via Docker, installs dependencies, pushes Drizzle schemas, and seeds a deterministic test household._

3. **Local Dev Server (Hot Reloading):**
   - **Server:** `cd server && npm start`
   - **Client:** `cd web && npm run dev`

## 3. Engineering Practices & Culture

### Tech Debt Sprints & DX

We explicitly prioritize Developer Experience (DX). Slow builds and flaky tests are considered Sev-2 bugs (Item 173). To ensure we don't accumulate cruft, we schedule dedicated **Tech Debt Sprints** (Item 171)—typically 20% of engineering bandwidth every month is reserved exclusively for refactoring and tooling improvements.

### Pair Programming

Complex architectural changes, especially around RBAC, billing, or the unified `recurring_costs` module, mandate **Pair Programming** (Item 169). This shares critical system knowledge and reduces our bus factor.

### Testing

Never merge a bug fix without a failing test that proves the fix works. Run tests frequently using our centralized tool:

```bash
/home/matt/household-project/scripts/ops/run_test_suite.sh
```

## 4. Key Documentation

- [Solution Architecture](ARCHITECTURE.md)
- [Database Schema](SCHEMA.md)
- [Development & Engineering Guide](DEVELOPMENT_GUIDE.md)
- [Security Architecture](SECURITY.md)
- [Deployment & Recovery](DEPLOYMENT.md)
- [Definition of Done](DEFINITION_OF_DONE.md)
