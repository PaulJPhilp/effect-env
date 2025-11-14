declare const PrefixError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "PrefixError";
} & Readonly<A>;
export declare class PrefixError extends PrefixError_base<{
    readonly mode: "server" | "client";
    readonly keys: ReadonlyArray<string>;
    readonly message: string;
}> {
}
export {};
