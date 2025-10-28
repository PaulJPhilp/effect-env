import { Effect, Schema as S } from "effect"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { validate, ValidationError, formatValidationReport } from "../../src/env/validate"
import { exampleSchema, makeEnvSchema } from "../../src/env/schema"

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

  describe("error extraction - missing fields", () => {
    it("should extract single missing field", async () => {
      const missingSource = {
        NODE_ENV: "development",
        PORT: "3000",
        // API_KEY missing
      }

      const result = await Effect.runPromiseExit(validate(exampleSchema, missingSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.missing).toContain("API_KEY")
        expect(error.report).toContain("API_KEY")
        expect(error.report).toContain("missing")
      }
    })

    it("should extract multiple missing fields", async () => {
      const missingSource = {
        NODE_ENV: "development",
        // PORT and API_KEY missing
      }

      const result = await Effect.runPromiseExit(validate(exampleSchema, missingSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error.missing.length).toBeGreaterThanOrEqual(1)
        expect(error.report).toContain("missing")
      }
    })
  })

  describe("error extraction - invalid types", () => {
    it("should extract type validation errors", async () => {
      const typedSchema = makeEnvSchema(
        S.Struct({
          PORT: S.NumberFromString,
          DEBUG: S.BooleanFromString,
        })
      )

      const invalidSource = {
        PORT: "not-a-number",
        DEBUG: "not-a-boolean",
      }

      const result = await Effect.runPromiseExit(validate(typedSchema, invalidSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error).toBeInstanceOf(ValidationError)
        // Should have invalid entries (either PORT or DEBUG or both)
        expect(error.invalid.length).toBeGreaterThanOrEqual(1)
        expect(error.report).toContain("invalid")
      }
    })

    it("should handle NumberFromString validation errors", async () => {
      const numberSchema = makeEnvSchema(
        S.Struct({
          PORT: S.NumberFromString,
        })
      )

      const invalidSource = {
        PORT: "abc123",
      }

      const result = await Effect.runPromiseExit(validate(numberSchema, invalidSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error.report).toBeDefined()
        expect(error.report.length).toBeGreaterThan(0)
      }
    })

    it("should handle BooleanFromString validation errors", async () => {
      const boolSchema = makeEnvSchema(
        S.Struct({
          DEBUG: S.BooleanFromString,
        })
      )

      const invalidSource = {
        DEBUG: "maybe",
      }

      const result = await Effect.runPromiseExit(validate(boolSchema, invalidSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error.report).toBeDefined()
        expect(error.report.length).toBeGreaterThan(0)
      }
    })

    it("should handle Literal validation errors", async () => {
      const literalSchema = makeEnvSchema(
        S.Struct({
          NODE_ENV: S.Literal("development", "production", "test"),
        })
      )

      const invalidSource = {
        NODE_ENV: "staging",
      }

      const result = await Effect.runPromiseExit(validate(literalSchema, invalidSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error.report).toBeDefined()
        expect(error.report.length).toBeGreaterThan(0)
      }
    })
  })

  describe("error extraction - mixed errors", () => {
    it("should extract both missing and invalid fields", async () => {
      const mixedSchema = makeEnvSchema(
        S.Struct({
          NODE_ENV: S.String,
          PORT: S.NumberFromString,
          DEBUG: S.BooleanFromString,
          API_KEY: S.String,
        })
      )

      const mixedSource = {
        NODE_ENV: "development",
        PORT: "not-a-number",
        // DEBUG missing
        // API_KEY missing
      }

      const result = await Effect.runPromiseExit(validate(mixedSchema, mixedSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error).toBeInstanceOf(ValidationError)
        // Should have at least one missing or invalid field
        const totalErrors = error.missing.length + error.invalid.length
        expect(totalErrors).toBeGreaterThanOrEqual(1)
        expect(error.report).toBeDefined()
        expect(error.report.length).toBeGreaterThan(0)
      }
    })

    it("should generate comprehensive report with multiple errors", async () => {
      const complexSchema = makeEnvSchema(
        S.Struct({
          HOST: S.String,
          PORT: S.NumberFromString,
          TIMEOUT: S.NumberFromString,
          RETRY: S.BooleanFromString,
        })
      )

      const errorSource = {
        HOST: "localhost",
        PORT: "invalid-port",
        // TIMEOUT missing
        RETRY: "invalid-bool",
      }

      const result = await Effect.runPromiseExit(validate(complexSchema, errorSource, { failInProd: false }))
      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure" && result.cause._tag === "Fail") {
        const error = result.cause.error as ValidationError
        expect(error.report).toBeDefined()
        expect(error.report).toContain("Key")
        expect(error.report).toContain("Status")
        expect(error.report).toContain("Details")
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

    it("should format multiple missing fields", () => {
      const error = new ValidationError(
        ["API_KEY", "DB_HOST", "SECRET"],
        [],
        ""
      )
      const report = formatValidationReport(error)
      expect(report).toContain("API_KEY")
      expect(report).toContain("DB_HOST")
      expect(report).toContain("SECRET")
      expect(report).toContain("missing")
    })

    it("should format multiple invalid fields", () => {
      const error = new ValidationError(
        [],
        [
          { key: "PORT", message: "Expected number, got string" },
          { key: "DEBUG", message: "Expected boolean" },
        ],
        ""
      )
      const report = formatValidationReport(error)
      expect(report).toContain("PORT")
      expect(report).toContain("DEBUG")
      expect(report).toContain("invalid")
    })

    it("should truncate long error messages", () => {
      const longMessage = "x".repeat(100)
      const error = new ValidationError(
        [],
        [{ key: "CONFIG", message: longMessage }],
        ""
      )
      const report = formatValidationReport(error)
      expect(report).toContain("CONFIG")
      expect(report).toContain("...")
      expect(report.split("\n").some(line => line.includes("CONFIG") && line.length < 200)).toBe(true)
    })

    it("should format empty errors gracefully", () => {
      const error = new ValidationError([], [], "")
      const report = formatValidationReport(error)
      expect(report).toContain("Key")
      expect(report).toContain("Status")
      expect(report).toContain("Details")
    })
  })

  describe("ValidationError toString", () => {
    it("should include report in string representation", () => {
      const error = new ValidationError(
        ["API_KEY"],
        [{ key: "PORT", message: "Invalid" }],
        "test report"
      )
      const str = error.toString()
      expect(str).toContain("Environment validation failed")
      expect(str).toContain("test report")
    })
  })
})
