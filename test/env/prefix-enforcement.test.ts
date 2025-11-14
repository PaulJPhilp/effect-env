import { Effect } from "effect"
import { describe, it, expect } from "vitest"

import { PrefixEnforcementService } from "../../src/services/prefix-enforcement/service.js"
import { PrefixError } from "../../src/services/prefix-enforcement/errors.js"
import type {
  PrefixEnforcementConfig,
  PrefixEnforcementOptions
} from "../../src/services/prefix-enforcement/types.js"
import type { PrefixEnforcement } from "../../src/services/prefix-enforcement/api.js"
import type {
  EnvMeta,
  EnvRecord,
  ValidationResult
} from "../../src/services/shared/types.js"

const meta: EnvMeta = {
  serverKeys: ["SERVER_ONLY"],
  clientKeys: ["PUBLIC_CLIENT"],
  clientPrefix: "PUBLIC_"
}

const config: PrefixEnforcementConfig = { meta }

const result: ValidationResult<EnvRecord, EnvRecord> = {
  server: {
    SERVER_ONLY: "secret"
  },
  client: {
    PUBLIC_CLIENT: "value"
  }
}

const runWithLayer = <A, E>(
  effect: Effect.Effect<A, E, PrefixEnforcement>
): Effect.Effect<A, E> =>
  Effect.provide(
    effect,
    PrefixEnforcementService.Default(config)
  )

const run = async <A, E>(
  effect: Effect.Effect<A, E, PrefixEnforcement>
) => Effect.runPromiseExit(runWithLayer(effect))

const expectFailureWithKeys = async (
  effect: Effect.Effect<unknown, PrefixError, PrefixEnforcement>,
  keys: ReadonlyArray<string>,
  mode: "server" | "client"
) => {
  const exit = await run(effect)
  expect(exit._tag).toBe("Failure")
  if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
    const error = exit.cause.error as PrefixError
    expect(error.mode).toBe(mode)
    expect(error.keys).toEqual(keys)
  }
}

describe("PrefixEnforcementService", () => {
  it("allows server env with only server keys", async () => {
    const exit = await run(
      PrefixEnforcementService.enforce(result, { isServer: true })
    )
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      expect(exit.value).toEqual(result)
    }
  })

  it("fails when server env includes client-prefixed key", async () => {
    const violation: ValidationResult<EnvRecord, EnvRecord> = {
      ...result,
      server: {
        ...result.server,
        PUBLIC_CLIENT: "leak"
      }
    }

    await expectFailureWithKeys(
      PrefixEnforcementService.enforce(violation, { isServer: true }),
      ["PUBLIC_CLIENT"],
      "server"
    )
  })

  it("allows client env with only client keys", async () => {
    const exit = await run(
      PrefixEnforcementService.enforce(result, { isServer: false })
    )
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      expect(exit.value).toEqual(result)
    }
  })

  it("fails when client env includes server-only key", async () => {
    const violation: ValidationResult<EnvRecord, EnvRecord> = {
      ...result,
      client: {
        ...result.client,
        SERVER_ONLY: "leak"
      }
    }

    await expectFailureWithKeys(
      PrefixEnforcementService.enforce(violation, { isServer: false }),
      ["SERVER_ONLY"],
      "client"
    )
  })

  it("allows empty environments", async () => {
    const empty: ValidationResult<EnvRecord, EnvRecord> = {
      server: {},
      client: {}
    }

    const exit = await run(
      PrefixEnforcementService.enforce(empty, { isServer: true })
    )
    expect(exit._tag).toBe("Success")
    const exitClient = await run(
      PrefixEnforcementService.enforce(empty, { isServer: false })
    )
    expect(exitClient._tag).toBe("Success")
  })

  it("respects meta overrides per invocation", async () => {
    const metaOverride: PrefixEnforcementOptions["metaOverride"] = {
      clientPrefix: "CUSTOM_",
      clientKeys: ["CUSTOM_PUBLIC"],
      serverKeys: ["SERVER_ONLY", "CUSTOM_SERVER"]
    }

    const custom: ValidationResult<EnvRecord, EnvRecord> = {
      server: {
        SERVER_ONLY: "ok",
        CUSTOM_PUBLIC: "exposed"
      },
      client: {
        CUSTOM_PUBLIC: "ok",
        CUSTOM_SERVER: "mismatch"
      }
    }

    await expectFailureWithKeys(
      PrefixEnforcementService.enforce(custom, {
        isServer: true,
        metaOverride
      }),
      ["CUSTOM_PUBLIC"],
      "server"
    )

    const exit = await run(
      PrefixEnforcementService.enforce(custom, {
        isServer: false,
        metaOverride
      })
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      const error = exit.cause.error as PrefixError
      expect(error.mode).toBe("client")
      expect(error.keys).toEqual(["CUSTOM_SERVER"])
    }
  })
})
