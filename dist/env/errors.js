export class EnvError extends Error {
    constructor(message) {
        super(message);
        this._tag = "EnvError";
    }
}
export class MissingVarError extends Error {
    constructor(key) {
        super(`Missing required environment variable: ${key}`);
        this._tag = "MissingVarError";
    }
}
