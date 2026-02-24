# ADR 0002: Transition to Domain-Driven Design (DDD) and Hexagonal Architecture

## Status

Proposed (Phase 6 Remediation)

## Context

As the Hearthstone codebase grows, the current "Express-as-Controller" pattern is becoming difficult to test and maintain. Business logic is often leaked into Express routes or Drizzle models, making it hard to reason about domain rules independently of the transport (HTTP) or storage (Postgres/SQLite) layers.

## Decision

We will adopt **Domain-Driven Design (DDD)** principles and **Hexagonal Architecture (Ports and Adapters)** to decouple business logic from infrastructure.

### 1. Domain Boundaries

Logic will be organized into high-level domains (e.g., `Finance`, `Shopping`, `Members`). Each domain will have its own directory in `server/domain/`.

### 2. Hexagonal Layers

Each domain will follow a strict layer separation:

- **Domain Core (Entities & Value Objects):** Pure business logic, no dependencies on Express, DB, or external libraries.
- **Application Services (Ports):** Orchestration logic, defining interfaces for external services (Repositories, Mailers).
- **Infrastructure (Adapters):** Implementation of interfaces, e.g., `SqliteShoppingRepository`, `PostgresUserRepository`.
- **Primary Adapters (Controllers):** Express routes that translate HTTP requests into calls to Application Services.

### 3. Dependency Rule

Dependencies must only point **inward** toward the Domain Core.

- Infrastructure depends on Domain Core.
- Primary Adapters (Express) depend on Application Services.
- Domain Core has ZERO dependencies.

## Consequences

- **Improved Testability:** Domain logic can be unit-tested in isolation without mocking Express or the Database.
- **Maintainability:** Easier to swap infrastructure components (e.g., migrating from SQLite to another storage engine) without touching business logic.
- **Initial Complexity:** Requires more boilerplate for simple CRUD operations, but pays off in long-term stability.
