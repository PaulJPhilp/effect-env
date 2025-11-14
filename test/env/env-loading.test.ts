import { Effect } from "effect"
import { describe, it, expect, beforeEach, afterEach } from "vitest"

import {
  EnvLoadingService,
  makeEnvLoadingLayer
} from "../../src/services/env-loading/service.js"
import { EnvLoadingError } from "../../src/services/env-loading/errors.js"
import type { EnvLoadingConfig } from "../../src/services/env-loading/api.js"
import type {
  EnvSource,
  RawEnv
} from "../../src/services/shared/types.js"
import { EnvSourceError } from "../../src/services/shared/errors.js"

describe("EnvLoadingService", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      TEST_ONLY: "value"
    } as NodeJS.ProcessEnv
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("loads process.env by default and freezes result", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.provide(
        EnvLoadingService.load(),
        makeEnvLoadingLayer()
      )
    )
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      expect(exit.value.TEST_ONLY).toBe("value")
      expect(Object.isFrozen(exit.value)).toBe(true)
    }
  })

  it("prefers source provided in call options", async () => {
    let calls = 0
    const customEnv: RawEnv = Object.freeze({ CUSTOM: "ok" })
    const stubSource: EnvSource = {
      name: "stub",
      load: () => {
        calls += 1
        return Effect.succeed(customEnv)
      }
    }

    const exit = await Effect.runPromiseExit(
      Effect.provide(
        EnvLoadingService.load({ source: stubSource }),
        makeEnvLoadingLayer()
      )
    )
    expect(calls).toBe(1)
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      expect(exit.value).toBe(customEnv)
    }
  })

  it("respects default source configured in layer", async () => {
    const configEnv: RawEnv = Object.freeze({ CONFIG: "ok" })
    let calls = 0
    const configSource: EnvSource = {
      name: "config",
      load: () => {
        calls += 1
        return Effect.succeed(configEnv)
      }
    }

    const config: EnvLoadingConfig = {
      defaultSource: configSource
    }

    const exit = await Effect.runPromiseExit(
      Effect.provide(
        EnvLoadingService.load(),
        makeEnvLoadingLayer(config)
      )
    )

    expect(calls).toBe(1)
    expect(exit._tag).toBe("Success")
    if (exit._tag === "Success") {
      expect(exit.value).toBe(configEnv)
    }
  })

  it("wraps EnvSource failures in EnvLoadingError", async () => {
    const failingSource: EnvSource = {
      name: "failing",
      load: () =>
        Effect.fail(
          new EnvSourceError({ message: "source failed" })
        )
    }

    const exit = await Effect.runPromiseExit(
      Effect.provide(
        EnvLoadingService.load({ source: failingSource }),
        makeEnvLoadingLayer()
      )
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      expect(exit.cause.error).toBeInstanceOf(EnvLoadingError)
      const message = exit.cause.error.message
      expect(message).toContain("failing")
    }
  })

  it("converts thrown load calls into EnvLoadingError", async () => {
    const throwingSource: EnvSource = {
      name: "throw",
      load: () => {
        throw new Error("boom")
      }
    }

    const exit = await Effect.runPromiseExit(
      Effect.provide(
        EnvLoadingService.load({ source: throwingSource }),
        makeEnvLoadingLayer()
      )
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      expect(exit.cause.error).toBeInstanceOf(EnvLoadingError)
      const message = exit.cause.error.message
      expect(message).toContain("throw")
    }
  })
})
