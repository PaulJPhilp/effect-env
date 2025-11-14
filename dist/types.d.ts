import type { Effect } from "effect";
export type EffectType<A, E = never, R = never> = Effect.Effect<A, E, R>;
export interface EnvServiceConfig<E> {
    readonly parsed: E;
    readonly raw: Record<string, string | undefined>;
}
