/**
 * Options for customizing redaction matchers.
 */
export type RedactOpts = {
    extra?: Array<string | RegExp>;
};
/**
 * Redacts values for keys matching secret patterns.
 * Does not mutate the input record.
 */
export declare function redact(record: Record<string, string | undefined>, opts?: RedactOpts): Record<string, string | undefined>;
