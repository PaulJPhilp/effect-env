declare const EnvLoadingError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "EnvLoadingError";
} & Readonly<A>;
export declare class EnvLoadingError extends EnvLoadingError_base<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export {};
