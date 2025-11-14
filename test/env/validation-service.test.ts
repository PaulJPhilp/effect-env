import { Config, Effect } from "effect"
import { describe, it, expect } from "vitest"

import {
  ValidationService,
  makeValidationLayer
} from "../../src/services/validation/service.js"
import { ValidationError } from "../../src/services/validation/errors.js"
import type {
  ValidationConfig,
  ValidationOptions
} from "../../src/services/validation/types.js"
import type {
  CompiledEnv,
  EnvMeta,
  EnvRecord,
  RawEnv,
  ValidationResult
} from "../../src/services/shared/types.js"

interface ServerEnv extends EnvRecord {
  readonly SERVER: string
}

interface ClientEnv extends EnvRecord {
  readonly PUBLIC: string
}

const meta: EnvMeta = {
  serverKeys: ["SERVER"],
  clientKeys: ["PUBLIC"],
  clientPrefix: "PUBLIC"
}

const compiledProgram: Config.Config<{
  readonly server: ServerEnv
  readonly client: ClientEnv
}> = Config.map(
  Config.all({
    SERVER: Config.string("SERVER"),
    PUBLIC: Config.string("PUBLIC")
  }),
  (env) => ({
    server: Object.freeze({ SERVER: env.SERVER }) as ServerEnv,
    client: Object.freeze({ PUBLIC: env.PUBLIC }) as ClientEnv
  })
)

const compiled: CompiledEnv<ServerEnv, ClientEnv> = {
  program: compiledProgram,
  meta
}

const config: ValidationConfig<ServerEnv, ClientEnv> = {
  compiled
}

describe("ValidationService", () => {
  const layer = makeValidationLayer(config)

  it("decodes raw env into frozen server and client records", async () => {
    const raw: RawEnv = Object.freeze({
      SERVER: "secret",
      PUBLIC: "value"
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(ValidationService.validate(raw), layer)
    )

    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      const result = exit.value as ValidationResult<ServerEnv, ClientEnv>
      expect(result.server.SERVER).toBe("secret")
      expect(result.client.PUBLIC).toBe("value")
      expect(Object.isFrozen(result.server)).toBe(true)
      expect(Object.isFrozen(result.client)).toBe(true)
    }
  })

  it("aggregates decode failures into ValidationError issues", async () => {
    const raw: RawEnv = Object.freeze({
      PUBLIC: "value"
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(ValidationService.validate(raw), layer)
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      const error = exit.cause.error as ValidationError
      expect(error.issues.length).toBeGreaterThan(0)
      const keys = error.issues.map((issue) => issue.key)
      expect(keys).toContain("SERVER")
    }
  })

  it("supports per-call compiled overrides", async () => {
    const overrideProgram: Config.Config<{
      readonly server: ServerEnv
      readonly client: ClientEnv
    }> = Config.map(
      Config.all({
        ALT: Config.string("ALT"),
        PUBLIC: Config.string("PUBLIC")
      }),
      (env) => ({
        server: Object.freeze({ SERVER: env.ALT }) as ServerEnv,
        client: Object.freeze({ PUBLIC: env.PUBLIC }) as ClientEnv
      })
    )

    const overrideCompiled: CompiledEnv<ServerEnv, ClientEnv> = {
      program: overrideProgram,
      meta
    }

    const options: ValidationOptions<ServerEnv, ClientEnv> = {
      compiled: overrideCompiled
    }

    const raw: RawEnv = Object.freeze({
      ALT: "alt-secret",
      PUBLIC: "value"
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(
        ValidationService.validate(raw, options),
        layer
      )
    )

    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      const result = exit.value as ValidationResult<ServerEnv, ClientEnv>
      expect(result.server.SERVER).toBe("alt-secret")
      expect(result.client.PUBLIC).toBe("value")
    }
  })
})
