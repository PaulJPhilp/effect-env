import { Layer } from "effect";
import { Schema as S } from "effect";
import { EnvError } from "./errors.js";
interface LayerOptions {
    readonly clientPrefix?: string;
}
/**
 * Layer that parses process.env with the given schema.
 */
export declare const fromProcess: <E>(schema: S.Schema<E>, options?: LayerOptions) => Layer.Layer<import("./api").Env<any>, EnvError, never>;
/**
 * Layer that loads .env file and parses with schema.
 */
export declare const fromDotenv: <E>(schema: S.Schema<E>, opts?: {
    path?: string;
}, options?: LayerOptions) => Layer.Layer<import("./api").Env<any>, EnvError, never>;
/**
 * Layer that parses a provided record with the schema (useful for tests).
 */
export declare const fromRecord: <E>(schema: S.Schema<E>, record: Record<string, string | undefined>, options?: LayerOptions) => Layer.Layer<import("./api").Env<any>, EnvError, never>;
export {};
