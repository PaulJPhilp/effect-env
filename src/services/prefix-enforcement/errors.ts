import { Data } from "effect"

export class PrefixError extends Data.TaggedError("PrefixError")<{
  readonly mode: "server" | "client"
  readonly keys: ReadonlyArray<string>
  readonly message: string
}> {}
