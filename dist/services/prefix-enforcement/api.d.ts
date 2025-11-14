import { Effect } from "effect";
import type { PrefixError } from "./errors";
import type { PrefixEnforcementOptions } from "./types.js";
import type { EnvRecord, ValidationResult } from "../shared/types.js";
export interface PrefixEnforcement {
    readonly enforce: (result: ValidationResult<EnvRecord, EnvRecord>, options: PrefixEnforcementOptions) => Effect.Effect<ValidationResult<EnvRecord, EnvRecord>, PrefixError>;
}
