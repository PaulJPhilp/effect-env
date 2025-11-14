import { Effect } from "effect";
import type { EnvLoadingError } from "./errors.js";
import type { EnvSource, RawEnv } from "../shared/types.js";
export interface EnvLoadingOptions {
    readonly source?: EnvSource;
}
export interface EnvLoadingConfig {
    readonly defaultSource?: EnvSource;
}
export interface EnvLoading {
    readonly load: (options?: EnvLoadingOptions) => Effect.Effect<RawEnv, EnvLoadingError>;
}
