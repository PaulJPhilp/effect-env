import { Data } from "effect"

export class EnvSourceError extends Data.TaggedError("EnvSourceError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
