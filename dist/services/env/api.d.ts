import { Effect } from "effect";
import type { EnvRecord } from "../shared/types.js";
import type { EnvServiceOptions, EnvServiceResult } from "./types.js";
import type { EnvServiceError } from "./errors.js";
export interface EnvService<Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord> {
    readonly load: (options?: EnvServiceOptions<Server, Client>) => Effect.Effect<EnvServiceResult<Server, Client>, EnvServiceError>;
}
