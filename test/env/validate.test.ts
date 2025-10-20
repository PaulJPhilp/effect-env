import { Effect } from "effect"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { validate, ValidationError, formatValidationReport } from "../../src/env/validate"
import { exampleSchema } from "../../src/env/schema"

describe("validate", () => {
  const validSource = {
    NODE_ENV: "development",
    PORT: "3000",
    API_KEY: "key",
  }

  describe("success", () => {
    it("should succeed with valid source", async () => {
      await Effect.runPromise(validate(exampleSchema, validSource))
    })
  })

  describe("missing required key", () => {
    const missingSource = {
      NODE_ENV: "development",
      PORT: "3000",
      // API_KEY missing
    }

    it("should return ValidationError in dev mode", async () => {
      const result = await Effect.runPromiseExit(validate(exampleSchema, missingSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        expect(result.cause._tag).toBe("Fail")
        // ValidationError details tested in production case
      }
    })

    it("should die in production mode", async () => {
      const result = await Effect.runPromiseExit(validate(exampleSchema, missingSource, { failInProd: true }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        expect(result.cause._tag).toBe("Die")
        expect(result.cause.defect).toBeInstanceOf(ValidationError)
      }
    })
  })

  describe("formatValidationReport", () => {
    it("should format error into table", () => {
      const error = new ValidationError(
        ["API_KEY"],
        [{ key: "PORT", message: "Expected number" }],
        ""
      )
      const report = formatValidationReport(error)
      expect(report).toContain("Key")
      expect(report).toContain("Status")
      expect(report).toContain("API_KEY")
      expect(report).toContain("missing")
      expect(report).toContain("PORT")
      expect(report).toContain("invalid")
    })
  })
})
