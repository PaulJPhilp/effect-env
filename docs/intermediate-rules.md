# Intermediate Level Rules

These guidelines cover intermediate Effect patterns used across real apps.
Each rule highlights the preferred helper, a focused example, and context on
why it matters.

## Access Configuration from the Context

**Rule:** Access configuration from the Effect context.

### Example

```typescript
import { Effect } from "effect";

class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  sync: () => ({
    host: "localhost",
    port: 3000
  })
}) {}

const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  yield* Effect.log(
    `Starting server on http://${config.host}:${config.port}`
  );
});

Effect.runPromise(Effect.provide(program, AppConfig.Default));
```

### Why

The context makes dependencies explicit. Tests can swap in alternative layers
without changing business logic.

## Accessing the Current Time with Clock

**Rule:** Use the Clock service to keep time based logic testable.

### Example

```typescript
import { Clock, Effect } from "effect";

interface Token {
  readonly value: string;
  readonly expiresAt: number;
}

const isExpired = (
  token: Token
): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt)
  );

const token = { value: "abc", expiresAt: Date.now() + 1_000 };

const program = Effect.gen(function* () {
  const expired = yield* isExpired(token);
  yield* Effect.log(`Expired? ${expired}`);
});

Effect.runPromise(program);
```

### Why

Yielding `Clock` lets you inject deterministic clocks (for example
`TestClock`) while production stays live.

## Accumulate Multiple Errors with Either

**Rule:** Decode data with schemas configured for all error reporting.

### Example

```typescript
import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(3)),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i)
  )
});

type User = Schema.Schema.Type<typeof UserSchema>;

const validateUser = (input: unknown) =>
  Schema.decode(UserSchema)(input, { errors: "all" });

const program = Effect.gen(function* () {
  const result = yield* Effect.either(
    validateUser({ name: "Al", email: "bad" })
  );

  yield* Effect.match(result, {
    onFailure: (error) =>
      Effect.log(`Validation failed:\n${error.message}`),
    onSuccess: (user: User) =>
      Effect.log(`Valid: ${JSON.stringify(user)}`)
  });
});

Effect.runPromise(program);
```

### Why

Using `errors: "all"` collects every validation issue instead of failing fast,
which is ideal for user feedback.

## Add Custom Metrics to Your Application

**Rule:** Use metrics to observe counters, gauges, and timers.

### Example

```typescript
import { Duration, Effect, Metric } from "effect";

const userCreated = Metric.counter("users_created_total");
const dbTimer = Metric.timer("db_operation_duration");

const saveUser = Effect.succeed("ok").pipe(
  Effect.delay(Duration.millis(50))
);

const createUser = Effect.gen(function* () {
  yield* saveUser.pipe(Metric.trackDuration(dbTimer));
  yield* Metric.increment(userCreated);
  return { status: "success" };
});

Effect.runPromise(createUser).then(console.log);
```

### Why

`Metric.trackDuration` and friends provide structured metrics hooks without
manual bookkeeping.

## Automatically Retry Failed Operations

**Rule:** Combine `Effect.retry` with a retry `Schedule`.

### Example

```typescript
import { Effect, Schedule } from "effect";

const flaky = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`Processing ${id}`);
    if (id === 2 && Math.random() < 0.6) {
      return yield* Effect.fail(new Error("temporary"));
    }
    return `ok ${id}`;
  });

const retryPolicy = Schedule.recurs(3).pipe(
  Schedule.addDelay(() => "100 millis")
);

const program = Effect.forEach([1, 2, 3], (id) =>
  flaky(id).pipe(
    Effect.retry(retryPolicy),
    Effect.catchAll((error) => Effect.succeed(error.message))
  )
);

Effect.runPromise(program).then(console.log);
```

### Why

Policies describe retry behaviour in one place and keep the core effect lean.

## Avoid Long Chains of .andThen; Use Generators Instead

**Rule:** Prefer `Effect.gen` for sequential workflows.

### Example

```typescript
import { Effect } from "effect";

const step1 = () =>
  Effect.succeed(42).pipe(
    Effect.tap((n) => Effect.log(`Step 1: ${n}`))
  );

const step2 = (n: number) =>
  Effect.succeed(`Result: ${n * 2}`).pipe(
    Effect.tap((s) => Effect.log(`Step 2: ${s}`))
  );

const program = Effect.gen(function* () {
  const value = yield* step1();
  return yield* step2(value);
});

Effect.runPromise(program).then((result) =>
  Effect.runSync(Effect.log(`Final: ${result}`))
);
```

### Why

`Effect.gen` keeps dependencies readable and makes inserting extra steps easy.

## Beyond the Date Type - Real World Dates, Times, and Timezones

**Rule:** Depend on `Clock` for timestamps instead of calling `Date.now`.

### Example

```typescript
import { Clock, Effect } from "effect";

interface Event {
  readonly message: string;
  readonly timestamp: number;
}

const makeEvent = (
  message: string
): Effect.Effect<Event, never, Clock.Clock> =>
  Effect.gen(function* () {
    const timestamp = yield* Clock.currentTimeMillis;
    return { message, timestamp };
  });

const program = Effect.gen(function* () {
  const login = yield* makeEvent("login");
  const logout = yield* makeEvent("logout");
  console.log({ login, logout });
});

Effect.runPromise(program);
```

### Why

Clock based code is deterministic under `TestClock`, helping reproducible tests.

## Compose Resource Lifecycles with Layer.merge

**Rule:** Merge layers to provide multiple services together.

### Example

```typescript
import { Effect, Layer } from "effect";

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    query: (sql: string) => Effect.succeed(`db: ${sql}`)
  })
}) {}

class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  sync: () => ({
    fetch: (path: string) => Effect.succeed(`api: ${path}`)
  })
}) {}

const appLayer = Layer.merge(Database.Default, ApiClient.Default);

const program = Effect.gen(function* () {
  const db = yield* Database;
  const api = yield* ApiClient;
  yield* Effect.log(yield* db.query("SELECT"));
  yield* Effect.log(yield* api.fetch("/users"));
});

Effect.runPromise(Effect.provide(program, appLayer));
```

### Why

`Layer.merge` composes acquisition and release ordering so scopes close cleanly.

## Conditionally Branching Workflows

**Rule:** Use predicates with `Effect.filterOrFail` for declarative gates.

### Example

```typescript
import { Effect } from "effect";

interface User {
  id: number;
  status: "active" | "inactive";
  roles: readonly string[];
}

type UserError = "Inactive" | "NotAdmin";

const findUser = (id: number): Effect.Effect<User> =>
  Effect.succeed({ id, status: "active", roles: ["admin"] });

const ensureActive = (user: User) =>
  user.status === "active";

const ensureAdmin = (user: User) =>
  user.roles.includes("admin");

const program = (id: number) =>
  findUser(id).pipe(
    Effect.filterOrFail(ensureActive, () => "Inactive" as const),
    Effect.filterOrFail(ensureAdmin, () => "NotAdmin" as const),
    Effect.map((user) => `Welcome ${user.id}`)
  );

Effect.runPromise(program(1)).then(console.log);
```

### Why

Named predicates spotlight business rules and keep failure modes explicit.

## Control Flow with Conditional Combinators

**Rule:** Use `Effect.if` to branch without leaving the Effect world.

### Example

```typescript
import { Effect } from "effect";

const attemptAdminAction = (isAdmin: boolean) =>
  Effect.if(isAdmin, {
    onTrue: () => Effect.succeed("Action completed."),
    onFalse: () => Effect.fail("Permission denied." as const)
  });

const program = Effect.gen(function* () {
  const admin = yield* Effect.either(attemptAdminAction(true));
  const user = yield* Effect.either(attemptAdminAction(false));
  yield* Effect.log(JSON.stringify({ admin, user }));
});

Effect.runPromise(program);
```

### Why

`Effect.if` expresses branching, error handling, and success cases in one spot.

## Control Repetition with Schedule

**Rule:** Compose `Schedule` policies for repetition and backoff.

### Example

```typescript
import { Duration, Effect, Schedule } from "effect";

const flaky = Effect.try({
  try: () => {
    if (Math.random() > 0.3) throw new Error("retry");
    return "success";
  },
  catch: (error) => error as Error
});

const policy = Schedule.exponential("100 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(5))
);

const program = Effect.retry(flaky, policy);

Effect.runPromise(program).then(console.log);
```

### Why

Schedules are reusable policies that keep retry logic declarative.

## Create a Service Layer from a Managed Resource

**Rule:** Use `Effect.Service` with `scoped` to manage resources.

### Example

```typescript
import { Console, Effect } from "effect";

interface DatabaseOps {
  query: (sql: string) => Effect.Effect<string>;
}

class Database extends Effect.Service<DatabaseOps>()("Database", {
  scoped: Effect.gen(function* () {
    yield* Console.log("Connection opened");
    yield* Effect.addFinalizer(() => Console.log("Connection closed"));
    return {
      query: (sql) => Effect.succeed(`rows for ${sql}`)
    };
  })
}) {}

const program = Effect.gen(function* () {
  const db = yield* Database;
  const rows = yield* db.query("SELECT * FROM users");
  yield* Console.log(rows);
});

Effect.runPromise(Effect.scoped(
  Effect.provide(program, Database.Default)
));
```

### Why

`scoped` ties acquisition and release to the lifetime of the calling scope.

## Create a Testable HTTP Client Service

**Rule:** Model HTTP clients as services with swappable layers.

### Example

```typescript
import { Effect, Layer } from "effect";

interface HttpError {
  readonly _tag: "HttpError";
  readonly message: string;
}

type HttpClientType = {
  get: <A>(url: string) => Effect.Effect<A, HttpError>;
};

class HttpClient extends Effect.Service<HttpClientType>()("HttpClient", {
  sync: () => ({
    get: (url) =>
      Effect.tryPromise({
        try: () => fetch(url).then((res) => res.json()),
        catch: (error) => ({ _tag: "HttpError", message: String(error) })
      })
  })
}) {}

const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: () => Effect.succeed({ title: "mock" })
  })
);

const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  const data = yield* client.get<{ title: string }>("https://example.com");
  yield* Effect.log(JSON.stringify(data));
});

Effect.runPromise(Effect.provide(program, TestLayer));
```

### Why

Services decouple transport details from consumers and let tests inject mocks.

## Define a Type-Safe Configuration Schema

**Rule:** Use `Config` helpers to load strongly typed configuration.

### Example

```typescript
import { Config, ConfigProvider, Effect, Layer } from "effect";

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT")
  })
);

const TestConfig = ConfigProvider.fromMap(
  new Map([
    ["SERVER.HOST", "localhost"],
    ["SERVER.PORT", "3000"]
  ])
);

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(JSON.stringify(config));
});

Effect.runPromise(
  Effect.provide(program, Layer.setConfigProvider(TestConfig))
);
```

### Why

Declaring schemas up front enforces presence, type, and source for every value.

## Define Contracts Upfront with Schema

**Rule:** Describe domain contracts with schemas for validation and typing.

### Example

```typescript
import { Data, Effect, Schema } from "effect";

const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String
});

type User = Schema.Schema.Type<typeof UserSchema>;

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: number;
}> {}

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: number) =>
      id === 1
        ? Effect.succeed({ id, name: "Jane" } satisfies User)
        : Effect.fail(new UserNotFound({ id }))
  })
}) {}

const program = Effect.gen(function* () {
  const db = yield* Database;
  const user = yield* db.getUser(1);
  yield* Effect.log(JSON.stringify(user));
});

Effect.runPromise(Effect.provide(program, Database.Default));
```

### Why

Schemas capture runtime validation plus compile time types in one definition.

## Define Type-Safe Errors with Data.TaggedError

**Rule:** Model errors as tagged classes to enable precise recovery.

### Example

```typescript
import { Data, Effect } from "effect";

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

const findUser = (id: number) =>
  Effect.gen(function* () {
    if (id < 0) {
      return yield* Effect.fail(new DatabaseError({ cause: "invalid" }));
    }
    return { id, name: `User ${id}` };
  });

const program = Effect.gen(function* () {
  yield* findUser(1).pipe(
    Effect.catchTag("DatabaseError", (error) =>
      Effect.log(`Error: ${error.cause}`)
    )
  );
});

Effect.runPromise(program);
```

### Why

Tagged errors provide discriminated unions for recovery without fragile checks.

## Distinguish "Not Found" from Errors

**Rule:** Return `Effect<Option<A>>` when absence is expected.

### Example

```typescript
import { Effect, Option } from "effect";

interface User {
  id: number;
  name: string;
}

const findUser = (id: number) =>
  Effect.succeed(id === 1 ? { id, name: "Alex" } : null).pipe(
    Effect.map(Option.fromNullable)
  );

const program = findUser(2).pipe(
  Effect.flatMap((maybeUser) =>
    Option.match(maybeUser, {
      onNone: () => Effect.log("No user found"),
      onSome: (user) => Effect.log(`Found ${user.name}`)
    })
  )
);

Effect.runPromise(program);
```

### Why

Optional results stay in the success channel, separating control flow from
system failures.

## Handle API Errors

**Rule:** Map domain errors to HTTP responses when serving routes.

### Example

```typescript
import { Data, Effect } from "effect";

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: string;
}> {}

class InvalidId extends Data.TaggedError("InvalidId")<{
  readonly id: string;
}> {}

const getUser = (id: string) =>
  Effect.gen(function* () {
    if (!/^user_\d+$/.test(id)) {
      return yield* Effect.fail(new InvalidId({ id }));
    }
    if (id === "user_123") return { id, name: "Paul" };
    return yield* Effect.fail(new UserNotFound({ id }));
  });

const toResponse = (error: unknown) => {
  if (error instanceof InvalidId) {
    return { status: 400, body: `Bad id: ${error.id}` };
  }
  if (error instanceof UserNotFound) {
    return { status: 404, body: `Missing user ${error.id}` };
  }
  return { status: 500, body: "Internal error" };
};

const program = getUser("user_456").pipe(
  Effect.matchEffect({
    onFailure: (error) => Effect.succeed(toResponse(error)),
    onSuccess: (user) => Effect.succeed({ status: 200, body: user })
  })
);

Effect.runPromise(program).then(console.log);
```

### Why

Typed errors document response mapping logic without sprawling conditionals.

## Handle Errors with catchTag, catchTags, and catchAll

**Rule:** Match specific failure types using tag aware catch helpers.

### Example

```typescript
import { Data, Effect } from "effect";

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
}> {}

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly id: string;
}> {}

const fetchUser = (id: string) =>
  id === "missing"
    ? Effect.fail(new NotFoundError({ id }))
    : Effect.succeed({ id, name: "Jane" });

const validateUser = (user: { name: string }) =>
  user.name.length > 2
    ? Effect.succeed(`Valid ${user.name}`)
    : Effect.fail(new Error("too short"));

const program = fetchUser("missing").pipe(
  Effect.flatMap(validateUser),
  Effect.catchTags({
    NotFoundError: (error) =>
      Effect.succeed(`User ${error.id} missing`),
    NetworkError: (error) =>
      Effect.succeed(`Network issue at ${error.url}`)
  }),
  Effect.catchAll((error) =>
    Effect.succeed(`Unhandled: ${String(error)}`)
  )
);

Effect.runPromise(program).then(console.log);
```

### Why

Tag aware handlers support precise recovery logic with exhaustiveness checks.

## Handle Flaky Operations with Retries and Timeouts

**Rule:** Combine `Effect.retry` and `Effect.timeout` for resilience.

### Example

```typescript
import { Data, Duration, Effect, Schedule } from "effect";

class ApiError extends Data.TaggedError("ApiError")<{
  readonly attempt: number;
}> {}

const callApi = Effect.gen(function* () {
  const attempt = Math.floor(Math.random() * 5) + 1;
  if (attempt <= 2) {
    return yield* Effect.fail(new ApiError({ attempt }));
  }
  yield* Effect.sleep(Duration.millis(200));
  return { data: "ok", attempt };
});

const retryPolicy = Schedule.recurs(3).pipe(
  Schedule.tapInput((error: ApiError) =>
    Effect.log(`retry attempt ${error.attempt}`)
  )
);

const program = callApi.pipe(
  Effect.timeout(Duration.seconds(2)),
  Effect.retry(retryPolicy),
  Effect.catchTag("ApiError", (error) =>
    Effect.succeed({ data: "fallback", attempt: error.attempt })
  )
);

Effect.runPromise(program).then(console.log);
```

### Why

Timeouts provide upper bounds per attempt while retries absorb transient blips.

## Leverage Effect's Built-in Structured Logging

**Rule:** Use Effect logging utilities for structured output.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.logDebug("Processing user", { userId: 123 }).pipe(
  Effect.tap(() => Effect.log("Debug enabled"))
);

Effect.runSync(program);
```

### Why

Structured logs stay machine friendly and integrate with Effect's context.

## Make an Outgoing HTTP Client Request

**Rule:** Use the Effect HTTP client to keep IO in the Effect world.

### Example

```typescript
import { Effect } from "effect";
import * as HttpClient from "@effect/platform/HttpClient";

const client = HttpClient.client;

const program = client.get("https://jsonplaceholder.typicode.com/posts/1").pipe(
  Effect.flatMap(HttpClient.response.json),
  Effect.tap((json) => Effect.log(JSON.stringify(json, null, 2)))
);

Effect.runPromise(program);
```

### Why

Effect's client composes with layers, metrics, and retry policies uniformly.

## Manage Shared State Safely with Ref

**Rule:** Use `Ref` for concurrent mutable state.

### Example

```typescript
import { Effect, Ref } from "effect";

const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  const tasks = Array.from({ length: 1000 }, () =>
    Ref.update(counter, (n) => n + 1)
  );
  yield* Effect.all(tasks, { concurrency: "unbounded" });
  return yield* Ref.get(counter);
});

Effect.runPromise(program).then(console.log);
```

### Why

`Ref` updates are atomic, simplifying safe shared state across many fibers.

## Mapping Errors to Fit Your Domain

**Rule:** Use `Effect.mapError` to translate infrastructure errors.

### Example

```typescript
import { Data, Effect } from "effect";

class ConnectionError extends Data.TaggedError("ConnectionError") {}
class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly cause: unknown;
}> {}

const dbQuery = Effect.fail(new ConnectionError());

const findUser = dbQuery.pipe(
  Effect.mapError((error) => new RepositoryError({ cause: error }))
);

const program = findUser.pipe(
  Effect.catchTag("RepositoryError", (error) =>
    Effect.log(`Repo error: ${error.cause}`)
  )
);

Effect.runPromise(program);
```

### Why

Error mapping keeps lower level concerns hidden behind domain abstractions.

## Model Optional Values Safely with Option

**Rule:** Prefer `Option` over nullable results.

### Example

```typescript
import { Option } from "effect";

interface User {
  id: number;
  name: string;
}

const users: readonly User[] = [
  { id: 1, name: "Paul" },
  { id: 2, name: "Alex" }
];

const findUser = (id: number) =>
  Option.fromNullable(users.find((user) => user.id === id));

const greet = (id: number) =>
  findUser(id).pipe(
    Option.match({
      onNone: () => "User not found",
      onSome: (user) => `Welcome ${user.name}`
    })
  );

console.log(greet(1));
console.log(greet(3));
```

### Why

Explicit optionality avoids null checks and invites exhaustive handling.

## Model Validated Domain Types with Brand

**Rule:** Brand primitives to represent validated values.

### Example

```typescript
import { Brand, Option } from "effect";

type Email = string & Brand.Brand<"Email">;

const makeEmail = (value: string): Option.Option<Email> =>
  value.includes("@") ? Option.some(value as Email) : Option.none();

const sendEmail = (email: Email) => {
  console.log(`Sending mail to ${email}`);
};
```

### Why

Branding prevents using unchecked strings where validated emails are required.

## Parse and Validate Data with Schema.decode

**Rule:** Decode unknown input through schemas before use.

### Example

```typescript
import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({ name: Schema.String });

type User = Schema.Schema.Type<typeof UserSchema>;

const processInput = (input: unknown) =>
  Effect.gen(function* () {
    const user = yield* Schema.decodeUnknown(UserSchema)(input);
    return `Welcome ${user.name}`;
  }).pipe(
    Effect.catchTag("ParseError", () =>
      Effect.succeed("Invalid user data")
    )
  );

const program = Effect.gen(function* () {
  yield* Effect.log(yield* processInput({ name: "Paul" }));
  yield* Effect.log(yield* processInput({}));
});

Effect.runPromise(program);
```

### Why

Schema decoding unifies parsing, validation, and typed downstream usage.

## Process a Collection in Parallel with Effect.forEach

**Rule:** Use `Effect.forEach` with `concurrency` to bound parallelism.

### Example

```typescript
import { Effect } from "effect";

const fetchUser = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`Fetching ${id}`);
    yield* Effect.sleep("100 millis");
    return { id, name: `User ${id}` };
  });

const program = Effect.forEach(
  Array.from({ length: 10 }, (_, i) => i + 1),
  fetchUser,
  { concurrency: 5 }
);

Effect.runPromise(program).then((users) =>
  console.log(users.length)
);
```

### Why

Bounded concurrency keeps throughput high without overwhelming dependencies.

## Process a Large File with Constant Memory

**Rule:** Stream file contents with `Stream.fromReadable`.

### Example

```typescript
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Stream } from "effect";
import * as path from "node:path";

const processFile = (file: string) =>
  Stream.fromReadable(() => FileSystem.FileSystem.readable(file)).pipe(
    Stream.decodeText,
    Stream.splitLines,
    Stream.tap((line) => Effect.log(`Line: ${line}`)),
    Stream.runDrain
  );

const program = Effect.gen(function* () {
  const file = path.join(process.cwd(), "example.txt");
  yield* FileSystem.FileSystem.writeFileString(file, "a\nb\nc");
  yield* processFile(file);
  yield* FileSystem.FileSystem.remove(file);
});

Effect.runPromise(
  program.pipe(Effect.provide(NodeFileSystem.layer))
);
```

### Why

Streaming keeps memory usage bounded regardless of file size.

## Process Collections of Data Asynchronously

**Rule:** Use `Stream.mapEffect` for effectful processing pipelines.

### Example

```typescript
import { Effect, Stream, Chunk } from "effect";

const getUser = (id: number) =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay("50 millis")
  );

const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  Stream.mapEffect(getUser, { concurrency: 2 }),
  Stream.runCollect
);

Effect.runPromise(program).then((chunk) =>
  console.log(Chunk.toArray(chunk))
);
```

### Why

Streams provide backpressure and structured concurrency for batched IO.

## Process Items Concurrently

**Rule:** Limit parallel work with `Stream.mapEffect` concurrency.

### Example

```typescript
import { Effect, Stream } from "effect";

const work = (id: number) =>
  Effect.log(`Start ${id}`).pipe(
    Effect.delay("1 second"),
    Effect.map(() => `Done ${id}`),
    Effect.tap(Effect.log)
  );

const timed = Effect.timed(
  Stream.fromIterable([1, 2, 3, 4]).pipe(
    Stream.mapEffect(work, { concurrency: 2 }),
    Stream.runDrain
  )
);

Effect.runPromise(timed).then(([duration]) =>
  console.log(`Seconds: ${Math.round(Number(duration) / 1_000)}`)
);
```

### Why

Controlled parallelism reduces total time while respecting resource limits.

## Process Items in Batches

**Rule:** Batch with `Stream.grouped` for efficient bulk operations.

### Example

```typescript
import { Effect, Stream, Chunk } from "effect";

const saveBatch = (users: Chunk.Chunk<{ id: number }>) =>
  Effect.log(
    `Saving: ${Chunk.toArray(users).map((user) => user.id).join(", ")}`
  );

const program = Stream.fromIterable(
  Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
).pipe(
  Stream.grouped(5),
  Stream.mapEffect(saveBatch),
  Stream.runDrain
);

Effect.runPromise(program);
```

### Why

Grouping reduces round trips when upstream APIs support bulk writes.

## Process Streaming Data with Stream

**Rule:** Use `Stream.paginateEffect` for paginated APIs.

### Example

```typescript
import { Effect, Option, Stream } from "effect";

interface Page {
  users: ReadonlyArray<{ id: number }>;
  next: number | null;
}

const fetchPage = (page: number): Effect.Effect<Page, never> =>
  Effect.succeed({
    users: page < 3
      ? [
          { id: page * 2 + 1 },
          { id: page * 2 + 2 }
        ]
      : [],
    next: page < 3 ? page + 1 : null
  });

const stream = Stream.paginateEffect(0, (page) =>
  fetchPage(page).pipe(
    Effect.map((result) => [
      result.users,
      Option.fromNullable(result.next)
    ] as const)
  )
);

const program = Stream.runForEach(stream, (user) =>
  Effect.log(`User ${user.id}`)
);

Effect.runPromise(program);
```

### Why

`Stream.paginateEffect` hides pagination while still streaming data lazily.

## Provide Configuration to Your App via a Layer

**Rule:** Surface configuration with `Effect.Service` layers.

### Example

```typescript
import { Effect } from "effect";

class ServerConfig extends Effect.Service<ServerConfig>()("ServerConfig", {
  sync: () => ({
    port: Number(process.env.PORT ?? "8080")
  })
}) {}

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Port: ${config.port}`);
});

Effect.runPromise(Effect.provide(program, ServerConfig.Default));
```

### Why

Layered config keeps app code independent from environment sources.

## Provide Dependencies to Routes

**Rule:** Provide services to HTTP routers through layers.

### Example

```typescript
import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpResponse from "@effect/platform/HttpServerResponse";
import * as HttpServer from "@effect/platform/HttpServer";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: string) =>
      id === "123"
        ? Effect.succeed({ name: "Paul" })
        : Effect.fail(new Error("missing"))
  })
}) {}

const routes = HttpRouter.empty.pipe(
  HttpRouter.get("/users/:id", () =>
    Effect.flatMap(HttpRouter.params, (params) =>
      Effect.flatMap(Database, (db) => db.getUser(params["id"] ?? ""))
    ).pipe(Effect.flatMap(HttpResponse.json))
  )
);

const program = HttpServer.serveEffect(routes).pipe(
  Effect.provide(Database.Default),
  Effect.provide(NodeHttpServer.layer(() => require("node:http").createServer(), {
    port: 3458
  }))
);

NodeRuntime.runMain(program);
```

### Why

Providing layers scopes dependencies once, keeping handlers pure.

## Race Concurrent Effects for the Fastest Result

**Rule:** Use `Effect.race` to pick the quickest successful effect.

### Example

```typescript
import { Effect, Option } from "effect";

const cacheLookup = Effect.succeed(Option.none()).pipe(
  Effect.delay("200 millis")
);

const dbLookup = Effect.succeed(Option.some({ id: 1, name: "Paul" })).pipe(
  Effect.delay("50 millis")
);

const program = Effect.race(cacheLookup, dbLookup).pipe(
  Effect.flatMap((maybeUser) =>
    Option.match(maybeUser, {
      onNone: () => Effect.fail("Not found" as const),
      onSome: (user) => Effect.succeed(user)
    })
  )
);

Effect.runPromise(program).then(console.log);
```

### Why

Racing redundant sources improves latency and cancels slow paths automatically.

## Representing Time Spans with Duration

**Rule:** Model time spans with `Duration` helpers.

### Example

```typescript
import { Duration, Effect } from "effect";

const delay = Duration.millis(100);
const timeout = Duration.seconds(5);

const program = Effect.log("start").pipe(
  Effect.delay(delay),
  Effect.timeout(timeout)
);

Effect.runPromise(program);
```

### Why

`Duration` communicates units clearly and supports arithmetic operations.

## Retry Operations Based on Specific Errors

**Rule:** Guard retries with predicates that inspect errors.

### Example

```typescript
import { Data, Effect, Schedule } from "effect";

class ServerBusy extends Data.TaggedError("ServerBusy") {}
class NotFound extends Data.TaggedError("NotFound") {}

let attempt = 0;

const flaky = Effect.try({
  try: () => {
    attempt += 1;
    if (attempt <= 2) throw new ServerBusy();
    return "ok";
  },
  catch: (error) => error as ServerBusy | NotFound
});

const retryable = (error: ServerBusy | NotFound) =>
  error instanceof ServerBusy;

const policy = Schedule.recurs(3).pipe(
  Schedule.whileInput(retryable)
);

const program = flaky.pipe(
  Effect.retry(policy),
  Effect.catchTag("NotFound", () => Effect.succeed("missing"))
);

Effect.runPromise(program).then(console.log);
```

### Why

Selective retries prevent wasting time retrying unrecoverable failures.

## Run Independent Effects in Parallel with Effect.all

**Rule:** Execute independent computations concurrently with `Effect.all`.

### Example

```typescript
import { Effect } from "effect";

const fetchUser = Effect.succeed({ id: 1, name: "Paul" }).pipe(
  Effect.delay("1 second")
);

const fetchPosts = Effect.succeed([{ title: "Hello" }]).pipe(
  Effect.delay("1.5 seconds")
);

const program = Effect.all([fetchUser, fetchPosts]);

Effect.runPromise(program).then(console.log);
```

### Why

Parallel execution reduces total wall time for independent tasks.

## Supercharge Your Editor with the Effect LSP

**Rule:** Install the Effect LSP for precise type hints and diagnostics.

### Example

```typescript
import { Effect } from "effect";

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({
    log: (msg: string) => Effect.sync(() => console.log(msg))
  })
}) {}

const program = Effect.succeed(42).pipe(
  Effect.map((n) => n.toString()),
  Effect.flatMap((value) => Effect.log(value)),
  Effect.provide(Logger.Default)
);

Effect.runPromise(program);
```

### Why

The LSP surfaces readable effect signatures inline, aiding comprehension.

## Trace Operations Across Services with Spans

**Rule:** Use `Effect.withSpan` to annotate traces.

### Example

```typescript
import { Effect } from "effect";

const validate = (input: unknown) =>
  Effect.gen(function* () {
    yield* Effect.log("validate");
    return { email: "user@example.com" };
  }).pipe(Effect.withSpan("validate"));

const save = (user: { email: string }) =>
  Effect.gen(function* () {
    yield* Effect.log(`save ${user.email}`);
    return { id: 1, ...user };
  }).pipe(
    Effect.withSpan("save", {
      attributes: { "db.system": "postgres" }
    })
  );

const program = Effect.gen(function* () {
  const user = yield* validate({});
  return yield* save(user);
}).pipe(Effect.withSpan("createUser"));

Effect.runPromise(program).then(console.log);
```

### Why

Spans produce hierarchical traces consumable by observability backends.

## Transform Data During Validation with Schema

**Rule:** Use `Schema.transform` or `transformOrFail` to shape data.

### Example

```typescript
import { Either, Schema } from "effect";

type Email = string & { readonly Email: unique symbol };

const EmailSchema = Schema.String.pipe(
  Schema.transformOrFail(
    Schema.Brand<Email>("Email"),
    (value, _, ast) =>
      value.includes("@")
        ? Either.right(value as Email)
        : Either.left(
            Schema.ParseError.create(ast, "Invalid email format")
          ),
    (email) => Either.right(email)
  )
);

const parsed = Schema.decode(EmailSchema)("user@example.com");
```

### Why

Transforms keep parsing and type refinement in a single declarative place.

## Turn a Paginated API into a Single Stream

**Rule:** Paginate via `Stream.paginateEffect` to expose infinite streams.

### Example

```typescript
import { Effect, Stream, Chunk, Option } from "effect";

const fetchUsers = (page: number) =>
  Effect.succeed({
    users: Chunk.fromIterable(
      page < 3 ? [page * 2 + 1, page * 2 + 2] : []
    ),
    next: page < 3 ? Option.some(page + 1) : Option.none()
  });

const stream = Stream.paginateEffect(0, (page) =>
  fetchUsers(page).pipe(
    Effect.map(({ users, next }) => [users, next] as const)
  )
).pipe(Stream.flatMap(Stream.fromChunk));

Effect.runPromise(
  Stream.runForEach(stream, (id) => Effect.log(`User ${id}`))
);
```

### Why

This pattern streams paginated data lazily while hiding cursor management.

## Understand Layers for Dependency Injection

**Rule:** Treat layers as blueprints that reveal requirements.

### Example

```typescript
import { Effect } from "effect";

class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({
    log: (msg: string) => Effect.sync(() => console.log(msg))
  })
}) {}

class Notifier extends Effect.Service<Notifier>()("Notifier", {
  effect: Effect.gen(function* () {
    const logger = yield* Logger;
    return {
      notify: (msg: string) => logger.log(`Notify: ${msg}`)
    };
  }),
  dependencies: [Logger.Default]
}) {}

const program = Effect.gen(function* () {
  const notifier = yield* Notifier;
  yield* notifier.notify("Hello");
});

Effect.runPromise(Effect.provide(program, Notifier.Default));
```

### Why

Layer signatures expose dependencies, guiding wiring and testing strategy.

## Use Chunk for High-Performance Collections

**Rule:** Prefer `Chunk` for immutable high throughput operations.

### Example

```typescript
import { Chunk } from "effect";

let numbers = Chunk.fromIterable([1, 2, 3, 4, 5]);

numbers = Chunk.append(numbers, 6);
numbers = Chunk.prepend(numbers, 0);

const firstThree = Chunk.take(numbers, 3);

console.log(Chunk.toReadonlyArray(firstThree));
```

### Why

`Chunk` avoids copying on append/prepend and enables efficient slicing.

## Use Effect.gen for Business Logic

**Rule:** Express business flows in generators for clarity.

### Example

```typescript
import { Effect } from "effect";

const validateUser = (data: { email?: string; password?: string }) =>
  Effect.gen(function* () {
    if (!data.email || !data.password) {
      return yield* Effect.fail(new Error("Missing fields"));
    }
    return data;
  });

const hashPassword = (password: string) =>
  Effect.succeed(`hashed_${password}`);

const dbCreateUser = (data: { email: string; password: string }) =>
  Effect.succeed({ id: 1, email: data.email });

const createUser = (data: { email?: string; password?: string }) =>
  Effect.gen(function* () {
    const validated = yield* validateUser(data);
    const hashed = yield* hashPassword(validated.password);
    return yield* dbCreateUser({ ...validated, password: hashed });
  });

Effect.runPromise(createUser({ email: "a@b", password: "secret" })).then(
  console.log
);
```

### Why

Generators turn async workflows into readable top-to-bottom code blocks.

## Use the Auto-Generated .Default Layer in Tests

**Rule:** Provide `.Default` layers when exercising services.

### Example

```typescript
import { Effect } from "effect";

class MyService extends Effect.Service<MyService>()("MyService", {
  sync: () => ({
    doSomething: () => Effect.succeed("done")
  })
}) {}

const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.doSomething();
});

Effect.runPromise(Effect.provide(program, MyService.Default)).then(
  console.log
);
```

### Why

`.Default` offers a ready-made live layer that simplifies test wiring.

## Validate Request Body

**Rule:** Decode request bodies with schemas before handling payloads.

### Example

```typescript
import { Duration, Effect } from "effect";
import * as Schema from "effect/Schema";
import { createServer } from "node:http";

const UserSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
});

type User = Schema.Schema.Type<typeof UserSchema>;

const validate = (body: unknown) => Schema.decodeUnknown(UserSchema)(body);

const server = createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/users") {
    res.writeHead(404);
    return res.end();
  }

  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    Effect.runPromise(
      Effect.try({
        try: () => JSON.parse(data),
        catch: (error) => error as unknown
      }).pipe(
        Effect.flatMap(validate),
        Effect.tap((user: User) =>
          Effect.log(`Creating user ${user.name}`)
        ),
        Effect.matchEffect({
          onFailure: (error) =>
            Effect.sync(() => {
              res.writeHead(400);
              res.end(String(error));
            }),
          onSuccess: (user) =>
            Effect.sync(() => {
              res.writeHead(200);
              res.end(`Added ${user.name}`);
            })
        })
      )
    );
  });
});

server.listen(3456, () =>
  setTimeout(() => server.close(), Duration.toMillis("3 seconds"))
);
```

### Why

Schema based validation keeps HTTP handlers concise and robust.

## Write Tests That Adapt to Application Code

**Rule:** Swap service implementations to test behavior, not plumbing.

### Example

```typescript
import { Effect } from "effect";

interface User {
  id: number;
  name: string;
}

class NotFound extends Error {
  readonly _tag = "NotFound";
  constructor(readonly id: number) {
    super(`User ${id} not found`);
  }
}

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: number) =>
      id === 1
        ? Effect.succeed({ id, name: "Jane" })
        : Effect.fail(new NotFound(id))
  })
}) {}

class TestDatabase extends Effect.Service<TestDatabase>()("TestDatabase", {
  sync: () => ({
    getUser: (id: number) =>
      Effect.succeed({ id, name: `Test ${id}` })
  })
}) {}

const getUserWithFallback = (id: number) =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.getUser(id).pipe(
      Effect.catchTag("NotFound", () =>
        Effect.succeed({ id, name: `Fallback ${id}` })
      )
    );
  });

const program = Effect.provide(
  getUserWithFallback(2),
  Database.Default
);

const testProgram = Effect.provide(
  getUserWithFallback(2),
  TestDatabase.Default
);

Effect.runPromise(program).then(console.log);
Effect.runPromise(testProgram).then(console.log);
```

### Why

Service swapping keeps tests aligned with actual production interfaces.
