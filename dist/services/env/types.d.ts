import type { EnvMeta, EnvRecord, RawEnv, ValidationResult } from "../shared/types.js";
import type { EnvLoadingConfig, EnvLoadingOptions } from "../env-loading/api.js";
import type { ValidationConfig, ValidationOptions } from "../validation/types.js";
import type { PrefixEnforcementConfig, PrefixEnforcementOptions } from "../prefix-enforcement/types.js";
export interface EnvServiceOptions<Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord> {
    readonly loading?: EnvLoadingOptions;
    readonly validation?: ValidationOptions<Server, Client>;
    readonly prefix?: PrefixEnforcementOptions;
    readonly metaOverride?: Partial<EnvMeta>;
    readonly isServer?: boolean;
}
export interface EnvServiceConfig<Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord> {
    readonly loading?: EnvLoadingConfig;
    readonly validation: ValidationConfig<Server, Client>;
    readonly prefix?: Partial<PrefixEnforcementConfig>;
    readonly metaOverride?: Partial<EnvMeta>;
    readonly isServer?: boolean;
}
interface BaseResult<Server extends EnvRecord, Client extends EnvRecord> {
    readonly raw: RawEnv;
    readonly validation: ValidationResult<Server, Client>;
    readonly meta: EnvMeta;
}
interface ServerResult<Server extends EnvRecord, Client extends EnvRecord> extends BaseResult<Server, Client> {
    readonly mode: "server";
    readonly env: Server;
}
interface ClientResult<Server extends EnvRecord, Client extends EnvRecord> extends BaseResult<Server, Client> {
    readonly mode: "client";
    readonly env: Client;
}
export type EnvServiceResult<Server extends EnvRecord = EnvRecord, Client extends EnvRecord = EnvRecord> = ServerResult<Server, Client> | ClientResult<Server, Client>;
export {};
