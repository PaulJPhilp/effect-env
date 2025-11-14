Here’s the updated Architecture Document for the effect-env project, incorporating the folder/service structure you specified and the adjustments discussed.

⸻

Architecture Document – effect-env

1. Overview

This document describes the architecture of the effect-env library: the high-level layering, service abstractions, module boundaries, and recommended folder/service structure. It’s designed so you (and contributors) have a clear, consistent, scalable way to add services, adapters, and layers.

Goals
	•	Clean separation of concerns (loading, validating, layering, framework-adapters)
	•	Strong type-safety and runtime enforcement (via the Effect ecosystem)
	•	Developer-friendly structure so that services are easy to reason about, test, and evolve
	•	Framework-agnostic core, with adapter packages for specific frameworks
	•	Consistent “service” folder structure across modules to increase maintainability

⸻

2. Architectural Layers

2.1 Core Library Layer
	•	Provides the core createEnv(…), makeLayer(…), validation & default injection, secret handling, prefix enforcement for client/server, etc.
	•	Uses @effect/config, @effect/layer and other core Effect primitives.
	•	Does not depend on any specific framework.
	•	Exports the Env service interface and types used by adapters.

2.2 Service/Feature Layer
	•	Encapsulates discrete “services”: e.g., EnvLoadingService, SchemaValidationService, SecretMaskingService, etc if appropriate.
	•	Each service lives in src/services/{serviceName} (see section 3. Service Structure).
	•	Provides well-defined interface and implementation via Effect.Service (or analogous) so dependencies can be injected and composed.

2.3 Framework Adapter Layer
	•	Packages like effect-env-nextjs, effect-env-vite, etc.
	•	These import the core layer, detect runtime context (server vs client), and provide ready-to-use layers (e.g., makeNextEnvLayer()).
	•	They also enforce bundler/compile-time and build-time rules (like not bundling server-only env into the client).
	•	Prefer minimal friction for user: just wire the adapter layer in the app entry-point.

2.4 Application / Consumer Layer
	•	The end application that uses the library: it defines its own env schema (plain TS or other), provides that to the core library, obtains typed Env service, and uses it.
	•	For example: const env = createEnv(schema); followed by Layer.provide(EnvService, envLayer) in your main.

2.5 Composition & Dependency Injection
	•	Effects (via Effect.Service, Layer, etc) enable dependency injection and composition of services.
	•	Services can depend on one another—e.g., SecretMaskingService might depend on EnvLoadingService.
	•	All services are registered in the Layer composition so that the runtime context is well-scoped.

⸻

3. Service Structure & Folder Layout

Below is the prescribed structure for all services in the project. This standardization ensures consistency, testability, and clarity.

src/
  services/
    {serviceName}/
      __test__/
        service.test.ts
      api.ts
      types.ts
      schema.ts
      utils.ts
      service.ts
      index.ts

Explanation of each file
	•	api.ts — Exports the public interface (e.g., interface EnvService { get(key: string): Effect<…> }) and the Tag (if used) for the service injection.
	•	types.ts — Defines types used by the service (domain types, value objects, error types).
	•	schema.ts — Contains service-local schemas (validation rules, defaults) built with `Schema` from `effect` (e.g., `Schema.Struct`, refinements).
	•	utils.ts — Helper functions internal to the service.
	•	service.ts — Contains the Effect.Service implementation: the live layer, wiring dependencies, logic, error handling, etc.
	•	index.ts — Barrel file exporting the tag, API, and layer of the service.
	•	__test__/service.test.ts — Unit/integration tests for the service implementation.

Example

For a service called EnvLoader, you would have:

src/services/envLoader/
  __test__/
    envLoader.test.ts
  api.ts
  types.ts
  schema.ts
  utils.ts
  service.ts
  index.ts

In api.ts:

export interface EnvLoader {
  load(): Effect<never, EnvError, LoadedEnv>;
}
export const EnvLoaderTag = Tag<EnvLoader>();

In service.ts:

export const envLoaderLive = Layer.succeedWith(EnvLoaderTag, () => { ... });


⸻

4. Interaction & Flow

4.1 Initialization Flow
	1.	At application bootstrap, framework adapter layer detects whether run context is server or client.
	2.	It constructs the Env layer via makeLayer({ isServer }).
	3.	That layer internally wires:
	•	EnvLoadingService → reads raw configuration (process.env / import.meta.env / custom source)
	•	ValidationService → validates values, shapes defaults, secret handling
	•	PrefixEnforcementService → ensures client vs server variables separation
	•	Final provision of EnvService tag with typed environment variables accessible inside the app.
	4.	The application code then provides this layer into the Effect runtime, and downstream services or UI code can access the EnvService via Effect.service(EnvServiceTag).

4.2 Runtime Use

Once provided, services (e.g., database connector, API client) can depend on the EnvService to access configuration in a strongly typed way. Because the EnvService uses Effect layers and tags, it benefits from context injection, composability, and testability.

4.3 Testing & Mocks

Because each service is isolated and has its tag and API, you can create mock layers in tests: for example, Layer.succeed(EnvServiceTag, mockEnv). This supports isolation and CI-safe test setups.

⸻

5. Code & Type Safety Considerations
	•	Use strict: true, noImplicitAny, etc in tsconfig.json for full type-safety.
	•	All service APIs return Effect types (representing dependencies, errors, values) so side-effects, errors, and async behaviour are explicit.
	•	Secrets handled via Effect.Secret type to prevent accidental exposure.
	•	Prefix rules (client vs server) enforced at runtime (and ideally, build-time via adapters).
	•	Schema/validation logic (in schema.ts files) ensures runtime safety of configuration; compile-time types via types.ts support DX with IntelliSense.

⸻

6. Versioning & Module Boundaries
	•	Core library should only depend on Effect primitives and minimal other dependencies.
	•	Adapter packages depend on core and the specific framework context; they should remain thin.
	•	Each service module within src/services follows the same pattern and should not be tightly coupled to unrelated services.
	•	Clear module boundaries help with tree-shaking, small bundles, and maintainability.

⸻

7. Summary

This architecture sets up effect-env as a modular, Effect-native, developer-friendly library with clearly defined layering (core, services, adapters), standardized folder/service structure, strong type-safety, and a clean runtime design. Following this structure will help maintain consistency, facilitate testing, scalability, and high developer productivity.

⸻

graph TD
    subgraph Core Library
        A[EnvLoadingService] --> B[ValidationService]
        B --> C[PrefixEnforcementService]
        C --> D[EnvService]
    end

    subgraph Framework Adapter
        E[AdapterEntryPoint] --> A
        E --> F[makeLayer({ isServer })]
        F --> D
    end

    subgraph Application / Consumer
        G[App Bootstrap] --> F
        G --> H[App Components / Services]
        H -->|uses| D
    end

    style Core Library fill:#f9f,stroke:#333,stroke-width:1px
    style Framework Adapter fill:#cff,stroke:#333,stroke-width:1px
    style Application / Consumer fill:#cfc,stroke:#333,stroke-width:1px


	Legend:
	•	EnvLoadingService: reads raw environment from process.env, import.meta.env or custom source
	•	ValidationService: applies runtime checks, defaults and secret-masking
	•	PrefixEnforcementService: ensures client vs server variables separation
	•	EnvService: final service providing typed env values
	•	AdapterEntryPoint: framework-specific entry (Next.js, Vite)
	•	makeLayer({ isServer }): builds the layer based on runtime context
	•	App Bootstrap: the application that wires the layer
	•	App Components / Services: downstream usage of the EnvService

2. Service Skeleton Template

Here is a code skeleton (in TypeScript) for one service module (e.g., EnvLoadingService) following your folder conventions:

// src/services/envLoading/api.ts
import { Tag } from "@effect/data/Context"
import type { Effect } from "@effect/io"

export interface EnvLoadingService {
  load(): Effect<never, EnvLoadingError, RawEnv>
}
export const EnvLoadingServiceTag = Tag<EnvLoadingService>()

// src/services/envLoading/types.ts
export type RawEnv = Record<string, string | undefined>
export interface EnvLoadingError {
  readonly message: string
  readonly missingKeys?: string[]
}

// src/services/envLoading/schema.ts
import { Schema } from "effect"

// Define service-local schemas with Schema.Struct / refinements
export const rawEnvSchema = Schema.Struct({
  /* field definitions */
})

// src/services/envLoading/utils.ts
export function pickEnv(prefix?: string): RawEnv {
  const env = process.env
  const result: RawEnv = {}
  for (const key of Object.keys(env)) {
    if (!prefix || key.startsWith(prefix)) {
      result[key] = env[key]
    }
  }
  return result
}

// src/services/envLoading/service.ts
import { pipe } from "@effect/data/Function"
import * as T from "@effect/io/Effect"
import * as L from "@effect/io/Layer"
import { EnvLoadingServiceTag, EnvLoadingService } from "./api"
import type { RawEnv } from "./types"
import { pickEnv } from "./utils"

export const envLoadingLive = L.succeedWith(EnvLoadingServiceTag, () => ({
  load: () =>
    T.succeedWith(() => {
      const raw = pickEnv()
      // Could check missing required vars here, throw if needed
      return raw as RawEnv
    })
}))

// src/services/envLoading/index.ts
export * from "./api"
export * from "./types"
export * from "./schema"
export * from "./utils"
export * from "./service"


Great — here are the skeletons for all core services (as per your architecture) plus a full folder tree for src/services. You can plug these into your repo and refine them as you build.

⸻

Service Skeletons

1. EnvLoadingService

// src/services/envLoading/api.ts
import { Tag } from "@effect/data/Context";
import type { Effect } from "@effect/io";

export interface EnvLoadingService {
  load(): Effect<never, EnvLoadingError, RawEnv>;
}
export const EnvLoadingServiceTag = Tag<EnvLoadingService>();

// src/services/envLoading/types.ts
export type RawEnv = Record<string, string | undefined>;
export interface EnvLoadingError {
  readonly message: string;
  readonly missingKeys?: string[];
}

// src/services/envLoading/schema.ts
import { Schema } from "effect";

// Define service-local schemas with Schema.Struct / refinements
export const rawEnvSchema = Schema.Struct({
  // e.g., DATABASE_URL: Schema.String
});

// src/services/envLoading/utils.ts
export function pickEnv(prefix?: string): RawEnv {
  const env = process.env;
  const result: RawEnv = {};
  for (const key in env) {
    if (!prefix || key.startsWith(prefix)) {
      result[key] = env[key];
    }
  }
  return result;
}

// src/services/envLoading/service.ts
import { pipe } from "@effect/data/Function";
import * as T from "@effect/io/Effect";
import * as L from "@effect/io/Layer";
import { EnvLoadingServiceTag, EnvLoadingService } from "./api";
import type { RawEnv } from "./types";
import { pickEnv } from "./utils";

export const envLoadingLive = L.succeedWith(EnvLoadingServiceTag, () => ({
  load: () =>
    T.succeedWith(() => {
      const raw = pickEnv();
      // Here you could check for missing keys
      return raw as RawEnv;
    })
}));

// src/services/envLoading/index.ts
export * from "./api";
export * from "./types";
export * from "./schema";
export * from "./utils";
export * from "./service";

2. ValidationService

// src/services/validation/api.ts
import { Tag } from "@effect/data/Context";
import type { Effect } from "@effect/io";

export interface ValidationService<Env> {
  validate(raw: Record<string, string | undefined>): Effect<never, ValidationError, Env>;
}
export const ValidationServiceTag = Tag<ValidationService<any>>();

// src/services/validation/types.ts
export interface ValidationError {
  readonly message: string;
  readonly invalidKeys?: string[];
}

// src/services/validation/schema.ts
// (Optional) Definitions of default values, transforms
export const validationSchema = {
  // e.g., PORT: { parse: Number, default: 3000 }
};

// src/services/validation/utils.ts
export function parseNumber(val: string | undefined, defaultVal?: number): number {
  if (val === undefined) {
    if (defaultVal !== undefined) return defaultVal;
    throw new Error("Value is required");
  }
  const n = Number(val);
  if (Number.isNaN(n)) throw new Error("Expected number");
  return n;
}

// src/services/validation/service.ts
import { ValidationServiceTag, ValidationService } from "./api";
import * as T from "@effect/io/Effect";
import * as L from "@effect/io/Layer";

export const validationLive = L.succeedWith(ValidationServiceTag, () => ({
  validate: (raw) =>
    T.succeedWith(() => {
      // Implement validation logic: defaulting, missing check, type conversion
      const env: any = {};
      // e.g., env.PORT = parseNumber(raw.PORT, 3000);
      return env as any;
    })
}));

// src/services/validation/index.ts
export * from "./api";
export * from "./types";
export * from "./schema";
export * from "./utils";
export * from "./service";

3. PrefixEnforcementService

// src/services/prefixEnforcement/api.ts
import { Tag } from "@effect/data/Context";
import type { Effect } from "@effect/io";

export interface PrefixEnforcementService {
  enforce(env: Record<string, unknown>, isServer: boolean): Effect<never, PrefixError, void>;
}
export const PrefixEnforcementServiceTag = Tag<PrefixEnforcementService>();

// src/services/prefixEnforcement/types.ts
export interface PrefixError {
  readonly message: string;
  readonly exposedKeys?: string[];
}

// src/services/prefixEnforcement/schema.ts
export const prefixRules = {
  clientPrefix: "PUBLIC_",
  serverPrefix: "", // server vars must *not* have the client prefix
};

// src/services/prefixEnforcement/utils.ts
export function findClientKeys(vars: Record<string, unknown>, clientPrefix: string): string[] {
  return Object.keys(vars).filter((k) => k.startsWith(clientPrefix));
}

// src/services/prefixEnforcement/service.ts
import { PrefixEnforcementServiceTag, PrefixEnforcementService } from "./api";
import * as T from "@effect/io/Effect";
import * as L from "@effect/io/Layer";
import { prefixRules } from "./schema";
import { findClientKeys } from "./utils";

export const prefixEnforcementLive = L.succeedWith(PrefixEnforcementServiceTag, () => ({
  enforce: (env, isServer) =>
    T.succeedWith(() => {
      if (isServer) {
        // ensure no client-prefixed vars appear as server-only, etc.
      } else {
        // ensure only client-prefix vars are exposed to client bundle
      }
    })
}));

// src/services/prefixEnforcement/index.ts
export * from "./api";
export * from "./types";
export * from "./schema";
export * from "./utils";
export * from "./service";

4. EnvService

// src/services/env/api.ts
import { Tag } from "@effect/data/Context";

export interface EnvService<Env> {
  readonly env: Env;
}
export const EnvServiceTag = Tag<EnvService<any>>();

// src/services/env/types.ts
export type EnvError = never; // or define if needed
export type LoadedEnv<Env> = Env;

// src/services/env/schema.ts
// Maybe not needed – env is already typed by ValidationService

// src/services/env/utils.ts
// Potential helpers to mask secrets, etc.

// src/services/env/service.ts
import * as L from "@effect/io/Layer";
import { EnvServiceTag, EnvService } from "./api";

export const makeEnvLayer = <Env>(env: Env) =>
  L.succeed(EnvServiceTag, { env } as EnvService<Env>);

// src/services/env/index.ts
export * from "./api";
export * from "./types";
export * from "./utils";
export * from "./service";


⸻

2. Full Folder Tree for src/services

src/
  services/
    envLoading/
      __test__/
        envLoading.test.ts
      api.ts
      types.ts
      schema.ts
      utils.ts
      service.ts
      index.ts
    validation/
      __test__/
        validation.test.ts
      api.ts
      types.ts
      schema.ts
      utils.ts
      service.ts
      index.ts
    prefixEnforcement/
      __test__/
        prefixEnforcement.test.ts
      api.ts
      types.ts
      schema.ts
      utils.ts
      service.ts
      index.ts
    env/
      __test__/
        env.test.ts
      api.ts
      types.ts
      schema.ts
      utils.ts
      service.ts
      index.ts

