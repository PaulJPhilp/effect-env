import { Effect } from "effect"
import * as S from "effect/Schema"
import * as ParseResult from "effect/ParseResult"

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
      const missing: string[] = []
      const invalid: Array<{ key: string; message: string }> = []

      // Extract missing and invalid keys from parseError
      const errors = ParseResult.TreeFormatter.formatErrorSync(parseError)
      const errorLines = errors.split('\n')

      // Parse error details from the formatted error tree
      // Pattern: Lines with ["key"] indicate the field, subsequent lines contain error details
      let currentKey: string | null = null
      const errorDetails: string[] = []

      for (let i = 0; i < errorLines.length; i++) {
        const line = errorLines[i]

        // Check if this line contains a key reference like ["API_KEY"]
        const keyMatch = line.match(/\["([^"]+)"\]/)
        if (keyMatch) {
          currentKey = keyMatch[1]
          errorDetails.length = 0 // Reset details for new key
          continue
        }

        // Collect error details for the current key
        if (currentKey && line.trim()) {
          errorDetails.push(line.trim())
        }
      }

      // After parsing all lines, categorize the error
      if (currentKey) {
        const detailsText = errorDetails.join(' ')
        const isMissing = detailsText.includes('is missing') || detailsText.includes('is required')

        if (isMissing) {
          missing.push(currentKey)
        } else {
          // Extract a meaningful error message
          const meaningfulLine = errorDetails.find(d =>
            d.includes('Expected') || d.includes('actual') || d.includes('failure')
          ) || errorDetails[errorDetails.length - 1] || 'validation failed'

          invalid.push({
            key: currentKey,
            message: meaningfulLine
          })
        }
      }

      const report = formatValidationReport(
        new ValidationError(missing, invalid, errors)
      )
      const error = new ValidationError(missing, invalid, report)

      if (shouldFail) {
        return Effect.die(error)
      } else {
        return Effect.fail(error)
      }
    })
  )
}
