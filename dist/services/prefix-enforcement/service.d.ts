import { Effect } from "effect";
import type { PrefixEnforcement } from "./api.js";
import type { PrefixEnforcementConfig } from "./types.js";
export declare const PrefixEnforcementService: Effect.Service.Class<PrefixEnforcement, "PrefixEnforcementService", {
    readonly accessors: true;
    readonly effect: (config: PrefixEnforcementConfig) => Effect.Effect<PrefixEnforcement, never, never>;
}>;
