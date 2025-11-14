Here’s the updated Test Plan for effect-env, optimized for your architecture and developer-DX focus. I’ve incorporated best practices around planning, coverage, automation, and risk-based testing to make sure our tests are meaningful and maintainable.

⸻

Test Plan: effect-env

1. Objective
	•	Ensure that the core services (EnvLoadingService, ValidationService, PrefixEnforcementService, EnvService) work reliably and correctly under all supported contexts (server vs client)
	•	Verify that framework adapters (Next.js, Vite) integrate correctly, enforce client/server separation, and behave as expected in build/runtime contexts
	•	Ensure developer experience (DX) guarantees: types inferred correctly, error messages friendly, secrets handled securely
	•	Maintain continuity, minimize regressions, and support CI-driven quality gates

2. Scope

In-scope:
	•	Unit tests for each service module in src/services/*
	•	Integration tests within core library: combining loading → validation → enforcement → final EnvService
	•	Adapter integration tests (Next.js, Vite) demonstrating layering, client/server separation, bundler behaviour
	•	DX type-tests (compile-time tests, e.g., using ts-expect-error) verifying that incorrect usage fails as expected
	•	Secrets handling tests ensuring secrets are masked, not exposed
	•	CI validation: “validate” step to fail build when env schema mis-configured, missing keys, invalid types

Out-of-scope (initial release):
	•	Performance/load testing of large environment sets
	•	External config store integration (Vault, SSM) — to be added in future phases
	•	Full end-user UI testing of bundled apps beyond adapter examples

3. Test Strategy & Approach
	•	Unit testing: Each service is isolated, tests its API contract, edge-cases, error paths
	•	Integration testing: Compose services to validate full flow: raw env → validation → enforcement → env service provision
	•	Adapter tests: Realistic apps (Next.js, Vite) used as test beds; verify correct runtime behaviour and bundler expectations (client/server separation)
	•	Type-tests: Use compile-time checks (e.g., tsd, ts-expect-error) to ensure API surfaces behave as expected and incorrect use fails
	•	Schema type-tests may leverage `Schema.Schema.Type<typeof EnvSchema>` to assert inferred shapes
	•	Secrets handling tests ensuring secrets are masked, not exposed
	•	Secret tests must verify that errors/logs never reveal `Redacted.value`
	•	Regression testing: For each release, confirm that previously passed tests still pass and new tests added for new features
	•	Risk-based testing: Prioritise tests around critical modules (secret handling, prefix enforcement, client/server separation) since failures here have highest impact.  ￼

4. Test Environment & Tools
	•	Languages/Frameworks: TypeScript (strict mode), @effect/io, @effect/layer, effect/Service pattern
	•	Test frameworks: Use vitest or @effect/vitest for unit/integration tests
	•	Type-tests: Use ts-expect-error, tsd for compile-time assertions
	•	CI Environment: GitHub Actions (or other CI) executing unit/integration tests, type tests, adapter tests, bundler checks
	•	Mocking/Stubs: Use stub layers for services to isolate behaviours in tests (e.g., stub EnvLoadingService returning custom raw env)
	•	Bundler checks: For adapters (Vite/Next.js), use e.g. esbuild-analyze, rollup-plugin-visualizer or custom script to assert server-only vars not included in client bundle

5. Test Deliverables
	•	Test suite: All unit and integration tests in __test__ folders of each service (as per structure)
	•	Adapter example projects: Minimal apps demonstrating usage + tests verifying behaviour
	•	Type tests: .d.ts / .ts files with compile-time assertions
	•	CI configuration: YAML or script files integrating tests + reporting
	•	Test reports: Coverage reports, CI logs, bundler analysis results
	•	Defect logs: Documented failed tests, error patterns, tracked for regression
	•	Checklist summary: Entry/exit criteria satisfaction (see below)

6. Entry & Exit Criteria

Entry criteria:
	•	All service APIs defined in api.ts files
	•	All basic logic skeletons implemented for each service
	•	Tools and test frameworks installed and configured, stub/version of adapter packages set up
	•	TypeScript strict mode and project linting in place

Exit criteria:
	•	Unit tests cover ≥ 80% of core library code, integration tests pass
	•	All adapter tests (Next.js, Vite) pass and demonstrate expected behaviour
	•	Type-tests pass (API surfaces type safe)
	•	Secrets handling tests verify no exposure of raw secret values (including logging of `Redacted.value`)
	•	CI pipeline runs successfully, including bundler checks for adapters
	•	Documentation covering test setup and developer instructions present

7. Risks & Mitigations
	•	Risk: Client/server separation logic might fail under specific bundler/config combinations → Mitigation: Add adapter tests early, include bundler analysis in CI
	•	Risk: Type-safety regressions (incorrect types, missing inference) → Mitigation: Type-tests as first-class artefact, include tsd/ts-expect-error in CI
	•	Risk: Test maintenance burden high if service modules are tightly coupled → Mitigation: Keep services isolated, define clear APIs, follow folder-structure convention for service modules
	•	Risk: Secrets inadvertently logged or exposed → Mitigation: Tests specifically for secret masking, scanning logs for raw secret values

8. Coverage and Metrics
	•	Target core library test coverage ≥ 80% before release (unit + integration)
	•	Track adapter packages coverage (goal: ≥ 70%)
	•	CI flakiness: aim for <5% test failures due to test instability
	•	Time-to-onboard: ideally <10 minutes for “Hello World” test scenario
	•	Post-release defect rate for env mistakes (variables missing/invalid) should reduce significantly

9. Schedule & Milestones
	•	Milestone 1 (end of Phase 1): All service unit tests completed and passing; integration tests for core library in place
	•	Milestone 2 (end of Phase 2): Adapter test suites complete and passing; type-tests integrated; CI pipeline green
	•	Milestone 3 (pre-v1.0 release): All test artefacts finalized; coverage thresholds met; bundler checks passing; test docs ready

10. Maintenance Plan
	•	Regular test suite refactoring: review every quarter to remove redundant tests, update edge-cases
	•	Regression suite curated: high-risk modules flagged for always-run tests
	•	On each release: run full test suite + type-tests + adapters + bundler analysis
	•	Test data and mocks reviewed alongside service changes to avoid drift

Great — here’s a Test Case Checklist (in Markdown format) for each of the four core services (EnvLoadingService, ValidationService, PrefixEnforcementService, EnvService). This aligns with the architecture and service-structure discussed. You can paste these into your project’s test-plan docs as ready-to-run checklists.

⸻

EnvLoadingService

Service under test: load(): Effect<never, EnvLoadingError, RawEnv>

✅ Test Scenarios
	•	Should load environment when process.env contains required keys → expect RawEnv with those values.
	•	Should include undefined for missing keys (if allowed) or throw EnvLoadingError when required keys are missing.
	•	Should filter by prefix (if prefix loader is used) correctly.
	•	Should handle empty process.env gracefully (either empty RawEnv or error depending on spec).
	•	Should not have side-effects on process.env (immutable behaviour).
	•	Should work when custom source abstraction is provided (if implemented).
	•	Error message in EnvLoadingError includes list of missing keys and meaningful message.
	•	Raw values should exactly match process.env strings (no unexpected type conversions).

🔍 Additional Notes
	•	Isolate process.env in tests (avoid leaking global state).
	•	Use mocks/stubs if using a custom loader.
	•	Keep test simple, avoid complex logic within tests (best practice)  ￼

⸻

ValidationService

Service under test: validate(raw: Record<string, string | undefined>): Effect<never, ValidationError, Env>

✅ Test Scenarios
	•	Valid raw input yields correctly typed Env object with parsed values (e.g., numbers converted, defaults applied).
	•	Missing required variable triggers ValidationError, with detail of which key(s) failed.
	•	Invalid variable (e.g., non-number string when number expected) triggers ValidationError.
	•	Default values apply when raw value is undefined and default is specified.
	•	Transformation logic works (e.g., trimming strings, turning “true”/“false” into boolean if allowed).
	•	Schema or config - if used - handles optional keys correctly (key omitted vs undefined vs null).
	•	Error message is aggregated, listing all invalid keys (vs failing one at a time).
	•	Type-safe typing: ensure that result Env type matches expected shape (type test).

🔍 Additional Notes
	•	Use parameterised tests for multiple invalid/valid input combos (best practice)  ￼
	•	Avoid logic in the test code itself (keep test simple, clear)  ￼

⸻

PrefixEnforcementService

Service under test: enforce(env: Record<string, unknown>, isServer: boolean): Effect<never, PrefixError, void>

✅ Test Scenarios
	•	When isServer = true, server-only keys (no client prefix) are allowed; client-prefixed keys should trigger error if exposed.
	•	When isServer = false, only variables with client prefix should be present; non-prefixed keys should trigger PrefixError.
	•	Correct key names pass with no error in both modes.
	•	Error object in PrefixError contains list of offending keys and clear message.
	•	Behavior when env is empty (should pass with no error).
	•	Behavior when env contains a mix of correct & incorrect keys → error only lists incorrect ones.
	•	Test edge/corner cases like empty string keys, undefined values, weird prefixes.
	•	Document expected prefix rules (via schema.ts) and ensure enforcement matches spec.

🔍 Additional Notes
	•	Use test data sets to simulate variations of isServer flag.
	•	Ensure test isolation: env map should not mutate.
	•	Consider using mocks/stubs if future logic adds external dependencies.

⸻

EnvService

Service under test: Provision layer delivering typed EnvService<Env> where env property is the final validated & enforced env.

✅ Test Scenarios
	•	After composition (EnvLoadingService → ValidationService → PrefixEnforcementService), EnvService.env should equal expected typed object for valid env.
	•	If upstream services fail (loading, validation, prefix), the layer should fail accordingly (Effect error).
	•	Test consumer code retrieving EnvService obtains correct values and types.
	•	Test scenario: secrets included and accessible as Secret<string> (or whichever abstraction) and not accidentally exposed/serialized.
	•	Type-tests: ensure EnvService<EnvType> infers the correct EnvType for downstream usage.
	•	Behavior in both server & client mode (depending on isServer flag) if relevant to EnvService.
	•	Ensure side-effects within the service are minimal: retrieving env should be safe, idempotent, and not cause runtime exceptions after initial validation.

🔍 Additional Notes
	•	Use layer compositions in tests to simulate full stack.
	•	Include integration test for “Hello World” case: simple schema → full service → access in consumer.
	•	Consider test cases for mis-configuration (missing key, invalid type) to ensure service fails-fast.

⸻
| Service                      | Test Scenario                                                                                  | Expected Outcome                                                     |
|------------------------------|------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| **EnvLoadingService**        | Load environment when `process.env` contains required keys                                    | Returns `RawEnv` with correct values                                |
|                              | Missing required keys                                                                         | Fails with `EnvLoadingError`, message lists missing keys            |
|                              | Filter by prefix when configured                                                              | Only keys matching prefix are included                               |
|                              | Handle empty `process.env`                                                                    | Returns empty `RawEnv` or error (spec-dependent)                      |
|                              | No side-effects on `process.env`                                                              | `process.env` remains unchanged                                      |
|                              | Custom source loader provided                                                                  | Returns based on custom loader behaviour                              |
| **ValidationService**        | Valid raw input yields typed `Env` object                                                      | `Env` object with correctly typed/converted values                    |
|                              | Missing required variable                                                                     | Fails with `ValidationError`, lists invalid/missing keys             |
|                              | Invalid value (e.g., non-number when number expected)                                          | Fails with `ValidationError`                                          |
|                              | Default values apply when raw value is undefined                                              | `Env` object uses default value                                       |
|                              | Transformation logic works (string to boolean/number)                                          | Correct transformation applied                                        |
| **PrefixEnforcementService** | `isServer = true`, server-only keys allowed; client-prefixed keys cause error                | Fails with `PrefixError`, lists offending keys                        |
|                              | `isServer = false`, only client-prefixed keys allowed; non-prefixed cause error                | Fails with `PrefixError`, lists offending keys                        |
|                              | Correct key names pass in both modes                                                          | No error                                                             |
|                              | Empty `env` object                                                                           | Passes with no error                                                  |
|                              | Env object mix of correct & incorrect keys                                                    | Fails with `PrefixError` listing only incorrect ones                  |
| **EnvService**               | Composition of services yields correct typed `EnvService.env`                                  | `env` property matches expected typed object                          |
|                              | Upstream service failure (loading/validation/prefix)                                          | Layer fails appropriately                                              |
|                              | Consumer code retrieves `EnvService` and accesses values                                       | Values and types correct                                               |
|                              | Secrets included and accessible as `Secret<string>` and not exposed/logged                     | Secret type intact, no raw exposure                                   |
|                              | Type-tests enforce correct `EnvType` inference                                                | Compile-time type correctness enforced                                |
|                              | Behavior in server & client mode (if applicable)                                              | Correct behaviour based on `isServer` flag                             |