# Contributing to Hearthstone

First off, thank you for considering contributing to Hearthstone! It's people like you that make Hearthstone such a great tool for household management.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our Issue Tracker to see if someone else has already created a ticket. If not, go ahead and make one!

## 2. Setting up your environment

Please refer to the `README.md` for instructions on how to set up the development environment using Docker Compose and Node.js.

## 3. Architecture & Documentation

Before contributing, please read our core documentation to understand how the system is structured:

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Database Schema](docs/SCHEMA.md)

## 4. Making Changes

- **Create a branch:** Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name` or `git checkout -b fix/your-bug-fix`).
- **Commit your changes:** Follow the Conventional Commits specification.
- **Run tests:** Ensure all tests pass by running the central test suite: `./scripts/ops/run_test_suite.sh`.
- **Lint:** Run `npm run lint` in both the `web/` and `server/` directories.

### The Regression Test Mandate

If you are fixing a bug, your Pull Request **must** include a new test that explicitly replicates the failure before your code changes are applied. The test must fail on `main` and pass on your branch. This guarantees the bug can never silently regress.

## 5. Submitting a Pull Request

- Push your branch to your fork.
- Submit a Pull Request against the `main` branch of the Hearthstone repository.
- Provide a clear and detailed description of your changes, including any new tests you added.
- Wait for a maintainer to review your code.

### Logic-Focused Code Reviews

We rely heavily on automated linters (ESLint, Prettier) and static analysis tools. During code review, maintainers will **not** comment on stylistic choices or formatting. Reviews are strictly reserved for:

- Architectural alignment (Is this the right place for this logic?)
- Security and tenancy isolation (Does this leak data?)
- Business logic correctness (Does this actually solve the issue?)
