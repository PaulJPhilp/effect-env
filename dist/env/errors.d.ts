export declare class EnvError extends Error {
    readonly _tag = "EnvError";
    constructor(message: string);
}
export declare class MissingVarError extends Error {
    readonly _tag = "MissingVarError";
    constructor(key: string);
}
