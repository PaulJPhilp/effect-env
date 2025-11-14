import { Effect } from "effect"

import type { ValidationError } from "./errors.js"
import type { EnvRecord, RawEnv, ValidationResult } from "../shared/types.js"
import type { ValidationOptions } from "./types.js"

export interface Validation<
  Server extends EnvRecord = EnvRecord,
  Client extends EnvRecord = EnvRecord
> {
  readonly validate: (
    raw: RawEnv,
    options?: ValidationOptions<Server, Client>
  ) => Effect.Effect<ValidationResult<Server, Client>, ValidationError>
}
