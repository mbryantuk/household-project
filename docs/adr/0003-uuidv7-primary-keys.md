# ADR 0003: Adoption of UUIDv7 for Primary Keys

## Status

Proposed (Phase 6 Remediation)

## Context

Currently, Hearthstone uses auto-incrementing integers for primary keys. While simple, integers have several drawbacks:

1. **Predictability:** IDs are easily guessable, which can lead to "Insecure Direct Object Reference" (IDOR) vulnerabilities if tenancy checks are missed.
2. **Merge Conflicts:** Synchronizing data between local tenant databases and a global registry (or offline-first sync) is difficult with overlapping integer IDs.
3. **Information Leakage:** Sequential IDs reveal the total volume of data (e.g., how many users or households exist).

Standard UUIDv4 is non-sequential, which leads to poor database index performance (fragmentation).

## Decision

We will migrate all primary keys to **UUIDv7**.

### Why UUIDv7?

- **Time-Ordered:** UUIDv7 includes a 48-bit timestamp, ensuring that IDs are naturally sequential. This maintains B-Tree index performance similar to auto-incrementing integers.
- **Uniqueness:** 128-bit space provides high collision resistance.
- **Cuid2 Alternative:** While `cuid2` is excellent for security, UUIDv7 is a proposed IETF standard and has better native support in many databases and tools.

### Implementation

- New tables will use `TEXT` (SQLite) or `UUID` (PostgreSQL) for primary keys.
- We will implement a lightweight `generateUuidV7()` helper in `server/utils/id.js`.
- Migrations will be handled on a per-domain basis during refactoring.

## Consequences

- **Storage Size:** UUIDs (16 bytes) take more space than integers (4-8 bytes).
- **Readability:** URLs will be longer and less human-readable.
- **Migration Effort:** Requires updating all foreign key relationships.
