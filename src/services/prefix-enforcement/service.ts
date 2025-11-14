import { Effect } from "effect"

import type { PrefixEnforcement } from "./api.js"
import type { PrefixEnforcementConfig, PrefixEnforcementOptions } from "./types.js"
import { PrefixError } from "./errors.js"
import type { EnvMeta, EnvRecord, ValidationResult } from "../shared/types.js"

const resolveMeta = (meta: EnvMeta, overrides?: Partial<EnvMeta>): EnvMeta => ({
  serverKeys: overrides?.serverKeys ?? meta.serverKeys,
  clientKeys: overrides?.clientKeys ?? meta.clientKeys,
  clientPrefix: overrides?.clientPrefix ?? meta.clientPrefix
})

const uniqueSorted = (keys: Iterable<string>): ReadonlyArray<string> =>
  Array.from(new Set(keys)).sort()

const serverViolations = (
  env: EnvRecord,
  meta: EnvMeta
): ReadonlyArray<string> => {
  const violations = new Set<string>()

  for (const key of Object.keys(env)) {
    if (meta.clientKeys.includes(key)) {
      violations.add(key)
    }
    if (!meta.serverKeys.includes(key)) {
      violations.add(key)
    }
    if (meta.clientPrefix.length > 0 && key.startsWith(meta.clientPrefix)) {
      violations.add(key)
    }
  }

  return uniqueSorted(violations)
}

const clientViolations = (
  env: EnvRecord,
  meta: EnvMeta
): ReadonlyArray<string> => {
  const violations = new Set<string>()

  for (const key of Object.keys(env)) {
    if (!meta.clientKeys.includes(key)) {
      violations.add(key)
    }
    if (meta.clientPrefix.length > 0 && !key.startsWith(meta.clientPrefix)) {
      violations.add(key)
    }
  }

  return uniqueSorted(violations)
}

const buildMessage = (mode: "server" | "client", keys: ReadonlyArray<string>) =>
  mode === "server"
    ? `Server mode forbids these keys: ${keys.join(", ")}`
    : `Client mode forbids these keys: ${keys.join(", ")}`

const makePrefixEnforcement = (
  config: PrefixEnforcementConfig
): PrefixEnforcement => ({
  enforce: (result, options) => {
    const meta = resolveMeta(config.meta, options.metaOverride)
    const mode = options.isServer ? "server" : "client"
    const env = options.isServer
      ? (result.server as EnvRecord)
      : (result.client as EnvRecord)
    const violations = options.isServer
      ? serverViolations(env, meta)
      : clientViolations(env, meta)

    if (violations.length > 0) {
      return Effect.fail(
        new PrefixError({
          mode,
          keys: violations,
          message: buildMessage(mode, violations)
        })
      )
    }

    return Effect.succeed(result)
  }
})

export const PrefixEnforcementService = Effect.Service<PrefixEnforcement>()(
  "PrefixEnforcementService",
  {
    accessors: true,
    effect: (config: PrefixEnforcementConfig) =>
      Effect.succeed(makePrefixEnforcement(config))
  }
)
