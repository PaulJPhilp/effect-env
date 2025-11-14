import { ConfigError, ConfigProvider, Effect } from "effect"

import type { Validation } from "./api.js"
import { ValidationError, ValidationIssue } from "./errors.js"
import type { ValidationConfig, ValidationOptions } from "./types.js"
import type {
  CompiledEnv,
  EnvRecord,
  RawEnv,
  ValidationResult
} from "../shared/types.js"

const ROOT_PATH = "<root>"

const toMap = (raw: RawEnv): Map<string, string> => {
  const entries: Array<[string, string]> = []
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) {
      entries.push([key, value])
    }
  }
  return new Map(entries)
}

const formatPath = (path: ReadonlyArray<string>): string =>
  path.length === 0 ? ROOT_PATH : path.join(".")

const collectIssues = (
  error: ConfigError.ConfigError
): ReadonlyArray<ValidationIssue> => {
  const issues: Array<ValidationIssue> = []
  const visit = (current: ConfigError.ConfigError): void => {
    if (ConfigError.isAnd(current)) {
      visit(current.left)
      visit(current.right)
      return
    }
    if (ConfigError.isOr(current)) {
      visit(current.left)
      visit(current.right)
      return
    }
    if (ConfigError.isMissingData(current) || ConfigError.isInvalidData(current)) {
      issues.push(
        new ValidationIssue({
          key: formatPath(current.path),
          message: current.message
        })
      )
      return
    }
    if (ConfigError.isSourceUnavailable(current) || ConfigError.isUnsupported(current)) {
      issues.push(
        new ValidationIssue({
          key: formatPath(current.path),
          message: current.message
        })
      )
      return
    }
  }
  visit(error)
  return issues
}

const chooseCompiled = <
  Server extends EnvRecord,
  Client extends EnvRecord
>(
  config: ValidationConfig<Server, Client>,
  options?: ValidationOptions<Server, Client>
): CompiledEnv<Server, Client> => options?.compiled ?? config.compiled

const decode = <Server extends EnvRecord, Client extends EnvRecord>(
  compiled: CompiledEnv<Server, Client>,
  raw: RawEnv
): Effect.Effect<ValidationResult<Server, Client>, ValidationError> => {
  const map = toMap(raw)
  const provider = ConfigProvider.fromMap(map, { pathDelim: "_" })
  return Effect.mapError(
    provider.load(compiled.program),
    (error) =>
      new ValidationError({
        issues: collectIssues(error)
      })
  )
}

const freezeResult = <Server extends EnvRecord, Client extends EnvRecord>(
  result: ValidationResult<Server, Client>
): ValidationResult<Server, Client> => ({
  server: Object.freeze({ ...result.server }) as Server,
  client: Object.freeze({ ...result.client }) as Client
})

const makeValidation = <
  Server extends EnvRecord,
  Client extends EnvRecord
>(
  config: ValidationConfig<Server, Client>
): Effect.Effect<Validation<Server, Client>> =>
  Effect.succeed({
    validate: (raw, options) =>
      Effect.map(
        decode(chooseCompiled(config, options), raw),
        freezeResult
      )
  })

export const ValidationService = Effect.Service<Validation>()(
  "ValidationService",
  {
    accessors: true,
    effect: (config: ValidationConfig<EnvRecord, EnvRecord>) =>
      Effect.map(
        makeValidation(config),
        (service) => service as Validation
      )
  }
)

export const makeValidationLayer = <
  Server extends EnvRecord = EnvRecord,
  Client extends EnvRecord = EnvRecord
>(
  config: ValidationConfig<Server, Client>
) =>
  ValidationService.Default(config as ValidationConfig<EnvRecord, EnvRecord>)
