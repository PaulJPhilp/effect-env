import type { EnvError, MissingVarError } from "./errors.js";
import type { EffectType } from "../types.js";
/**
 * Generic environment service interface, typed by the schema E.
 */
export interface Env<E> {
    /**
     * Get a required environment variable by key.
     */
    get<K extends keyof E>(key: K): EffectType<E[K], EnvError>;
    /**
     * Require a variable (same as get, but semantically for required).
     */
    require<K extends keyof E>(key: K): EffectType<E[K], MissingVarError>;
    /**
     * Get a number from environment string.
     */
    getNumber(key: string): EffectType<number, EnvError>;
    /**
     * Get a boolean from environment string.
     */
    getBoolean(key: string): EffectType<boolean, EnvError>;
    /**
     * Parse JSON from environment string.
     */
    getJson<T>(key: string): EffectType<T, EnvError>;
    /**
     * Get all environment variables as raw strings.
     */
    all(): EffectType<Record<string, string>, never>;
    /**
     * Override a key for testing (rejects in production).
     */
    withOverride<K extends string, A, E2, R>(key: K, value: string): (fa: EffectType<A, E2, R>) => EffectType<A, EnvError | E2, R>;
}
