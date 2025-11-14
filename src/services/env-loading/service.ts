import { Effect } from "effect"

import type { EnvLoading, EnvLoadingConfig, EnvLoadingOptions } from "./api.js"
import { EnvLoadingError } from "./errors.js"
import type { EnvSource } from "../shared/types.js"
import {
  chooseSource,
  loadFromSource,
  processEnvSource
} from "./helpers.js"

const makeEnvLoading = (
  config: EnvLoadingConfig = {}
): Effect.Effect<EnvLoading> =>
  Effect.succeed({
    load: (options?: EnvLoadingOptions) =>
      loadFromSource(chooseSource(config, options))
  })

export class EnvLoadingService extends Effect.Service<EnvLoading>()(
  "EnvLoadingService",
  {
    accessors: true,
    effect: makeEnvLoading
  }
) {}

export const makeEnvLoadingLayer = (config: EnvLoadingConfig = {}) =>
	EnvLoadingService.Default(config)
