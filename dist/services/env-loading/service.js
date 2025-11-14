import { Effect } from "effect";
import { chooseSource, loadFromSource } from "./helpers.js";
const makeEnvLoading = (config = {}) => Effect.succeed({
    load: (options) => loadFromSource(chooseSource(config, options))
});
export class EnvLoadingService extends Effect.Service()("EnvLoadingService", {
    accessors: true,
    effect: makeEnvLoading
}) {
}
export const makeEnvLoadingLayer = (config = {}) => EnvLoadingService.Default(config);
