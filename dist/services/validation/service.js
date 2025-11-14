import { ConfigError, ConfigProvider, Effect } from "effect";
import { ValidationError, ValidationIssue } from "./errors.js";
const ROOT_PATH = "<root>";
const toMap = (raw) => {
    const entries = [];
    for (const [key, value] of Object.entries(raw)) {
        if (value !== undefined) {
            entries.push([key, value]);
        }
    }
    return new Map(entries);
};
const formatPath = (path) => path.length === 0 ? ROOT_PATH : path.join(".");
const collectIssues = (error) => {
    const issues = [];
    const visit = (current) => {
        if (ConfigError.isAnd(current)) {
            visit(current.left);
            visit(current.right);
            return;
        }
        if (ConfigError.isOr(current)) {
            visit(current.left);
            visit(current.right);
            return;
        }
        if (ConfigError.isMissingData(current) || ConfigError.isInvalidData(current)) {
            issues.push(new ValidationIssue({
                key: formatPath(current.path),
                message: current.message
            }));
            return;
        }
        if (ConfigError.isSourceUnavailable(current) || ConfigError.isUnsupported(current)) {
            issues.push(new ValidationIssue({
                key: formatPath(current.path),
                message: current.message
            }));
            return;
        }
    };
    visit(error);
    return issues;
};
const chooseCompiled = (config, options) => options?.compiled ?? config.compiled;
const decode = (compiled, raw) => {
    const map = toMap(raw);
    const provider = ConfigProvider.fromMap(map, { pathDelim: "_" });
    return Effect.mapError(provider.load(compiled.program), (error) => new ValidationError({
        issues: collectIssues(error)
    }));
};
const freezeResult = (result) => ({
    server: Object.freeze({ ...result.server }),
    client: Object.freeze({ ...result.client })
});
const makeValidation = (config) => Effect.succeed({
    validate: (raw, options) => Effect.map(decode(chooseCompiled(config, options), raw), freezeResult)
});
export const ValidationService = Effect.Service()("ValidationService", {
    accessors: true,
    effect: (config) => Effect.map(makeValidation(config), (service) => service)
});
export const makeValidationLayer = (config) => ValidationService.Default(config);
