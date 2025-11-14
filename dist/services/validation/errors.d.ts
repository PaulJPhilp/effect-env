declare const ValidationIssue_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ValidationIssue";
} & Readonly<A>;
export declare class ValidationIssue extends ValidationIssue_base<{
    readonly key: string;
    readonly message: string;
}> {
}
declare const ValidationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ValidationError";
} & Readonly<A>;
export declare class ValidationError extends ValidationError_base<{
    readonly issues: ReadonlyArray<ValidationIssue>;
}> {
}
export {};
