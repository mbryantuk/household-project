# ADR 0004: Standardizing on Cursor-Based Pagination

## Status

Proposed (Phase 6 Remediation)

## Context

Currently, most list endpoints in Hearthstone either return all records or use a hard-coded `.limit()`. As datasets (like audit logs) grow, this will lead to performance degradation and high memory usage on both the client and server.

Traditional "Offset/Limit" pagination (`OFFSET 1000 LIMIT 50`) performs poorly on large datasets because the database must still scan through the first 1000 records.

## Decision

We will standardize on **Cursor-Based Pagination** for all high-volume list endpoints.

### Implementation Details

- **Request Parameters:**
  - `cursor`: An opaque string (typically a base64 encoded unique value, like an ID or timestamp).
  - `limit`: The number of items to return (default 50, max 100).
- **Response Structure:**
  ```json
  {
    "data": [...],
    "meta": {
      "next_cursor": "...",
      "has_more": true
    }
  }
  ```
- **Ordering:** Cursors must be used with stable, indexed sort columns (e.g., `created_at` + `id`).

## Consequences

- **Pros:** Consistent O(1) performance regardless of page depth. Better for real-time feeds (no duplicate items if new records are inserted while paginating).
- **Cons:** Cannot "jump" to a specific page number. Implementation is slightly more complex than offset/limit.
