## Description

<!-- Please include a clear and concise summary of the changes and the related issue. -->
<!-- Describe the rationale, context, and any specific goals for this pull request. -->

## Linked Issue

<!-- E.g. "Fixes #123" -->

Fixes #

## Type of Change

<!-- Check the appropriate box below by putting an "x" inside the brackets: `[x]` -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactor / Code Cleanup
- [ ] Documentation update

## Testing Performed

<!-- Describe the tests that you ran to verify your changes. -->

- [ ] Validated backend integration tests via `./scripts/ops/run_test_suite.sh --skip-frontend`
- [ ] Validated frontend smoke tests via `./scripts/ops/run_test_suite.sh --skip-backend`
- [ ] Checked for secrets via `npx lint-staged` and `.husky/pre-commit`
- [ ] Verified local builds without compile errors

## Checklist

- [ ] My code adheres to the project's stylistic conventions (MUI Joy tokens, Atomic wrappers).
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] I have documented any new endpoints or schema changes.
- [ ] My commit messages follow the Conventional Commits specification.
