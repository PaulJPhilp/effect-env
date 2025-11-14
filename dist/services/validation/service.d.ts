import { Effect } from "effect";
import type { Validation } from "./api.js";
import type { ValidationConfig } from "./types.js";
import type { EnvRecord } from "../shared/types.js";
export declare const ValidationService: Effect.Service.Class<Validation<Readonly<Record<string, unknown>>, Readonly<Record<string, unknown>>>, "ValidationService", {
    readonly accessors: true;
    readonly effect: (config: ValidationConfig<EnvRecord, EnvRecord>) => Effect.Effect<Validation<Readonly<Record<string, unknown>>, Readonly<Record<string, unknown>>>, never, never>;
}>;
export declare const makeValidationLayer: <Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord>(config: ValidationConfig<Server, Client>) => import("effect/Layer").Layer<Validation<Readonly<Record<string, unknown>>, Readonly<Record<string, unknown>>>, never, never>;
