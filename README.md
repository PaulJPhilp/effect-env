# effect-env — typed, testable, policy-aware env for Effect apps

[![npm version](https://img.shields.io/npm/v/effect-env.svg)](https://www.npmjs.com/package/effect-env)
[![GitHub](https://img.shields.io/github/stars/PaulJPhilp/effect-env?style=social)](https://github.com/PaulJPhilp/effect-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript library for managing environment variables with type safety, schema validation, and security features using Effect.

## Installation

```bash
npm install effect-env
# or
bun add effect-env
```

### Alpha release (t3-env compatibility)

The `0.3.0-alpha` release is published under the `alpha` dist-tag and is
intended for experimentation only.

Install the alpha build:

```bash
npm install effect-env@alpha
```

APIs and behavior may change before a stable `0.3.x` release. Please report
issues or feedback on the GitHub repo.

## Quickstart

1. **Define your schema** with `@effect/schema`:

```typescript
import { Schema as S } from "effect"
import { makeEnvSchema } from "effect-env"

const envSchema = makeEnvSchema(
  S.Struct({
    NODE_ENV: S.Literal("development", "production", "test"),
    PORT: S.NumberFromString,
    API_KEY: S.String,
    DEBUG: S.Optional(S.BooleanFromString).withDefault(false),
  })
)

type AppEnv = S.Schema.Type<typeof envSchema>
```

2. **Provide the Env layer** in your app:

```typescript
import { Effect } from "effect"
import { EnvService, fromProcess, fromDotenv } from "effect-env"

// For production
const envLayer = fromProcess(envSchema)

// For development with .env
const envLayer = fromDotenv(envSchema, { path: ".env.local" })

// Run your app
const program = Effect.gen(function* () {
  const env = yield* EnvService
  const port = yield* env.get("PORT")
  // port is typed as number
})

Effect.runPromise(Effect.provide(program, envLayer))
```

3. **Use typed env methods**:

```typescript
const program = Effect.gen(function* () {
  const env = yield* EnvService

  // Typed schema values
  const nodeEnv = yield* env.get("NODE_ENV") // "development" | "production" | "test"
  const port = yield* env.require("PORT") // number
  const debug = yield* env.get("DEBUG") // boolean | undefined

  // Raw string helpers
  const timeout = yield* env.getNumber("TIMEOUT") // number
  const verbose = yield* env.getBoolean("VERBOSE") // boolean
  const config = yield* env.getJson<{ host: string }>("CONFIG") // { host: string }

  // All raw strings
  const all = yield* env.all() // Record<string, string>
})
```

### Example: t3-env-style usage (alpha)

With the `0.3.0-alpha` release you can model a simple t3-env-style setup with
defaults for optional values:

```typescript
import { Effect, Schema as S } from "effect"
import { EnvService, fromProcess, makeEnvSchema } from "effect-env"

const envSchema = makeEnvSchema(
  S.Struct({
    NODE_ENV: S.Literal("development", "production", "test"),
    LOG_LEVEL: S.optionalWith(S.String, { default: () => "info" })
  })
)

const envLayer = fromProcess(envSchema)

const program = Effect.gen(function* () {
  const env = yield* EnvService

  const nodeEnv = yield* env.require("NODE_ENV")
  const logLevel = yield* env.require("LOG_LEVEL")

  console.log({ nodeEnv, logLevel })
})

Effect.runPromise(Effect.provide(program, envLayer))
```

## Validation

Validate environment at startup for clear error reporting:

```typescript
import { validate } from "effect-env"

// In dev/test: prints friendly table and continues
// In production: fails fast with exit code
await Effect.runPromise(validate(envSchema, process.env))
```

Sample validation report:
```
Key          | Status       | Details
-------------|--------------|--------
API_KEY      | missing      | required but not provided
PORT         | invalid      | Expected number, actual "abc"
DEBUG        | ok           |
```

## Redaction

Safely log environment variables without exposing secrets:

```typescript
import { redact } from "effect-env"

const safeEnv = redact(process.env)
// { NODE_ENV: "development", API_KEY: "***", DB_PASSWORD: "***" }

// Custom matchers
const safeEnv = redact(process.env, {
  extra: ["SESSION_ID", /^CUSTOM_/]
})
```

Redacts keys containing (case-insensitive): `key`, `token`, `secret`, `password`, `pwd`, `private`, `bearer`, `api`, `auth`.

## Testing

Use `fromRecord` for isolated tests:

```typescript
import { EnvService, fromRecord } from "effect-env"

const testEnv = fromRecord(envSchema, {
  NODE_ENV: "test",
  PORT: "3000",
  API_KEY: "test-key",
})

const program = Effect.gen(function* () {
  const env = yield* EnvService
  return yield* env.get("PORT") // 3000
})

await Effect.runPromise(Effect.provide(program, testEnv))
```

Override keys in dev/test:

```typescript
const program = Effect.gen(function* () {
  const env = yield* EnvService
  return yield* env.withOverride("PORT", "8080")(env.get("PORT")) // 8080
})
// Production: throws "withOverride is not allowed in production"
```

## API Reference

### Env Service
- `get<K>(key: K): Effect<AppEnv[K], EnvError>`
- `require<K>(key: K): Effect<AppEnv[K], MissingVarError>`
- `getNumber(key: string): Effect<number, EnvError>`
- `getBoolean(key: string): Effect<boolean, EnvError>`
- `getJson<T>(key: string): Effect<T, EnvError>`
- `all(): Effect<Record<string, string>>`
- `withOverride(key: string, value: string)(fa: Effect<A>): Effect<A>` (dev/test only)

### Layers
- `fromProcess<E>(schema: S.Schema<E>): Layer<Env<E>>`
- `fromDotenv<E>(schema: S.Schema<E>, opts?: { path?: string }): Layer<Env<E>>`
- `fromRecord<E>(schema: S.Schema<E>, record: Record<string, string | undefined>): Layer<Env<E>>`

### Other
- `validate<E>(schema: S.Schema<E>, source: Record<string, string | undefined>, opts?): Effect<void, ValidationError>`
- `redact(record: Record<string, string | undefined>, opts?): Record<string, string | undefined>`
- `makeEnvSchema<A>(def: S.Schema<A>): S.Schema<A>`

## Notes

- **Security**: Never log raw env vars. Use `redact()` for safe logging.
- **Defaults**: Optional fields with `.withDefault()` are applied during schema parsing.
- **Errors**: All methods provide clear messages with key names and value snippets for debugging.
- **Production**: Validation fails fast; overrides are disabled.
- **Known limitations**: `withOverride` is a dev/test helper; scoped override semantics may change in v0.1.x.

## Contributing

PRs welcome! Run `npm test` and `npm run typecheck` before submitting.

## License

MIT
