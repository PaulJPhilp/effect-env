import { Effect } from "effect"

import type { EnvService } from "./api.js"
import type {
  EnvServiceConfig,
  EnvServiceOptions,
  EnvServiceResult
} from "./types.js"
import {
  EnvLoadingService,
  makeEnvLoadingLayer
} from "../env-loading/service.js"
import {
  ValidationService,
  makeValidationLayer
} from "../validation/service.js"
import { PrefixEnforcementService } from "../prefix-enforcement/service.js"
import type {
  EnvMeta,
  EnvRecord,
  RawEnv,
  ValidationResult
} from "../shared/types.js"

const mergeMeta = (base: EnvMeta, override?: Partial<EnvMeta>): EnvMeta => ({
  serverKeys: override?.serverKeys ?? base.serverKeys,
  clientKeys: override?.clientKeys ?? base.clientKeys,
  clientPrefix: override?.clientPrefix ?? base.clientPrefix
})

const makeEnvService = <
  Server extends EnvRecord,
  Client extends EnvRecord
>(
  config: EnvServiceConfig<Server, Client>
): Effect.Effect<EnvService<Server, Client>> =>
  Effect.succeed({
    load: (options?: EnvServiceOptions<Server, Client>) =>
      Effect.gen(function* () {
        const raw = (yield* Effect.provide(
          EnvLoadingService.load(options?.loading),
          makeEnvLoadingLayer({ ...(config.loading ?? {}), ...(options?.loading ?? {}) })
        )) as RawEnv

        const validation = (yield* Effect.provide(
          ValidationService.validate(raw, options?.validation),
          makeValidationLayer(
            options?.validation?.compiled
              ? { compiled: options.validation.compiled }
              : config.validation
          )
        )) as ValidationResult<Server, Client>

        const baseMeta = config.metaOverride
          ? mergeMeta(config.validation.compiled.meta, config.metaOverride)
          : config.validation.compiled.meta

        const meta = mergeMeta(baseMeta, options?.metaOverride)

        const isServer = options?.isServer ?? config.isServer ?? true

        const enforced = yield* Effect.provide(
          PrefixEnforcementService.enforce(validation, {
            isServer,
            metaOverride: options?.metaOverride
          }),
          PrefixEnforcementService.Default(
            config.prefix ? { ...config.prefix, meta } : { meta }
          )
        )

        if (isServer) {
          return {
            mode: "server" as const,
            raw,
            validation: enforced as ValidationResult<Server, Client>,
            meta,
            env: (enforced as ValidationResult<Server, Client>).server
          } satisfies EnvServiceResult<Server, Client>
        }

        return {
          mode: "client" as const,
          raw,
          validation: enforced as ValidationResult<Server, Client>,
          meta,
          env: (enforced as ValidationResult<Server, Client>).client
        } satisfies EnvServiceResult<Server, Client>
      })
  })

export class EnvServiceProvider extends Effect.Service<EnvService>()(
  "EnvService",
  {
    accessors: true,
    effect: <
      Server extends EnvRecord,
      Client extends EnvRecord
    >(
      config: EnvServiceConfig<Server, Client>
    ) => makeEnvService(config)
  }
) {}

