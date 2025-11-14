import type { CompiledEnv, EnvRecord } from "../shared/types.js";
/**
 * Optional overrides for validation execution, allowing a custom compiled
 * program to be supplied per invocation.
 */
export interface ValidationOptions<Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord> {
    readonly compiled?: CompiledEnv<Server, Client>;
}
/**
 * Service-level configuration for validation, providing the compiled schema
 * program used to decode and redact environment variables.
 */
export interface ValidationConfig<Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord> {
    readonly compiled: CompiledEnv<Server, Client>;
}
