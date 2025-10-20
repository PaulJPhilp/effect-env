# Changelog

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
