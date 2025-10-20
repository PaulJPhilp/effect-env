import { Effect, Layer } from "effect"
import { Schema as S } from "effect"
import { EnvTag, makeEnv, EnvError } from "./service"

/**
 * Parse environment source with schema, mapping parse errors to EnvError.
 */
const parseEnv = <E>(
  schema: S.Schema<E>,
  source: Record<string, string | undefined>
) =>
  Effect.mapError(
    S.decodeUnknown(schema)(source),
    (parseError) =>
      new EnvError(
        `Schema validation failed: ${parseError.message}` // TODO: Format better with key details
      )
  )

/**
 * Layer that parses process.env with the given schema.
 */
export const fromProcess = <E>(schema: S.Schema<E>) =>
  Layer.effect(EnvTag, Effect.gen(function* () {
    const parsed = yield* parseEnv(schema, process.env)
    return makeEnv(parsed, process.env)
  }))

/**
 * Layer that loads .env file and parses with schema.
 */
export const fromDotenv = <E>(
  schema: S.Schema<E>,
  opts?: { path?: string }
) =>
  Layer.effect(EnvTag, Effect.gen(function* () {
    // Import dotenv dynamically to avoid bundling if not used
    const dotenv = require("dotenv")
    const config = dotenv.config(opts)
    if (config.error) {
      return yield* Effect.fail(
        new EnvError(`Dotenv config error: ${config.error.message}`)
      )
    }
    const parsed = yield* parseEnv(schema, process.env)
    return makeEnv(parsed, process.env)
  }))

/**
 * Layer that parses a provided record with the schema (useful for tests).
 */
export const fromRecord = <E>(
  schema: S.Schema<E>,
  record: Record<string, string | undefined>
) =>
  Layer.effect(EnvTag, Effect.gen(function* () {
    const parsed = yield* parseEnv(schema, record)
    return makeEnv(parsed, record)
  }))
