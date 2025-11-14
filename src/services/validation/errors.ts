import { Data } from "effect"

export class ValidationIssue extends Data.TaggedError("ValidationIssue")<{
  readonly key: string
  readonly message: string
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly issues: ReadonlyArray<ValidationIssue>
}> {}
