# ADR 0006: Database-Level Multi-Tenant Isolation (Postgres RLS)

## Status

Proposed (Future Roadmap)

## Context

Hearthstone currently uses a hybrid model:

- **Global Data:** PostgreSQL
- **Tenant Data:** Physical SQLite file-per-household.

While SQLite provides excellent physical isolation, it complicates cross-household analytics, global backups, and horizontal scaling. Moving all data to a single PostgreSQL instance would improve scalability but increase the risk of cross-tenant data leaks if application middleware fails.

## Decision

We will eventually migrate all tenant data to **PostgreSQL** and enforce isolation using **Row-Level Security (RLS)**.

### Implementation Strategy

1. **Migration:** Move all tables from `TENANT_SCHEMA` (SQLite) to PostgreSQL.
2. **Schema Change:** Add `household_id` to every table that currently resides in SQLite.
3. **RLS Policy:**
   ```sql
   ALTER TABLE members ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation_policy ON members
     USING (household_id = current_setting('app.current_household_id')::integer);
   ```
4. **Middleware:** The `tenant.js` middleware will be responsible for executing `SET app.current_household_id = ...` at the start of every transaction.

### Security Guarantees

- Even if a developer forgets to add `WHERE household_id = ?` to a query, PostgreSQL will automatically filter the results based on the session variable.
- This provides a "defense-in-depth" layer that is independent of application-level bugs.

## Consequences

- **Performance:** Slight overhead for RLS checks.
- **Complexity:** Requires careful management of database connections and session state.
- **Consolidation:** Simplifies backups (one `pg_dump` instead of thousands of `.db` files).
