import { Data } from "effect";
export class ValidationIssue extends Data.TaggedError("ValidationIssue") {
}
export class ValidationError extends Data.TaggedError("ValidationError") {
}
