Here’s the updated PRD in Markdown, with all references to @effect/schema removed and adjusted accordingly:

# PRD: effect-env — Environment Configuration Library for Effect

## Table of Contents  
1. [Purpose](#1-purpose)  
2. [Key Features & Requirements](#2-key-features-requirements)  
 2.1 [Validation & Defaults](#21-validation-defaults)  
 2.2 [Secret Handling](#22-secret-handling)  
 2.3 [Client vs Server Variable Separation](#23-client-vs-server-variable-separation)  
 2.4 [Composability & Layering](#24-composability-layering)  
 2.5 [Framework Adapters](#25-framework-adapters)  
 2.6 [Developer Experience (DX) – Enhanced Edition](#26-developer-experience-dx–enhanced-edition)  
 2.7 [Extensibility & Future Sources](#27-extensibility-future-sources)  
 2.8 [Security & Compliance](#28-security-compliance)  
3. [Scope & Out-of-Scope](#3-scope-out-of--scope)  
4. [Success Metrics](#4-success-metrics)  
5. [Roadmap & Phases](#5-roadmap-phases)  
6. [Risks & Mitigations](#6-risks-mitigations)  
7. [Stakeholders & Users](#7-stakeholders-users)  
8. [Dependencies](#8-dependencies)  
9. [Glossary](#9-glossary)  
10. [Summary](#10-summary)

---

## 1. Purpose  
The goal of **effect-env** is to provide a robust, type-safe, and composable environment configuration library built for the Effect ecosystem (including `@effect/config`, `@effect/layer`, and other related modules). It aims to replace and extend patterns found in libraries like t3-env by offering:  
- Strong validation of environment variables.  
- Secure handling of secrets via `Effect.Secret`.  
- Separation of client vs server variables with runtime enforcement.  
- Adapter support for multiple frameworks (Next.js, Vite, etc.).  
- First-class developer experience (DX) with minimal boilerplate.

---

## 2. Key Features & Requirements

### 2.1 Validation & Defaults  
- Provide a `createEnv(schema)`-style API that:  
  - Accepts a plain TS or library-agnostic schema/object that describes types, validations, defaults, and transformations.  
  - Automatically reads environment values (by default `process.env`) and validates them at runtime.  
  - On validation error or missing variable, fails fast with an aggregated error message.  
- Support defaults and computed transformations inside the schema definitions.  
- Support both synchronous and asynchronous transformations for environment values.

Example schema definition (Effect Schema):

```ts
import { Schema } from "effect"

export const EnvSchema = Schema.Struct({
  NODE_ENV: Schema.Literal("development", "test", "production"),
  PORT: Schema.NumberFromString.pipe(
    Schema.between(0, 65535)
  ).withDefault(3000),
  DATABASE_URL: Schema.String,           // wrapped as Redacted at load time
  PUBLIC_API_BASE: Schema.String         // client-safe (adapter-enforced)
})
```

### 2.2 Secret Handling  
- Accept `Effect.Secret` types for environment values that must be kept secure (e.g., `DATABASE_URL`, `API_KEY`).  
- Ensure secrets are not accidentally logged or serialized unintentionally.  
- Provide masking of secret values when necessary (e.g., error outputs) without exposing raw content.

### 2.3 Client vs Server Variable Separation  
- Support **automatic prefix enforcement**:  
  - Any variable intended for client/browser use must start with `NEXT_PUBLIC_`, `VITE_`, or another configured client prefix.  
  - Variables without the prefix are treated as server-only; attempting to expose them on the client should trigger a runtime error or build-time rejection.  
- Provide an optional “strict mode”:  
  - Enforce compile-time or runtime distinctions between ServerEnv and ClientEnv services.  
  - Prevent accidental mixing of server & client variables.

### 2.4 Composability & Layering  
- Under the hood, provide a `Layer` (from `@effect/layer`) that supplies the `Env` service context to your application.  
- Provide `makeLayer({ isServer: boolean })` or equivalent so frameworks can detect runtime/context (server vs browser) and load accordingly.  
- Support merging of multiple env schemas (e.g., base schema + app-specific extension).  
- Support custom environment sources (e.g., `.env`, external config service) — via a clear abstraction.

### 2.5 Framework Adapters  
- Provide first-class adapters for major frameworks:  
  - **Next.js**: e.g., `effect-env-nextjs` with built-in detection of Node vs browser, SSR/fetch, etc.  
  - **Vite/Rollup**: e.g., `effect-env-vite` handling `import.meta.env` and bundler tree-shaking to avoid bundling server-only variables.  
- Adapters should be minimally intrusive: simple to setup, provide a ready-to-use layer, and enforce environment rules at build/runtime.

### 2.6 Developer Experience (DX) – *Enhanced Edition*  
To make adoption of this library feel **friction-free**, **delightful**, and deeply integrated with the TypeScript + Effect ecosystem, we emphasise the following DX design and workflow aspects:

#### 2.6.1 First-Time Setup as a “Five-Minute Win”  
- Provide a “Hello World” snippet in the README that works out-of-the-box (no copying extra boilerplate, minimal imports).  
- Provide a CLI (optional) or `npx create-effect-env` command that scaffolds the minimal config file, sets up `tsconfig.json`, `.env` template, and runs initial validation.  
- Clear runtime feedback in development mode: e.g., “✅ environment variables loaded, 3 defaults applied, 0 missing” or “❌ invalid keys: X, Y” with colour and actionable hints.

#### 2.6.2 Intuitive API, Types & Autocomplete  
- Use TypeScript’s full type inference so that once the user does:  
  ```ts
  const env = createEnv(mySchema);

they immediately get env.DB_URL: string, env.PORT: number, env.SECRET_KEY: Secret<string>, etc. No any, no awkward casts.
	•	Provide TSDoc comments on all public APIs so that IDE hover/tooltip experience is rich.
	•	Design the API so the correct path is easy and short; the advanced/wrong path is visible but intentionally more verbose. (“Make the correct way easy, make the wrong way possible.”)

2.6.3 Clear Feedback & Errors
	•	When validation fails, present aggregated errors—not one at a time—with friendly messages:

Invalid environment configuration:
  • PORT – expected number but got "abc"
  • DATABASE_URL – missing


	•	Provide stack traces or context only in “verbose/development” mode; in production mode show minimal user-safe message (especially for secrets).
	•	Ensure secret values are never printed or leaked in logs by default; if printed, they should be masked (e.g., ••••••).

2.6.4 Minimal Boilerplate & Framework Friendly
	•	Default loader: process.env, but allow optionally overriding via a source abstraction (for custom loaders) with minimal syntax.
	•	Adapter packages (Next.js, Vite) must integrate with minimal config: e.g., just call provideEnvLayer() in your entrypoint. No heavy wrapping or copy-paste.
	•	Good “convention over configuration”: sensible defaults (prefix rules for client vars, standard secret types) so users don’t need to think too much.

2.6.5 Great Documentation & Onboarding
	•	Provide a “Getting Started” guide with screenshots/IDE hints for VS Code (e.g., autocomplete showing schema names, hover docs).
	•	Provide short code sandbox examples (playground) that users can try in browser.
	•	Maintain an FAQ for common pitfalls (e.g., “Why is my client variable missing? / Why did it not tree-shake?”)
	•	Link to advanced guides for layering, custom loaders, and framework adapters.

2.6.6 Type-Safety Meets Developer Flow
	•	Use strict TypeScript configs: strict: true, noImplicitAny, etc so that users can lean on types rather than runtime guesswork.
	•	Expose a minimal API surface (for the majority of users) so that IDE suggestions are manageable—avoid too many overloaded or ambiguous exports.
	•	Allow progressive migration: if a user has an existing .env library or plain process.env, they can copy a small wrapper and adopt effect-env incrementally (reduces “all-or-nothing” friction).

2.6.7 DX in CI / Developer Ops
	•	Provide a CLI check or script (e.g., effect-env validate) that can be integrated into CI to fail fast if env vars are mis-configured (pre-deployment safety).
	•	Provide build-time warning when client variables lack the required prefix (so mis-exposure is caught early).
	•	For framework adapters, incorporate bundle-analysis or warnings if server-only vars end up in client bundles.

2.6.8 Friendly Versioning & Upgrade Path
	•	Adhere to semantic versioning (SemVer) clearly; document breaking changes in CHANGELOG with clear migration steps.
	•	Provide deprecation warnings in code and docs ahead of breaking changes (helps maintain trust and predictability).
	•	Offer backward compatibility helpers or “legacy mode” for a limited time if major refactor required.

Summary
With these DX-enhancements built into the design, the library will feel like a “first-class citizen” in an Effect + TypeScript stack: lean to adopt, robust by default, intuitive to use, safe in production, and delightful in the IDE.

2.7 Extensibility & Future Sources
	•	Design abstractions to allow future integration of external environment/config sources (Vault, AWS SSM, Doppler, etc.).
	•	Possibly support remote/loaded environments asynchronously before Layer provisioning.
	•	Support custom variable loaders/test mocks for CI, local dev override.

2.8 Security & Compliance
	•	Fail fast on missing or invalid environment variables to avoid undefined behaviour at runtime.
	•	Prevent unintentional exposure of server variables to client bundles.
	•	Ensure secret types cannot be logged or inadvertently serialized.

⸻

3. Scope & Out-of-Scope

In Scope:
	•	Core library: createEnv, makeLayer, schema + secrets + prefix enforcement.
	•	Basic adapter packages: Next.js and Vite.
	•	Types, tests (unit + integration), documentation.
	•	Support for default process.env loader and .env files via standard ecosystem tools.

Out of Scope (for initial release):
	•	Built-in support for remote config stores (Vault, AWS SSM, etc.) — planned for future phase.
	•	Full CLI tool for env documentation generation (nice-to-have later).
	•	Deep bundler analysis (e.g., ensuring minified code tree-shakes out server secrets) — may be part of adapters but not required for core.

⸻

4. Success Metrics

To consider this release successful:
	•	Adoption by at least 5 open-source projects within 3 months.
	•	Zero (>90 %) incidents where production fails due to mis-configured variables (tracked via issue count).
	•	Developer satisfaction measured via survey: average > 4/5 for setup DX and error messages within 6 weeks.
	•	Test coverage: core library >80 % and adapters >70 % at launch.
	•	Documentation rating: Devs can get “Hello World” setup working in under 10 minutes.

⸻

5. Roadmap & Phases
	•	Phase 1 (Core Beta):
	•	createEnv, makeLayer, schema support, secret types, prefix enforcement, error aggregation, basic tests.
	•	Phase 2 (Framework Adapters):
	•	Next.js adapter, Vite adapter, example repo(s), CI bundler check, doc updates.
	•	Phase 3 (Extensibility & Polishing):
	•	Support for custom loaders/sources, optional CLI tooling, hooks for remote config stores, stricter compile-time DX refinements.

⸻

6. Risks & Mitigations
	•	Risk: Runtime validations may introduce unexpected runtime errors in production.
Mitigation: Strong test coverage, staging environment, fail-fast design.
	•	Risk: Client/server variable leakage could create security vulnerabilities.
Mitigation: Strict runtime checks for prefix enforcement, bundle analysis in adapters.
	•	Risk: Poor developer ergonomics may hamper adoption.
Mitigation: Early user testing, simple onboarding docs, feedback loops.

⸻

7. Stakeholders & Users
	•	Primary Users: TypeScript/Effect developers building full-stack apps (Next.js, Vite, etc.).
	•	Secondary Users: Teams migrating from older env libs or other env patterns, looking for strong type-safety and Effect integration.
	•	Stakeholders: Maintainers of related libraries (Effect ecosystem), internal architecture teams (if used inside a company), open-source community.

⸻

8. Dependencies
	•	@effect/config — for environment variable retrieval and layering.
	•	@effect/layer — for injection of Env service into application context.
	•	Build tooling (Next.js, Vite) for adapters.
	•	Optional: dotenv / .env support (via community conventions).

⸻

9. Glossary
	•	Env Service: The runtime injectable service providing all environment variables typed and validated.
	•	Schema: A definition (library-agnostic or built-in) of variables (names/types/defaults/transformations).
	•	Secret: A type wrapper (Effect.Secret) indicating values that must not be exposed.
	•	Layer: The @effect/layer-based context provider for the Env service.
	•	Adapter: Framework-specific package enabling environment loading and context injection in e.g., Next.js or Vite.
	•	Client Prefix: A naming convention (e.g., NEXT_PUBLIC_, VITE_) indicating variables safe for client use.
	•	Strict Mode: An optional enforcement layer distinguishing server vs client environment typings and usage.

⸻

10. Summary

The effect-env library will deliver a modern, secure, and developer-friendly environment configuration solution for applications built with the Effect ecosystem. With clear separation of concerns, strong type safety, support for major frameworks, and a deeply thought-through DX design, it addresses both current dev workflows and future extensibility needs.

---