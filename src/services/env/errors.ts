import type { EnvLoadingError } from "../env-loading/errors.js"
import type { PrefixError } from "../prefix-enforcement/errors.js"
import type { ValidationError } from "../validation/errors.js"

export type EnvServiceError =
  | EnvLoadingError
  | ValidationError
  | PrefixError
