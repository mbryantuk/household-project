# ADR 0005: API-First Design and Automated Type Generation

## Status

Proposed (Phase 6 Remediation)

## Context

As the frontend and backend are developed in parallel within a monorepo, keeping API types in sync is a manual and error-prone process. We currently have `swagger.json` but frontend components often use manual Zod schemas or `any` types for API responses.

## Decision

We will adopt an **API-First Design** workflow using `openapi-typescript`.

### Workflow

1. **Source of Truth:** `server/swagger.json` is the definitive source of truth for the API.
2. **Generation:** A script `npm run generate:types` in the `server` package will transform the OpenAPI spec into TypeScript interfaces.
3. **Distribution:** The generated types will be stored in `packages/shared/src/api-types.ts` and exported via the `@hearth/shared` package.
4. **Consumption:** Both the backend (optionally) and the frontend (mandated) will use these generated types for request/response payloads.

### Rules

- Every new endpoint must be added to `swagger.json` before implementation is considered "Done".
- Manual type definitions for API responses are prohibited in the `web` package if an OpenAPI schema exists.

## Consequences

- **Type Safety:** Compile-time verification that the frontend is calling endpoints with correct parameters.
- **Auto-Completion:** Better IDE support when working with API data.
- **Sync Overhead:** Requires running the generator when the API changes (automated via pre-commit or CI).
