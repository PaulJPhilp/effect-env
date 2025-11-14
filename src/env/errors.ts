export class EnvError extends Error {
  readonly _tag = "EnvError"
  constructor(message: string) {
    super(message)
  }
}

export class MissingVarError extends Error {
  readonly _tag = "MissingVarError"
  constructor(key: string) {
    super(`Missing required environment variable: ${key}`)
  }
}
