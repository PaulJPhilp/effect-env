import { Effect } from "effect";
import { PrefixError } from "./errors.js";
const resolveMeta = (meta, overrides) => ({
    serverKeys: overrides?.serverKeys ?? meta.serverKeys,
    clientKeys: overrides?.clientKeys ?? meta.clientKeys,
    clientPrefix: overrides?.clientPrefix ?? meta.clientPrefix
});
const uniqueSorted = (keys) => Array.from(new Set(keys)).sort();
const serverViolations = (env, meta) => {
    const violations = new Set();
    for (const key of Object.keys(env)) {
        if (meta.clientKeys.includes(key)) {
            violations.add(key);
        }
        if (!meta.serverKeys.includes(key)) {
            violations.add(key);
        }
        if (meta.clientPrefix.length > 0 && key.startsWith(meta.clientPrefix)) {
            violations.add(key);
        }
    }
    return uniqueSorted(violations);
};
const clientViolations = (env, meta) => {
    const violations = new Set();
    for (const key of Object.keys(env)) {
        if (!meta.clientKeys.includes(key)) {
            violations.add(key);
        }
        if (meta.clientPrefix.length > 0 && !key.startsWith(meta.clientPrefix)) {
            violations.add(key);
        }
    }
    return uniqueSorted(violations);
};
const buildMessage = (mode, keys) => mode === "server"
    ? `Server mode forbids these keys: ${keys.join(", ")}`
    : `Client mode forbids these keys: ${keys.join(", ")}`;
const makePrefixEnforcement = (config) => ({
    enforce: (result, options) => {
        const meta = resolveMeta(config.meta, options.metaOverride);
        const mode = options.isServer ? "server" : "client";
        const env = options.isServer
            ? result.server
            : result.client;
        const violations = options.isServer
            ? serverViolations(env, meta)
            : clientViolations(env, meta);
        if (violations.length > 0) {
            return Effect.fail(new PrefixError({
                mode,
                keys: violations,
                message: buildMessage(mode, violations)
            }));
        }
        return Effect.succeed(result);
    }
});
export const PrefixEnforcementService = Effect.Service()("PrefixEnforcementService", {
    accessors: true,
    effect: (config) => Effect.succeed(makePrefixEnforcement(config))
});
