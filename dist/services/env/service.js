import { Effect } from "effect";
import { EnvLoadingService, makeEnvLoadingLayer } from "../env-loading/service.js";
import { ValidationService, makeValidationLayer } from "../validation/service.js";
import { PrefixEnforcementService } from "../prefix-enforcement/service.js";
const mergeMeta = (base, override) => ({
    serverKeys: override?.serverKeys ?? base.serverKeys,
    clientKeys: override?.clientKeys ?? base.clientKeys,
    clientPrefix: override?.clientPrefix ?? base.clientPrefix
});
const makeEnvService = (config) => Effect.succeed({
    load: (options) => Effect.gen(function* () {
        const raw = (yield* Effect.provide(EnvLoadingService.load(options?.loading), makeEnvLoadingLayer({ ...(config.loading ?? {}), ...(options?.loading ?? {}) })));
        const validation = (yield* Effect.provide(ValidationService.validate(raw, options?.validation), makeValidationLayer(options?.validation?.compiled
            ? { compiled: options.validation.compiled }
            : config.validation)));
        const baseMeta = config.metaOverride
            ? mergeMeta(config.validation.compiled.meta, config.metaOverride)
            : config.validation.compiled.meta;
        const meta = mergeMeta(baseMeta, options?.metaOverride);
        const isServer = options?.isServer ?? config.isServer ?? true;
        const enforced = yield* Effect.provide(PrefixEnforcementService.enforce(validation, {
            isServer,
            metaOverride: options?.metaOverride
        }), PrefixEnforcementService.Default(config.prefix ? { ...config.prefix, meta } : { meta }));
        if (isServer) {
            return {
                mode: "server",
                raw,
                validation: enforced,
                meta,
                env: enforced.server
            };
        }
        return {
            mode: "client",
            raw,
            validation: enforced,
            meta,
            env: enforced.client
        };
    })
});
export class EnvServiceProvider extends Effect.Service()("EnvService", {
    accessors: true,
    effect: (config) => makeEnvService(config)
}) {
}
