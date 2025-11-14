import { Effect } from "effect"
import { describe, it, expect } from "vitest"

import { EnvServiceProvider } from "../../src/services/env/service.js"
import type {
  EnvServiceConfig,
  EnvServiceOptions,
  EnvServiceResult
} from "../../src/services/env/types.js"
import type {
  EnvMeta,
  EnvRecord,
  RawEnv,
  ValidationResult
} from "../../src/services/shared/types.js"
import type {
  ValidationConfig,
  ValidationOptions
} from "../../src/services/validation/types.js"
import type { EnvLoadingOptions } from "../../src/services/env-loading/api.js"
import type { PrefixEnforcementOptions } from "../../src/services/prefix-enforcement/types.js"

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

const compiled: ValidationConfig<ServerEnv, ClientEnv>["compiled"] = {
  program: {
    run: () => Effect.succeed({
      server: Object.freeze({ SERVER: "secret" }) as ServerEnv,
      client: Object.freeze({ PUBLIC: "value" }) as ClientEnv
    })
  } as any,
  meta
}

describe("EnvService", () => {
  const config: EnvServiceConfig<ServerEnv, ClientEnv> = {
    isServer: true,
    loading: {
      defaultSource: {
        name: "test",
        load: () => Effect.succeed(raw)
      }
    },
    validation: { compiled }
  }

  const raw: RawEnv = Object.freeze({
    SERVER: "secret",
    PUBLIC: "value"
  })

  const validationResult: ValidationResult<ServerEnv, ClientEnv> = {
    server: Object.freeze({ SERVER: "secret" }) as ServerEnv,
    client: Object.freeze({ PUBLIC: "value" }) as ClientEnv
  }

  it("returns server env when configured for server mode", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.provide(EnvServiceProvider.load(), EnvServiceProvider.Default(config))
    )

    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      const result = exit.value as EnvServiceResult<ServerEnv, ClientEnv>
      expect(result.mode).toBe("server")
      expect(result.env.SERVER).toBe("secret")
    }
  })
})
