import { Schema as S } from "effect";
/**
 * Helper to create a typed environment schema.
 * Consumers define their own schema and pass it to layers.
 */
export const makeEnvSchema = (def) => def;
/**
 * Example schema for testing and documentation.
 * Represents a typical app environment with required and optional fields.
 */
export const exampleSchema = makeEnvSchema(S.Struct({
    NODE_ENV: S.String,
    PORT: S.String,
    API_KEY: S.String,
}));
