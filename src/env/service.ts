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
  get<K extends keyof E>(key: K): any

  /**
   * Require a variable (same as get, but semantically for required).
   */
  require<K extends keyof E>(key: K): any

  /**
   * Get a number from environment string.
   */
  getNumber(key: string): any

  /**
   * Get a boolean from environment string.
   */
  getBoolean(key: string): any

  /**
   * Parse JSON from environment string.
   */
  getJson<T>(key: string): any

  /**
   * Get all environment variables as raw strings.
   */
  all(): any

  /**
   * Override a key for testing (rejects in production).
   */
  withOverride<K extends string, A>(key: K, value: string): any
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
  get: <K extends keyof E>(key: K) => Effect.succeed(parsed[key]),

  require: <K extends keyof E>(key: K) => Effect.succeed(parsed[key]),

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

  getJson: <T>(key: string): any => {
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

  withOverride: <K extends string, A>(key: K, value: string) => (fa: any) => {
    if (process.env.NODE_ENV === "production") {
      return Effect.fail(new EnvError("withOverride is not allowed in production"))
    }
    const newRaw = { ...raw, [key]: value }
    const newEnv = makeEnv(parsed, newRaw)
    // Since fa needs Env<E>, but withOverride returns Effect<A>, but actually, it's a higher-order, but wait.
    // The spec: withOverride<K extends string, A>(key: K, value: string)(fa: Effect<A>): Effect<A>
    // So, it's withOverride(key, value) returns a function that takes Effect<A> and returns Effect<A> with overridden env.
    // But in implementation, to provide the overridden Env, we need to run fa under a layer with newEnv.
    // But since it's not a layer, perhaps use Effect.provideService(EnvTag, newEnv)(fa)
    // Yes!
    return Effect.provideService(EnvTag, newEnv)(fa) as any
  },
})
