import { Effect, Layer } from "effect";
import { Schema as S } from "effect";
import { EnvService, makeEnv } from "./service";
import { EnvError } from "./errors.js";
import { PrefixEnforcementService } from "../services/prefix-enforcement/service.js";
/**
 * Parse environment source with schema, mapping parse errors to EnvError.
 */
const parseEnv = (schema, source, options) => Effect.gen(function* () {
    const parsed = yield* Effect.mapError(S.decodeUnknown(schema)(source), (parseError) => new EnvError(`Schema validation failed: ${parseError.message}` // TODO: Format better with key details
    ));
    const clientPrefix = options?.clientPrefix ?? "PUBLIC_";
    const { meta, validationResult } = partitionEnv(parsed, clientPrefix);
    yield* Effect.provide(Effect.mapError(enforcePrefixes(validationResult), (error) => new EnvError(`Prefix enforcement failed (${error.mode}): ${error.keys.join(", ")}`)), PrefixEnforcementService.Default({ meta }));
    return parsed;
});
const partitionEnv = (parsed, clientPrefix) => {
    const record = parsed;
    const server = {};
    const client = {};
    for (const [key, value] of Object.entries(record)) {
        if (clientPrefix && key.startsWith(clientPrefix)) {
            client[key] = value;
        }
        else {
            server[key] = value;
        }
    }
    const meta = {
        serverKeys: Object.keys(server),
        clientKeys: Object.keys(client),
        clientPrefix
    };
    const validationResult = {
        server: server,
        client: client
    };
    return { meta, validationResult };
};
const enforcePrefixes = (validationResult) => Effect.flatMap(PrefixEnforcementService.enforce(validationResult, { isServer: true }), () => PrefixEnforcementService.enforce(validationResult, { isServer: false }));
/**
 * Layer that parses process.env with the given schema.
 */
export const fromProcess = (schema, options) => Layer.effect(EnvService, Effect.gen(function* () {
    const parsed = yield* parseEnv(schema, process.env, options);
    return makeEnv(parsed, process.env);
}));
/**
 * Layer that loads .env file and parses with schema.
 */
export const fromDotenv = (schema, opts, options) => Layer.effect(EnvService, Effect.gen(function* () {
    // Import dotenv dynamically to avoid bundling if not used
    const dotenv = require("dotenv");
    const config = dotenv.config(opts);
    if (config.error) {
        return yield* Effect.fail(new EnvError(`Dotenv config error: ${config.error.message}`));
    }
    const parsed = yield* parseEnv(schema, process.env, options);
    return makeEnv(parsed, process.env);
}));
/**
 * Layer that parses a provided record with the schema (useful for tests).
 */
export const fromRecord = (schema, record, options) => Layer.effect(EnvService, Effect.gen(function* () {
    const parsed = yield* parseEnv(schema, record, options);
    return makeEnv(parsed, record);
}));
