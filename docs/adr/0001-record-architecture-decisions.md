# 1. Record architecture decisions

Date: 2026-02-24

## Status

Accepted

## Context

We need to record the architectural decisions made on this project. Future contributors and reviewers need context as to why certain architectural, technological, and foundational choices were made (e.g. Drizzle over Prisma, Node.js + Express over Next.js API routes). If we do not document these decisions, the reasoning will be lost, leading to repeated debates and "Chesterton's Fence" scenarios where developers might undo critical architecture without understanding why it was there.

## Decision

We will use Architecture Decision Records (ADRs) to document significant architectural decisions.

We will store these records in the `docs/adr` directory. ADRs will be written in Markdown and follow a standard template:

- **Title**: A short noun phrase (e.g., "1. Record architecture decisions").
- **Date**: YYYY-MM-DD
- **Status**: Proposed, Accepted, Rejected, Deprecated, Superseded.
- **Context**: What is the issue we're seeing that motivates this decision or change?
- **Decision**: What is the change that we're proposing and/or doing?
- **Consequences**: What becomes easier or more difficult because of this change?

## Consequences

- **Easier:** New engineers onboarding onto the project will have a historical record of why the system works the way it does. We will avoid litigating the same architectural choices multiple times.
- **Difficult:** Engineers must remember to write ADRs when making significant changes. This adds a small administrative overhead to feature/infrastructure PRs.
