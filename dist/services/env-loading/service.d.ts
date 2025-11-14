import { Effect } from "effect";
import type { EnvLoading, EnvLoadingConfig } from "./api.js";
declare const EnvLoadingService_base: Effect.Service.Class<EnvLoading, "EnvLoadingService", {
    readonly accessors: true;
    readonly effect: (config?: EnvLoadingConfig) => Effect.Effect<EnvLoading>;
}>;
export declare class EnvLoadingService extends EnvLoadingService_base {
}
export declare const makeEnvLoadingLayer: (config?: EnvLoadingConfig) => import("effect/Layer").Layer<EnvLoading, never, never>;
export {};
