import { Effect } from "effect";
import * as S from "effect/Schema";
/**
 * Validation error with details on missing and invalid keys.
 */
export declare class ValidationError {
    readonly missing: string[];
    readonly invalid: Array<{
        key: string;
        message: string;
    }>;
    readonly report: string;
    readonly _tag = "ValidationError";
    constructor(missing: string[], invalid: Array<{
        key: string;
        message: string;
    }>, report: string);
    toString(): string;
}
/**
 * Format validation details into a readable table.
 */
export declare const formatValidationReport: (error: ValidationError) => string;
/**
 * Validate environment source against schema.
 * In production or if failInProd=true, dies with the error.
 * Otherwise, returns ValidationError on failure, void on success.
 */
export declare const validate: <E>(schema: S.Schema<E>, source: Record<string, string | undefined>, opts?: {
    failInProd?: boolean;
}) => Effect.Effect<void, ValidationError>;
