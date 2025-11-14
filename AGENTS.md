# effect-env Agent Guidelines

## Commands
- **Build**: `npm run build` (runs TypeScript compilation)
- **Type check**: `npm run typecheck` (TypeScript --noEmit)
- **Test all**: `npm run test` (vitest run)
- **Test single**: `npx vitest run path/to/test/file.test.ts`
- **Clean**: `npm run clean` (removes dist/)

## Architecture
TypeScript library for typed environment management using Effect. Core modules:
- `schema.ts`: Schema creation and validation
- `service.ts`: Env service interface and implementation
- `layers.ts`: Effect layers for different env sources (process, dotenv, record)
- `validate.ts`: Startup validation with error reporting
- `redact.ts`: Safe logging by masking secrets

## Code Style
- **TypeScript**: Strict mode, ES2020 target, ESNext modules
- **Imports**: Group by effect/*, then internal modules, then relative
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Errors**: Custom Error subclasses with `_tag` for discrimination
- **Effect**: Use Effect.Effect<A, E, R> type alias as EffectType<A, E, R>
- **Tests**: vitest with Effect.runPromise, describe/it structure
- **Docs**: JSDoc comments for public APIs
