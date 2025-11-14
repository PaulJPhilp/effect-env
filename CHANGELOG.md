# Changelog

## v0.3.0 (2025-11-13)

- **Feature**: Improve env service tests around optional fields and default
  values (e.g. `LOG_LEVEL` with default `"info"`).
- **Chore**: Add `.gitignore` for Node/TypeScript projects to avoid committing
  `node_modules`, build artifacts, and editor files.
- **Chore**: Bump package version to `0.3.0`.

## v0.2.0 (2025-10-28)

Major improvements to type safety, build system, error reporting, and test coverage:

- **Breaking**: Convert to ESM module system for modern compatibility
- **Breaking**: Move vitest to devDependencies (was incorrectly in dependencies)
- **Breaking**: `get()` and `require()` now have distinct semantics - `require()` fails with `MissingVarError` for undefined/null values, while `get()` returns them as-is
- **Feature**: Improved validation error reporting with detailed missing/invalid field extraction from Effect Schema parse errors
- **Feature**: Comprehensive test coverage for `get()` vs `require()` behavior with optional fields
- **Fix**: Remove all `any` types from service interface for full type safety
- **Fix**: Correct `get()` and `require()` implementations (were previously identical)
- **Fix**: Update dotenv to latest version (^16.4.7)
- **Fix**: Correct repository URL and author metadata in package.json
- **Tests**: Added 26 new tests (48 → 61 total tests, 100% passing)
  - 13 new validation error extraction tests
  - 13 new get/require behavior tests with optional fields
- **Chore**: Remove unrelated archive folder
- **Docs**: Fix all import examples to use correct package name
- **Docs**: Update contributing instructions with correct npm scripts
- **Security**: Update vitest to v4.0.4 to address critical security vulnerabilities

## v0.1.1 (2024-10-20)

- Fix: Clean dist before build to exclude stale files
- Fix: Update package name from scoped to "effect-env"
- Docs: Add badges and update install commands
- Chore: Restrict published files to dist/, README.md, CHANGELOG.md

## v0.1.0 (2024-10-20)

Initial release of effect-env.

- **Schema-driven env management**: Type-safe environment variables with @effect/schema.
- **Multiple layers**: fromProcess, fromDotenv, fromRecord for different sources.
- **Validation**: Startup validation with pretty error reports; fails fast in production.
- **Redaction**: Secure logging helper for env vars, with default and custom secret matchers.
- **Convenience getters**: getNumber, getBoolean, getJson for raw string parsing.
- **Testing support**: withOverride for dev/test key overrides.
- **Effect integration**: Full Effect service pattern with Context/Layer.
