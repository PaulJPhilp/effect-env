import { Effect } from "effect";
import type { EnvLoadingConfig, EnvLoadingOptions } from "./api.js";
import { EnvLoadingError } from "./errors.js";
import type { EnvSource, RawEnv } from "../shared/types.js";
export declare const freezeEnv: (entries: Iterable<readonly [string, string | undefined]>) => RawEnv;
export declare const processEnvSource: EnvSource;
export declare const chooseSource: (config: EnvLoadingConfig, options?: EnvLoadingOptions) => EnvSource;
export declare const loadFromSource: (source: EnvSource) => Effect.Effect<Readonly<Record<string, string | undefined>>, EnvLoadingError, never>;
