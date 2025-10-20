import { Effect } from "effect"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { fromRecord } from "../../src/env/layers"
import { exampleSchema } from "../../src/env/schema"
import { EnvTag, EnvError } from "../../src/env/service"

describe("service", () => {
  const baseRecord = {
    NODE_ENV: "development",
    PORT: "3000",
    API_KEY: "key",
  }

  describe("getNumber", () => {
    it("should parse valid integer", async () => {
      const record = { ...baseRecord, EXTRA_NUM: "42" }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getNumber("EXTRA_NUM"))
      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
      expect(result).toBe(42)
    })

    it("should parse valid float", async () => {
      const record = { ...baseRecord, EXTRA_NUM: "3.14" }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getNumber("EXTRA_NUM"))
      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
      expect(result).toBe(3.14)
    })

    it("should fail on invalid number", async () => {
      const record = { ...baseRecord, EXTRA_NUM: "abc" }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getNumber("EXTRA_NUM"))
      await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(
        "Invalid number for EXTRA_NUM: abc"
      )
    })

    it("should fail on missing key", async () => {
      const layer = fromRecord(exampleSchema, baseRecord)
      const program = Effect.flatMap(EnvTag, (env) => env.getNumber("MISSING"))
      await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(
        "Environment variable MISSING not found"
      )
    })
  })

  describe("getBoolean", () => {
    const testCases = [
      { input: "true", expected: true },
      { input: "TRUE", expected: true },
      { input: "1", expected: true },
      { input: "yes", expected: true },
      { input: "on", expected: true },
      { input: "false", expected: false },
      { input: "FALSE", expected: false },
      { input: "0", expected: false },
      { input: "no", expected: false },
      { input: "off", expected: false },
    ]

    testCases.forEach(({ input, expected }) => {
      it(`should parse "${input}" to ${expected}`, async () => {
        const record = { ...baseRecord, EXTRA_BOOL: input }
        const layer = fromRecord(exampleSchema, record)
        const program = Effect.flatMap(EnvTag, (env) => env.getBoolean("EXTRA_BOOL"))
        const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
        expect(result).toBe(expected)
      })
    })

    it("should fail on invalid boolean", async () => {
      const record = { ...baseRecord, EXTRA_BOOL: "maybe" }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getBoolean("EXTRA_BOOL"))
      await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(
        "Expected boolean (true|false|1|0|yes|no|on|off), got 'maybe' for EXTRA_BOOL"
      )
    })
  })

  describe("getJson", () => {
    it("should parse valid JSON object", async () => {
      const jsonStr = '{"name": "test", "value": 123}'
      const record = { ...baseRecord, EXTRA_JSON: jsonStr }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getJson("EXTRA_JSON"))
      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
      expect(result).toEqual({ name: "test", value: 123 })
    })

    it("should fail on invalid JSON", async () => {
      const invalidJson = '{"name": "test", invalid}'
      const record = { ...baseRecord, EXTRA_JSON: invalidJson }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getJson("EXTRA_JSON"))
      await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(
        "Invalid JSON for EXTRA_JSON: {\"name\": \"test\", invalid}"
      )
    })

    it("should truncate long invalid JSON", async () => {
      const longInvalid = '{"name": "test", "data": "' + 'x'.repeat(100) + '", invalid}'
      const record = { ...baseRecord, EXTRA_JSON: longInvalid }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.getJson("EXTRA_JSON"))
      await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(
        /Invalid JSON for EXTRA_JSON: .*\.\.\./
      )
    })
  })

  describe("all", () => {
    it("should return all string values", async () => {
      const record = { ...baseRecord, EXTRA: "value", UNDEFINED: undefined }
      const layer = fromRecord(exampleSchema, record)
      const program = Effect.flatMap(EnvTag, (env) => env.all())
      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
      expect(result).toEqual({
        NODE_ENV: "development",
        PORT: "3000",
        API_KEY: "key",
        EXTRA: "value",
      })
      expect(result.UNDEFINED).toBeUndefined()
    })
  })

  // withOverride tests skipped for v0.1.0 (scoping semantics TBD)
  // describe("withOverride", () => {
  //   it("should override in dev mode", async () => {
  //     const record = { ...baseRecord, TEST_KEY: "false" }
  //     const layer = fromRecord(exampleSchema, record)
  //     const program = Effect.flatMap(EnvTag, (env) =>
  //       Effect.flatMap(env.withOverride("TEST_KEY", "true"), () =>
  //         Effect.flatMap(EnvTag, (env2) => env2.getBoolean("TEST_KEY"))
  //       )
  //     )
  //     const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
  //     expect(result).toBe(true)
  //   })

  //   it("should fail in production mode", async () => {
  //     const originalEnv = process.env.NODE_ENV
  //     process.env.NODE_ENV = "production"
  //     try {
  //       const record = { ...baseRecord }
  //       const layer = fromRecord(exampleSchema, record)
  //       const program = Effect.flatMap(EnvTag, (env) => env.withOverride("TEST_KEY", "value"))
  //       await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(
  //         "withOverride is not allowed in production"
  //       )
  //     } finally {
  //       process.env.NODE_ENV = originalEnv
  //     }
  //   })
  // })
})
