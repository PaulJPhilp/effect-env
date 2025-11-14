import { Config, Effect } from "effect"

import { EnvSourceError } from "./errors"

/**
 * Canonical shape for raw environment input keyed by variable name. Values are
 * left as provided (string or undefined) so downstream services can decide how
 * to decode or default them.
 */
export type RawEnv = Readonly<Record<string, string | undefined>>

/**
 * Abstraction for retrieving raw environment data. Allows swapping sources
 * (process.env, import.meta.env, custom providers) without coupling callers to
 * a particular platform.
 */
export interface EnvSource {
  readonly name: string
  readonly load: () => Effect.Effect<RawEnv, EnvSourceError>
}

/**
 * Metadata produced during schema compilation describing available keys and the
 * prefix reserved for client-safe variables. Used for DX feedback and adapters.
 */
export interface EnvMeta {
  readonly serverKeys: ReadonlyArray<string>
  readonly clientKeys: ReadonlyArray<string>
  readonly clientPrefix: string
}

/**
 * Result of compiling the user-provided schema: an executable Config program
 * and derived metadata used throughout validation and enforcement.
 */
export type EnvRecord = Readonly<Record<string, unknown>>

export interface CompiledEnv<
  Server extends EnvRecord,
  Client extends EnvRecord
> {
  readonly program: Config.Config<{
    readonly server: Server
    readonly client: Client
  }>
  readonly meta: EnvMeta
}

/**
 * Successful validation output distinguishing server and client environments in
 * strict mode so downstream services can expose the appropriate subset.
 */
export interface ValidationResult<
  Server extends EnvRecord,
  Client extends EnvRecord
> {
  readonly server: Server
  readonly client: Client
}
