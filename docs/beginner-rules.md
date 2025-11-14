# Beginner Level Rules

This guide collects beginner friendly rules and idioms for projects using
Effect. Each section covers a common task, the preferred helper, and a compact
example you can adapt.

## Collect All Results into a List

**Rule:** Use `Stream.runCollect` to execute a stream and gather values into a
`Chunk`.

### Example

```typescript
import { Effect, Stream, Chunk } from "effect";

const program = Stream.range(1, 10).pipe(
  Stream.filter((n) => n % 2 === 0),
  Stream.map((n) => `Even number: ${n}`),
  Stream.runCollect
);

Effect.runPromise(program).then((results) => {
  console.log("Collected results:", Chunk.toArray(results));
});
```

### Why

`Stream.runCollect` runs the pipeline and returns a `Chunk` with every emitted
value, making it easy to inspect or reuse the results.

## Comparing Data by Value with Structural Equality

**Rule:** Use `Data.tagged` (or `Data.struct`) or implement `Equal` to compare
values structurally instead of by reference.

### Example

```typescript
import { Data, Equal, Effect } from "effect";

interface Point {
  readonly _tag: "Point";
  readonly x: number;
  readonly y: number;
}

const Point = Data.tagged<Point>("Point");

const program = Effect.gen(function* () {
  const p1 = Point({ x: 1, y: 2 });
  const p2 = Point({ x: 1, y: 2 });
  const p3 = Point({ x: 3, y: 4 });

  yield* Effect.log(`Reference check: ${p1 === p2}`);

  yield* Effect.log(
    `Structural check (p1 vs p2): ${Equal.equals(p1, p2)}`
  );

  yield* Effect.log(
    `Structural check (p1 vs p3): ${Equal.equals(p1, p3)}`
  );
});

Effect.runPromise(program);
```

### Why

`Data.tagged` creates a constructor whose instances carry structural equality.
Use `Equal.equals` to compare by value even when references differ.

## Create a Basic HTTP Server

**Rule:** Use `Http.server.serve` (with a platform layer) to run an HTTP
application.

### Example

```typescript
import { Effect, Layer } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpServer";
import * as Platform from "@effect/platform-node/HttpServer";

const app = Http.app.make((request) =>
  Effect.succeed(Http.response.text(`Hello, ${request.url}!`))
);

const program = Http.server.serve(app, {
  port: 3456,
  host: "127.0.0.1"
});

const runtimeLayer = Layer.mergeAll(
  Platform.layerRuntime(),
  Platform.layer()
);

NodeRuntime.runMain(Effect.provide(program, runtimeLayer));
```

### Why

`Http.server.serve` wires the Effect HTTP app into a platform specific server,
handling lifecycle and cleanup automatically.

## Create a Stream from a List

**Rule:** Use `Stream.fromIterable` to build a pipeline from an in memory
collection.

### Example

```typescript
import { Effect, Stream, Chunk } from "effect";

const numbers = [1, 2, 3, 4, 5];

const program = Stream.fromIterable(numbers).pipe(
  Stream.map((n) => `Item: ${n}`),
  Stream.runCollect
);

Effect.runPromise(program).then((chunk) => {
  console.log(Chunk.toArray(chunk));
});
```

### Why

`Stream.fromIterable` is the simplest way to start processing items you already
have in memory.

## Create Pre-resolved Effects with succeed and fail

**Rule:** Use `Effect.succeed` for values you already own and `Effect.fail` for
known errors.

### Example

```typescript
import { Effect, Data } from "effect";

class MyError extends Data.TaggedError("MyError") {}

const program = Effect.gen(function* () {
  const value = yield* Effect.succeed(42);
  yield* Effect.log(`Value: ${value}`);

  yield* Effect.fail(new MyError()).pipe(
    Effect.catchTag("MyError", (error) =>
      Effect.log(`Caught error: ${error._tag}`)
    )
  );
});

Effect.runPromise(program);
```

### Why

`succeed` and `fail` let you lift known outcomes into the Effect world without
async code or side effects.

## Execute Asynchronous Effects with Effect.runPromise

**Rule:** Use `Effect.runPromise` to execute an Effect that may suspend or await
async work.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(
  Effect.delay("1 second")
);

Effect.runPromise(program).then(console.log);
```

### Why

`runPromise` bridges Effect programs to promise based consumers while keeping
typed errors inside the Effect.

## Execute Synchronous Effects with Effect.runSync

**Rule:** Use `Effect.runSync` only when the entire computation is synchronous.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.log("Starting calculation...");
  const n = yield* Effect.sync(() => 10);
  const result = yield* Effect.sync(() => n * 2);
  yield* Effect.log(`Result: ${result}`);
  return result;
});

Effect.runSync(program);
```

### Why

`runSync` executes immediately and will throw on failure. Prefer `runPromise`
when async boundaries are present.

## Extract Path Parameters

**Rule:** In routers, define colon prefixed segments such as `/users/:id` and
extract them through the handler context.

### Example

```typescript
import { Effect } from "effect";
import * as Http from "@effect/platform/HttpServer";

const routes = Http.router.make((routes) =>
  routes.get("/users/:id", (request) =>
    Effect.succeed(
      Http.response.text(`Hello, user ${request.params["id"]}!`)
    )
  )
);

export const app = Http.app.fromRouter(routes);
```

### Why

Route params become part of the request state, giving typed access to dynamic
segments.

## Handle a GET Request

**Rule:** Use `Http.router.get` to associate a path with a handler Effect.

### Example

```typescript
import { Effect } from "effect";
import * as Http from "@effect/platform/HttpServer";

const routes = Http.router.empty.pipe(
  Http.router.get("/", () => Effect.succeed(Http.response.text("Home"))),
  Http.router.get("/hello", () =>
    Effect.succeed(Http.response.text("Hello, Effect!"))
  )
);

export const app = Http.app.fromRouter(routes);
```

### Why

The router composes GET handlers cleanly and falls back to `404 Not Found` when
no route matches.

## Run a Pipeline for its Side Effects

**Rule:** Use `Stream.runDrain` when you only care about the effects performed by
each element.

### Example

```typescript
import { Effect, Stream } from "effect";

const tasks = ["task 1", "task 2", "task 3"];

const program = Stream.fromIterable(tasks).pipe(
  Stream.mapEffect((task) => Effect.log(`Completing ${task}`), {
    concurrency: 1
  }),
  Stream.runDrain
);

Effect.runPromise(program).then(() => {
  console.log("All tasks processed.");
});
```

### Why

`runDrain` executes the stream for its side effects and discards the resulting
values.

## Safely Bracket Resource Usage with acquireRelease

**Rule:** Use `Effect.acquireRelease` to pair resource acquisition with cleanup.

### Example

```typescript
import { Effect, Console } from "effect";

const acquireConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Console.log("Connection acquired"))
);

const releaseConnection = (conn: { id: number }) =>
  Effect.sync(() => Console.log(`Connection ${conn.id} released`));

const program = Effect.acquireRelease(
  acquireConnection,
  releaseConnection
).pipe(
  Effect.tap((conn) =>
    Console.log(`Using connection ${conn.id} to run query...`)
  )
);

Effect.runPromise(Effect.scoped(program));
```

### Why

`acquireRelease` guarantees cleanup runs even when the use block fails or gets
interrupted.

## Send a JSON Response

**Rule:** Use `Http.response.json` to serialize data structures into responses.

### Example

```typescript
import { Effect } from "effect";
import * as Http from "@effect/platform/HttpServer";

const routes = Http.router.make((routes) =>
  routes.get("/user", () =>
    Effect.succeed(
      Http.response.json({
        message: "Hello, JSON!",
        timestamp: new Date().toISOString()
      })
    )
  )
);

export const app = Http.app.fromRouter(routes);
```

### Why

`Http.response.json` sets headers and performs serialization for you, avoiding
manual stringification.

## Set Up a New Effect Project

**Rule:** Initialize TypeScript, install `effect`, and enable strict settings.

### Steps

1. `npm init -y`
2. `npm install effect`
3. `npm install -D typescript tsx`
4. Configure `tsconfig.json` with `"strict": true`
5. Create `src/index.ts` and run it with `npx tsx src/index.ts`

### Example

```typescript
import { Effect } from "effect";

const program = Effect.log("Hello, World!");

Effect.runSync(program);
```

### Why

Strict TypeScript plus Effect gives you helpful type feedback from day one.

## Solve Promise Problems with Effect

**Rule:** Reach for Effect when you need typed errors, dependency injection, and
cancellation.

### Example

```typescript
import { Effect, Data } from "effect";

interface User {
  readonly name: string;
}

class DbError extends Data.TaggedError("DbError")<{
  readonly message: string;
}> {}

class HttpClient extends Effect.Service<HttpClient>()("HttpClient", {
  sync: () => ({
    findById: (id: number) =>
      Effect.try({
        try: () => ({ name: `User ${id}` }),
        catch: () => new DbError({ message: "Failed to find user" })
      })
  })
}) {}

const findUser = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    return yield* client.findById(id);
  });

const program = findUser(123).pipe(
  Effect.catchTag("DbError", (error) =>
    Effect.log(`Handled error: ${error.message}`)
  )
);

Effect.runPromise(
  Effect.provide(program, HttpClient.Default)
).then(console.log);
```

### Why

Effect surfaces the error type, the required services, and the return value in
the signature, solving promise limitations.

## Transform Effect Values with map and flatMap

**Rule:** Use `Effect.map` for value transforms and `Effect.flatMap` when the
next step is itself an Effect.

### Example

```typescript
import { Effect } from "effect";

const getUser = (id: number) => Effect.succeed({ id, name: "Paul" });

const getPosts = (userId: number) =>
  Effect.succeed([{ title: "My First Post" }, { title: "Second Post" }]);

const program = getUser(123).pipe(
  Effect.flatMap((user) =>
    getPosts(user.id).pipe(
      Effect.map((posts) => ({
        user: user.name,
        postCount: posts.length
      }))
    )
  )
);

Effect.runPromise(program).then(console.log);
```

### Why

`map` keeps you in the same Effect while `flatMap` chains dependent Effects in a
readable order.

## Understand that Effects are Lazy Blueprints

**Rule:** Remember that defining an Effect describes work but does not run it.

### Example

```typescript
import { Effect } from "effect";

console.log("1. Defining the Effect blueprint...");

const program = Effect.sync(() => {
  console.log("3. The blueprint is now being executed!");
  return 42;
});

console.log("2. The blueprint has been defined. No work has happened yet.");

Effect.runSync(program);
```

### Why

Effects execute only when run through an interpreter such as `runSync` or
`runPromise`.

## Understand the Three Effect Channels (A, E, R)

**Rule:** Read `Effect<A, E, R>` as success type `A`, error type `E`, and required
services `R`.

### Example

```typescript
import { Effect, Data } from "effect";

interface User {
  readonly name: string;
}

class UserNotFound extends Data.TaggedError("UserNotFound") {}

class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    findUser: (id: number) =>
      id === 1
        ? Effect.succeed({ name: "Paul" })
        : Effect.fail(new UserNotFound())
  })
}) {}

const getUser = (id: number): Effect.Effect<User, UserNotFound, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.findUser(id);
  });

Effect.runPromise(
  Effect.provide(getUser(1), Database.Default)
);
```

### Why

The signature advertises the data you get, the errors you must handle, and the
dependencies you must provide.

## Use .pipe for Composition

**Rule:** Prefer `.pipe` for readable top to bottom composition.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2),
  Effect.map((n) => `The result is ${n}`),
  Effect.tap(Effect.log)
);

Effect.runPromise(program);
```

### Why

Piping avoids nested calls and keeps transformations in execution order.

## Wrap Asynchronous Computations with tryPromise

**Rule:** Wrap promise returning code with `Effect.tryPromise` to capture typed
failures.

### Example

```typescript
import { Effect, Data } from "effect";

class HttpError extends Data.TaggedError("HttpError")<{
  readonly message: string;
}> {}

class HttpClient extends Effect.Service<HttpClient>()("HttpClient", {
  sync: () => ({
    getUrl: (url: string) =>
      Effect.tryPromise({
        try: () => fetch(url),
        catch: (error) =>
          new HttpError({ message: `Failed to fetch ${url}: ${error}` })
      })
  })
}) {}

const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  const response = yield* client.getUrl("https://example.com");
  return response.status;
});

Effect.runPromise(
  Effect.provide(program, HttpClient.Default)
).then(console.log);
```

### Why

`tryPromise` shifts promise rejections into the error channel, giving you typed
failures and better composition.

## Wrap Synchronous Computations with sync and try

**Rule:** Wrap safe synchronous work with `Effect.sync` and risky code with
`Effect.try`.

### Example

```typescript
import { Effect } from "effect";

const randomNumber = Effect.sync(() => Math.random());

const parseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new Error(`JSON parsing failed: ${error}`)
  });

const program = Effect.gen(function* () {
  const value = yield* randomNumber;
  yield* Effect.log(`Random number: ${value}`);

  const parsed = yield* parseJson('{"name":"Paul"}').pipe(
    Effect.catchAll((error) =>
      Effect.log(`Parsing failed: ${error.message}`)
    )
  );

  yield* Effect.log(`Parsed value: ${JSON.stringify(parsed)}`);
});

Effect.runPromise(program);
```

### Why

`sync` captures pure work, while `try` catches thrown exceptions and converts
them into typed errors.

## Write Sequential Code with Effect.gen

**Rule:** Use `Effect.gen` to write sequential looking code that still composes
Effects.

### Example

```typescript
import { Effect } from "effect";

const fetchUser = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`Fetching user ${id}...`);
    return { id, name: `User ${id}` };
  });

const fetchPosts = (userId: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`Fetching posts for user ${userId}...`);
    return [{ id: 1, title: "First Post", userId }];
  });

const program = Effect.gen(function* () {
  const user = yield* fetchUser(123);
  const posts = yield* fetchPosts(user.id);
  return { user, posts };
});

Effect.runPromise(program).then(console.log);
```

### Why

`Effect.gen` keeps asynchronous workflows readable without losing type safety or
structured error handling.
