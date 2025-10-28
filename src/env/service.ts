import { Context, Effect } from "effect"

// Type alias for Effect to avoid namespace issues
type EffectType<A, E = never, R = never> = Effect.Effect<A, E, R>

/**
 * Generic environment service interface, typed by the schema E.
 */
export interface Env<E> {
  /**
   * Get a required environment variable by key.
   */
  get<K extends keyof E>(key: K): EffectType<E[K], EnvError>

  /**
   * Require a variable (same as get, but semantically for required).
   */
  require<K extends keyof E>(key: K): EffectType<E[K], MissingVarError>

  /**
   * Get a number from environment string.
   */
  getNumber(key: string): EffectType<number, EnvError>

  /**
   * Get a boolean from environment string.
   */
  getBoolean(key: string): EffectType<boolean, EnvError>

  /**
   * Parse JSON from environment string.
   */
  getJson<T>(key: string): EffectType<T, EnvError>

  /**
   * Get all environment variables as raw strings.
   */
  all(): EffectType<Record<string, string>, never>

  /**
   * Override a key for testing (rejects in production).
   */
  withOverride<K extends string, A, E2, R>(
    key: K,
    value: string
  ): (fa: EffectType<A, E2, R>) => EffectType<A, EnvError | E2, R>
}

/**
 * Error types for environment operations.
 */
export class EnvError extends Error {
  readonly _tag = "EnvError"
  constructor(message: string) {
    super(message)
  }
}

export class MissingVarError extends Error {
  readonly _tag = "MissingVarError"
  constructor(key: string) {
    super(`Missing required environment variable: ${key}`)
  }
}

/**
 * Context tag for the Env service.
 */
export const EnvTag = Context.GenericTag<Env<any>>("effect-env/Env")

/**
 * Factory to create an Env service instance from parsed config and raw env record.
 */
export const makeEnv = <E>(
  parsed: E,
  raw: Record<string, string | undefined>
): Env<E> => ({
  get: <K extends keyof E>(key: K) => {
    // get() returns the value as-is, allowing undefined for optional fields
    return Effect.succeed(parsed[key])
  },

  require: <K extends keyof E>(key: K) => {
    // require() fails if the value is undefined or null
    const value = parsed[key]
    if (value === undefined || value === null) {
      return Effect.fail(new MissingVarError(String(key)))
    }
    return Effect.succeed(value)
  },

  getNumber: (key: string) => {
    const value = raw[key]
    if (value === undefined)
      return Effect.fail(new EnvError(`Environment variable ${key} not found`))
    const trimmed = value.trim()
    const num = Number(trimmed)
    if (isNaN(num) || !isFinite(num))
      return Effect.fail(new EnvError(`Invalid number for ${key}: ${trimmed.slice(0, 60)}${trimmed.length > 60 ? '...' : ''}`))
    return Effect.succeed(num)
  },

  getBoolean: (key: string) => {
    const value = raw[key]
    if (value === undefined)
      return Effect.fail(new EnvError(`Environment variable ${key} not found`))
    const val = value.toLowerCase().trim()
    if (["true", "1", "yes", "on"].includes(val)) return Effect.succeed(true)
    if (["false", "0", "no", "off"].includes(val)) return Effect.succeed(false)
    return Effect.fail(new EnvError(`Expected boolean (true|false|1|0|yes|no|on|off), got '${val}' for ${key}`))
  },

  getJson: <T>(key: string): EffectType<T, EnvError> => {
    const value = raw[key]
    if (value === undefined)
      return Effect.fail(new EnvError(`Environment variable ${key} not found`))
    try {
      return Effect.succeed(JSON.parse(value) as T)
    } catch (e) {
      const snippet = value.length > 60 ? value.slice(0, 60) + "..." : value
      return Effect.fail(new EnvError(`Invalid JSON for ${key}: ${snippet}`))
    }
  },

  all: () =>
    Effect.succeed(
      Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined)
      ) as Record<string, string>
    ),

  withOverride: <K extends string, A, E2, R>(
    key: K,
    value: string
  ) => (fa: EffectType<A, E2, R>): EffectType<A, EnvError | E2, R> => {
    if (process.env.NODE_ENV === "production") {
      return Effect.fail(new EnvError("withOverride is not allowed in production"))
    }
    const newRaw = { ...raw, [key]: value }
    const newEnv = makeEnv(parsed, newRaw)
    // withOverride returns a function that takes Effect<A> and returns Effect<A> with overridden env.
    // Use Effect.provideService to inject the new Env service.
    return Effect.provideService(fa, EnvTag, newEnv)
  },
})
