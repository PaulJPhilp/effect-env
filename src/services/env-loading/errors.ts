import { Data } from "effect"

export class EnvLoadingError extends Data.TaggedError("EnvLoadingError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
