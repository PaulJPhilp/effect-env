import { Schema as S } from "effect";
/**
 * Helper to create a typed environment schema.
 * Consumers define their own schema and pass it to layers.
 */
export declare const makeEnvSchema: <A>(def: S.Schema<A>) => S.Schema<A, A, never>;
/**
 * Example schema for testing and documentation.
 * Represents a typical app environment with required and optional fields.
 */
export declare const exampleSchema: S.Schema<{
    readonly NODE_ENV: string;
    readonly PORT: string;
    readonly API_KEY: string;
}, {
    readonly NODE_ENV: string;
    readonly PORT: string;
    readonly API_KEY: string;
}, never>;
/**
 * Inferred type from the example schema, used in service tests and docs.
 */
export type AppEnv = S.Schema.Type<typeof exampleSchema>;
