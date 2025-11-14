/**
 * Default matchers for common secret keys (case-insensitive includes).
 */
const DEFAULT_MATCHERS = [
    "key",
    "token",
    "secret",
    "password",
    "pwd",
    "private",
    "bearer",
    "api",
    "auth",
];
/**
 * Redacts values for keys matching secret patterns.
 * Does not mutate the input record.
 */
export function redact(record, opts) {
    const matchers = [...DEFAULT_MATCHERS, ...(opts?.extra ?? [])];
    const redacted = {};
    for (const [key, value] of Object.entries(record)) {
        const shouldRedact = matchers.some((matcher) => {
            if (typeof matcher === "string") {
                return key.toLowerCase().includes(matcher.toLowerCase());
            }
            else {
                return matcher.test(key);
            }
        });
        redacted[key] = shouldRedact ? "***" : value;
    }
    return redacted;
}
