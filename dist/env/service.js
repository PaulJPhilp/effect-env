import { Effect } from "effect";
import { EnvError, MissingVarError } from "./errors.js";
export const makeEnv = (parsed, raw) => ({
    get: (key) => Effect.succeed(parsed[key]),
    require: (key) => {
        const value = parsed[key];
        if (value === undefined || value === null) {
            return Effect.fail(new MissingVarError(String(key)));
        }
        return Effect.succeed(value);
    },
    getNumber: (key) => {
        const value = raw[key];
        if (value === undefined) {
            return Effect.fail(new EnvError(`Environment variable ${key} not found`));
        }
        const trimmed = value.trim();
        const num = Number(trimmed);
        if (Number.isNaN(num) || !Number.isFinite(num)) {
            const snippet = trimmed.slice(0, 60);
            return Effect.fail(new EnvError(`Invalid number for ${key}: ${snippet}${trimmed.length > 60 ? "..." : ""}`));
        }
        return Effect.succeed(num);
    },
    getBoolean: (key) => {
        const value = raw[key];
        if (value === undefined) {
            return Effect.fail(new EnvError(`Environment variable ${key} not found`));
        }
        const normalized = value.toLowerCase().trim();
        if (["true", "1", "yes", "on"].includes(normalized)) {
            return Effect.succeed(true);
        }
        if (["false", "0", "no", "off"].includes(normalized)) {
            return Effect.succeed(false);
        }
        return Effect.fail(new EnvError(`Expected boolean (true|false|1|0|yes|no|on|off), got '${normalized}' for ${key}`));
    },
    getJson: (key) => {
        const value = raw[key];
        if (value === undefined) {
            return Effect.fail(new EnvError(`Environment variable ${key} not found`));
        }
        try {
            return Effect.succeed(JSON.parse(value));
        }
        catch {
            const snippet = value.length > 60 ? value.slice(0, 60) + "..." : value;
            return Effect.fail(new EnvError(`Invalid JSON for ${key}: ${snippet}`));
        }
    },
    all: () => Effect.succeed(Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined))),
    withOverride: (key, value) => (fa) => {
        if (process.env.NODE_ENV === "production") {
            return Effect.fail(new EnvError("withOverride is not allowed in production"));
        }
        const newRaw = { ...raw, [key]: value };
        const nextEnv = makeEnv(parsed, newRaw);
        return Effect.provideService(fa, EnvService, nextEnv);
    }
});
const makeEnvEffect = (config) => Effect.succeed(makeEnv(config.parsed, config.raw));
export class EnvService extends Effect.Service()("EnvService", {
    accessors: true,
    effect: (config) => Effect.map(makeEnvEffect(config), (env) => env)
}) {
}
