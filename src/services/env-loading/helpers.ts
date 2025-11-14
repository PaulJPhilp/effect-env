import { Effect } from "effect"

import type { EnvLoadingConfig, EnvLoadingOptions } from "./api.js"
import { EnvLoadingError } from "./errors.js"
import type { EnvSource, RawEnv } from "../shared/types.js"
import { EnvSourceError } from "../shared/errors.js"

export const freezeEnv = (
  entries: Iterable<readonly [string, string | undefined]>
): RawEnv =>
  Object.freeze(Object.fromEntries(entries)) as RawEnv

export const processEnvSource: EnvSource = {
  name: "process.env",
  load: () =>
    Effect.try({
      try: () => freezeEnv(Object.entries(process.env)),
      catch: (cause) =>
        new EnvSourceError({
          message: "Failed to read from process.env",
          cause
        })
    })
}

export const chooseSource = (
  config: EnvLoadingConfig,
  options?: EnvLoadingOptions
): EnvSource => options?.source ?? config.defaultSource ?? processEnvSource

export const loadFromSource = (source: EnvSource) =>
  Effect.flatMap(
    Effect.try({
      try: () => source.load(),
      catch: (cause) =>
        new EnvLoadingError({
          message: `Source ${source.name} threw while creating load effect`,
          cause
        })
    }),
    (effect) =>
      Effect.mapError(effect, (error) =>
        new EnvLoadingError({
          message: `Failed to load environment from ${source.name}`,
          cause: error
        })
      )
  )
