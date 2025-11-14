import { Effect } from "effect";
import type { EnvService } from "./api.js";
import type { EnvServiceConfig } from "./types.js";
import type { EnvRecord } from "../shared/types.js";
declare const EnvServiceProvider_base: Effect.Service.Class<EnvService<Readonly<Record<string, unknown>>, Readonly<Record<string, unknown>>>, "EnvService", {
    readonly accessors: true;
    readonly effect: <Server extends EnvRecord, Client extends EnvRecord>(config: EnvServiceConfig<Server, Client>) => Effect.Effect<EnvService<Server, Client>, never, never>;
}>;
export declare class EnvServiceProvider extends EnvServiceProvider_base {
}
export {};
