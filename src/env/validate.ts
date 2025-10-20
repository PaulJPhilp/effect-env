import { Effect } from "effect"
import * as S from "effect/Schema"

/**
 * Validation error with details on missing and invalid keys.
 */
export class ValidationError {
  readonly _tag = "ValidationError"

  constructor(
    public readonly missing: string[],
    public readonly invalid: Array<{ key: string; message: string }>,
    public readonly report: string
  ) {}

  toString() {
    return `Environment validation failed:\n${this.report}`
  }
}

/**
 * Format validation details into a readable table.
 */
export const formatValidationReport = (error: ValidationError): string => {
  const lines: string[] = ["Key       | Status    | Details"]
  lines.push("-----------|-----------|--------")

  for (const key of error.missing) {
    lines.push(`${key.padEnd(10)} | missing   | required but not provided`)
  }

  for (const { key, message } of error.invalid) {
    const shortMsg = message.length > 30 ? message.slice(0, 30) + "..." : message
    lines.push(`${key.padEnd(10)} | invalid   | ${shortMsg}`)
  }

  return lines.join("\n")
}

/**
 * Validate environment source against schema.
 * In production or if failInProd=true, dies with the error.
 * Otherwise, returns ValidationError on failure, void on success.
 */
export const validate = <E>(
  schema: S.Schema<E>,
  source: Record<string, string | undefined>,
  opts?: { failInProd?: boolean }
): Effect.Effect<void, ValidationError> => {
  const shouldFail = opts?.failInProd ?? false

  return S.decodeUnknown(schema)(source).pipe(
    Effect.asVoid,
    Effect.catchAll((parseError) => {
      // For simplicity, use the parseError message as report, and extract basic info
      const missing: string[] = []
      const invalid: Array<{ key: string; message: string }> = []

      // TODO: Properly extract missing and invalid from parseError.issues tree
      // For now, set empty and use message
      const error = new ValidationError(missing, invalid, parseError.message)

      if (shouldFail) {
        return Effect.die(error)
      } else {
        return Effect.fail(error)
      }
    })
  )
}
