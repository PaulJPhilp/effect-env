import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { fromProcess, fromRecord } from "../../src/env/layers"
import { exampleSchema } from "../../src/env/schema"
import { EnvService } from "../../src/env/service"

describe("layers", () => {
  describe("fromRecord", () => {
    const record = {
      NODE_ENV: "development",
      PORT: "3000",
      API_KEY: "test-key",
    }

    const layer = fromRecord(exampleSchema, record)

    it("should provide typed env via get", async () => {
      const program = Effect.flatMap(EnvService, (env) => env.get("PORT"))
      const result = await Effect.runPromise(Effect.provide(program, layer))
      expect(result).toBe("3000")
    })

    it("should provide typed env via require", async () => {
      const program = Effect.flatMap(EnvService, (env) => env.require("API_KEY"))
      const result = await Effect.runPromise(Effect.provide(program, layer))
      expect(result).toBe("test-key")
    })


  })

  describe("fromProcess", () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        TEST_NODE_ENV: "production",
        TEST_PORT: "8080",
        TEST_API_KEY: "prod-key",
      }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    const testSchema = exampleSchema  // Reuse, but keys don't match; for test, assume matching
    // Note: In real usage, schema keys should match env vars

    it("should parse from process.env", async () => {
      // Temporarily set matching keys
      process.env.NODE_ENV = "test"
      process.env.PORT = "4000"
      process.env.API_KEY = "env-key"

      const layer = fromProcess(exampleSchema)
      const program = Effect.flatMap(EnvService, (env) => env.get("PORT"))
      const result = await Effect.runPromise(Effect.provide(program, layer))
      expect(result).toBe("4000")
    })
  })

  // fromDotenv test skipped for now (requires file system setup)
})
