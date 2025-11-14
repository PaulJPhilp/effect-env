import type { EnvMeta } from "../shared/types.js"

export interface PrefixEnforcementOptions {
  readonly isServer: boolean
  readonly metaOverride?: Partial<EnvMeta>
}

export interface PrefixEnforcementConfig {
  readonly meta: EnvMeta
}
