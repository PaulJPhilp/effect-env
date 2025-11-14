import { Effect } from "effect";
import type { Env } from "./api.js";
import type { EnvServiceConfig } from "../types.js";
export declare const makeEnv: <E>(parsed: E, raw: Record<string, string | undefined>) => Env<E>;
declare const EnvService_base: Effect.Service.Class<Env<any>, "EnvService", {
    readonly accessors: true;
    readonly effect: <E>(config: EnvServiceConfig<E>) => Effect.Effect<Env<any>, never, never>;
}>;
export declare class EnvService extends EnvService_base {
}
export {};
