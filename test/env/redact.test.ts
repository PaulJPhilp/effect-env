import { describe, it, expect } from "vitest"
import { redact } from "../../src/env/redact"

describe("redact", () => {
  it("should redact OPENAI_API_KEY", () => {
    const record = { OPENAI_API_KEY: "sk-123", LOG_LEVEL: "info" }
    const result = redact(record)
    expect(result.OPENAI_API_KEY).toBe("***")
    expect(result.LOG_LEVEL).toBe("info")
  })

  it("should redact ANTHROPIC_API_KEY", () => {
    const record = { ANTHROPIC_API_KEY: "sk-ant-456", PORT: "3000" }
    const result = redact(record)
    expect(result.ANTHROPIC_API_KEY).toBe("***")
    expect(result.PORT).toBe("3000")
  })

  it("should redact DB_PASSWORD", () => {
    const record = { DB_PASSWORD: "secret123", USERNAME: "user" }
    const result = redact(record)
    expect(result.DB_PASSWORD).toBe("***")
    expect(result.USERNAME).toBe("user")
  })

  it("should redact BEARER_TOKEN", () => {
    const record = { BEARER_TOKEN: "abc123", HOST: "http://host.com" }
    const result = redact(record)
    expect(result.BEARER_TOKEN).toBe("***")
    expect(result.HOST).toBe("http://host.com")
  })

  it("should redact AUTH_TOKEN", () => {
    const record = { AUTH_TOKEN: "token456", DEBUG: "true" }
    const result = redact(record)
    expect(result.AUTH_TOKEN).toBe("***")
    expect(result.DEBUG).toBe("true")
  })

  it("should not redact LOG_LEVEL", () => {
    const record = { LOG_LEVEL: "debug", OTHER: "value" }
    const result = redact(record)
    expect(result.LOG_LEVEL).toBe("debug")
    expect(result.OTHER).toBe("value")
  })

  it("should handle custom extra matchers", () => {
    const record = { SESSION_ID: "sess123", NORMAL: "val" }
    const result = redact(record, { extra: ["SESSION_ID"] })
    expect(result.SESSION_ID).toBe("***")
    expect(result.NORMAL).toBe("val")
  })

  it("should preserve undefined values", () => {
    const record = { SECRET: "secret", UNDEFINED_VAL: undefined }
    const result = redact(record)
    expect(result.SECRET).toBe("***")
    expect(result.UNDEFINED_VAL).toBe(undefined)
  })

  it("should handle empty record", () => {
    const result = redact({})
    expect(result).toEqual({})
  })
})
