import { Effect, Layer } from "effect"
import { Schema as S } from "effect"
import { EnvService, makeEnv } from "./service"
import { EnvError } from "./errors.js"
import { PrefixEnforcementService } from "../services/prefix-enforcement/service.js"
import { PrefixError } from "../services/prefix-enforcement/errors.js"
import type { EnvMeta, EnvRecord, ValidationResult } from "../services/shared/types.js"

/**
 * Parse environment source with schema, mapping parse errors to EnvError.
 */
const parseEnv = <E>(
  schema: S.Schema<E>,
  source: Record<string, string | undefined>,
  options?: LayerOptions
) =>
  Effect.gen(function* () {
    const parsed = yield* Effect.mapError(
      S.decodeUnknown(schema)(source),
      (parseError) =>
        new EnvError(
          `Schema validation failed: ${parseError.message}` // TODO: Format better with key details
        )
    )

    const clientPrefix = options?.clientPrefix ?? "PUBLIC_"
    const { meta, validationResult } = partitionEnv(parsed, clientPrefix)

    yield* Effect.provide(
      Effect.mapError(
        enforcePrefixes(validationResult),
        (error: PrefixError) =>
          new EnvError(
            `Prefix enforcement failed (${error.mode}): ${error.keys.join(", ")}`
          )
      ),
      PrefixEnforcementService.Default({ meta })
    )

    return parsed
  })

interface LayerOptions {
  readonly clientPrefix?: string
}

const partitionEnv = <E>(
  parsed: E,
  clientPrefix: string
): {
  readonly meta: EnvMeta
  readonly validationResult: ValidationResult<EnvRecord, EnvRecord>
} => {
  const record = parsed as Record<string, unknown>
  const server: Record<string, unknown> = {}
  const client: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    if (clientPrefix && key.startsWith(clientPrefix)) {
      client[key] = value
    } else {
      server[key] = value
    }
  }

  const meta: EnvMeta = {
    serverKeys: Object.keys(server),
    clientKeys: Object.keys(client),
    clientPrefix
  }

  const validationResult: ValidationResult<EnvRecord, EnvRecord> = {
    server: server as EnvRecord,
    client: client as EnvRecord
  }

  return { meta, validationResult }
}

const enforcePrefixes = (
  validationResult: ValidationResult<EnvRecord, EnvRecord>
) =>
  Effect.flatMap(
    PrefixEnforcementService.enforce(validationResult, { isServer: true }),
    () => PrefixEnforcementService.enforce(validationResult, { isServer: false })
  )

/**
 * Layer that parses process.env with the given schema.
 */
export const fromProcess = <E>(
  schema: S.Schema<E>,
  options?: LayerOptions
) =>
  Layer.effect(EnvService, Effect.gen(function* () {
    const parsed = yield* parseEnv(schema, process.env, options)
    return makeEnv(parsed, process.env)
  }))

/**
 * Layer that loads .env file and parses with schema.
 */
export const fromDotenv = <E>(
  schema: S.Schema<E>,
  opts?: { path?: string },
  options?: LayerOptions
) =>
  Layer.effect(EnvService, Effect.gen(function* () {
    // Import dotenv dynamically to avoid bundling if not used
    const dotenv = require("dotenv")
    const config = dotenv.config(opts)
    if (config.error) {
      return yield* Effect.fail(
        new EnvError(`Dotenv config error: ${config.error.message}`)
      )
    }
    const parsed = yield* parseEnv(schema, process.env, options)
    return makeEnv(parsed, process.env)
  }))

/**
 * Layer that parses a provided record with the schema (useful for tests).
 */
export const fromRecord = <E>(
  schema: S.Schema<E>,
  record: Record<string, string | undefined>,
  options?: LayerOptions
) =>
  Layer.effect(EnvService, Effect.gen(function* () {
    const parsed = yield* parseEnv(schema, record, options)
    return makeEnv(parsed, record)
  }))
