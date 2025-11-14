declare const EnvSourceError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "EnvSourceError";
} & Readonly<A>;
export declare class EnvSourceError extends EnvSourceError_base<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export {};
