import { Effect } from "effect";
import { EnvLoadingError } from "./errors.js";
import { EnvSourceError } from "../shared/errors.js";
export const freezeEnv = (entries) => Object.freeze(Object.fromEntries(entries));
export const processEnvSource = {
    name: "process.env",
    load: () => Effect.try({
        try: () => freezeEnv(Object.entries(process.env)),
        catch: (cause) => new EnvSourceError({
            message: "Failed to read from process.env",
            cause
        })
    })
};
export const chooseSource = (config, options) => options?.source ?? config.defaultSource ?? processEnvSource;
export const loadFromSource = (source) => Effect.flatMap(Effect.try({
    try: () => source.load(),
    catch: (cause) => new EnvLoadingError({
        message: `Source ${source.name} threw while creating load effect`,
        cause
    })
}), (effect) => Effect.mapError(effect, (error) => new EnvLoadingError({
    message: `Failed to load environment from ${source.name}`,
    cause: error
})));
