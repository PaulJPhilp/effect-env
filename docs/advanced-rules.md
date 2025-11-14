# Advanced Level Rules

These rules capture techniques for large Effect apps. Each pairing mentions the
preferred tool, a focused example, and why it matters at scale.

## Add Caching by Wrapping a Layer

**Rule:** Use a wrapper layer to add caching without touching the live service.

### Example

```typescript
import { Effect, Layer, Ref } from "effect";

class WeatherService extends Effect.Service<WeatherService>()(
  "WeatherService",
  {
    sync: () => ({
      getForecast: (city: string) => Effect.succeed(`Sunny in ${city}`)
    })
  }
) {}

const WeatherLive = Layer.succeed(
  WeatherService,
  WeatherService.of({
    getForecast: (city) =>
      Effect.succeed(`Sunny in ${city}`).pipe(
        Effect.delay("2 seconds"),
        Effect.tap(() => Effect.log(`Live fetch ${city}`))
      )
  })
);

const WeatherCached = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    const live = yield* WeatherService;
    const cache = yield* Ref.make(new Map<string, string>());

    return WeatherService.of({
      getForecast: (city) =>
        Ref.get(cache).pipe(
          Effect.flatMap((map) =>
            map.has(city)
              ? Effect.log(`Cache hit ${city}`).pipe(
                  Effect.as(map.get(city)!)
                )
              : live.getForecast(city).pipe(
                  Effect.tap((forecast) =>
                    Ref.update(cache, (map) => map.set(city, forecast))
                  )
                )
          )
        )
    });
  })
);

const layer = Layer.provide(WeatherCached, WeatherLive);

const program = Effect.gen(function* () {
  const weather = yield* WeatherService;
  yield* weather.getForecast("London");
  yield* weather.getForecast("London");
});

Effect.runPromise(Effect.provide(program, layer));
```

### Why

Wrapping layers preserves the live implementation and keeps caching concerns
reusable.

## Build a Basic HTTP Server

**Rule:** Launch HTTP apps by compiling layers into a managed runtime.

### Example

```typescript
import { Effect, Fiber, Layer } from "effect";
import * as Http from "@effect/platform/HttpServer";
import * as Res from "@effect/platform/HttpServerResponse";
import { NodeHttpServer } from "@effect/platform-node";
import { createServer } from "node:http";

const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3001 });

const app = Effect.gen(function* () {
  yield* Effect.log("Request received");
  return yield* Res.text("Hello World");
});

const serverLayer = Http.serve(app).pipe(Layer.provide(ServerLive));

const program = Effect.gen(function* () {
  yield* Effect.log("Server starting");
  const fiber = yield* Layer.launch(serverLayer).pipe(Effect.fork);
  yield* Effect.sleep("2 seconds");
  yield* Effect.log("Server stopping");
  yield* Fiber.interrupt(fiber);
});

Effect.runPromise(program);
```

### Why

Turning layers into a runtime keeps HTTP handlers pure while the platform layer
handles wiring.

## Create a Managed Runtime for Scoped Resources

**Rule:** Use `Effect.scoped` to guarantee acquisition and release semantics.

### Example

```typescript
import { Effect } from "effect";

class DatabasePool extends Effect.Service<DatabasePool>()(
  "DatabasePool",
  {
    effect: Effect.gen(function* () {
      yield* Effect.log("Pool acquired");
      yield* Effect.addFinalizer(() => Effect.log("Pool released"));
      return {
        query: () => Effect.succeed("rows")
      };
    })
  }
) {}

const program = Effect.gen(function* () {
  const pool = yield* DatabasePool;
  yield* Effect.log("Running query");
  yield* pool.query();
});

Effect.runPromise(Effect.scoped(
  Effect.provide(program, DatabasePool.Default)
));
```

### Why

`Effect.scoped` closes resources even when failures or interruptions occur.

## Create a Reusable Runtime from Layers

**Rule:** Compile layers once and reuse the resulting runtime for every request.

### Example

```typescript
import { Effect, Layer, Runtime } from "effect";

class Greeter extends Effect.Service<Greeter>()(
  "Greeter",
  {
    sync: () => ({
      greet: (name: string) => Effect.sync(() => `Hello ${name}`)
    })
  }
) {}

const runtime = Effect.runSync(
  Layer.toRuntime(Greeter.Default).pipe(Effect.scoped)
);

Runtime.runPromise(runtime)(
  Effect.gen(function* () {
    const greeter = yield* Greeter;
    const message = yield* greeter.greet("Ada");
    yield* Effect.log(message);
  })
);
```

### Why

Building the runtime once avoids rebuilding dependency graphs for every effect.

## Decouple Fibers with Queues and PubSub

**Rule:** Use `Queue` for point to point work and `PubSub` for fan out.

### Example (Queue)

```typescript
import { Effect, Fiber, Queue } from "effect";

const queueProgram = Effect.gen(function* () {
  const queue = yield* Queue.bounded<string>(10);

  const producer = yield* Effect.gen(function* () {
    for (let i = 0; i < 5; i += 1) {
      yield* Queue.offer(queue, `job-${i}`);
      yield* Effect.sleep("200 millis");
    }
  }).pipe(Effect.fork);

  const worker = yield* Effect.gen(function* () {
    for await (const job of Queue.take(queue)) {
      yield* Effect.log(`Processed ${job}`);
    }
  }).pipe(Effect.fork);

  yield* Effect.sleep("1 second");
  yield* Fiber.interrupt(producer);
  yield* Fiber.interrupt(worker);
});

Effect.runPromise(queueProgram);
```

### Example (PubSub)

```typescript
import { Effect, Fiber, PubSub, Queue } from "effect";

const pubsubProgram = Effect.gen(function* () {
  const bus = yield* PubSub.bounded<string>(10);

  const subscribe = (label: string) =>
    PubSub.subscribe(bus).pipe(
      Effect.flatMap((queue) =>
        Effect.gen(function* () {
          while (true) {
            const value = yield* Queue.take(queue);
            yield* Effect.log(`${label}: ${value}`);
          }
        })
      ),
      Effect.fork
    );

  const audit = yield* subscribe("AUDIT");
  const notify = yield* subscribe("NOTIFY");

  yield* PubSub.publish(bus, "user_logged_in");
  yield* Effect.sleep("200 millis");
  yield* Fiber.interrupt(audit);
  yield* Fiber.interrupt(notify);
});

Effect.runPromise(pubsubProgram);
```

### Why

Queues and PubSub decouple producers from consumers while preserving backpressure.

## Execute Long-Running Apps with Effect.runFork

**Rule:** Launch top level loops with `Effect.runFork` and control them via fibers.

### Example

```typescript
import { Effect, Fiber } from "effect";

const server = Effect.log("tick").pipe(
  Effect.delay("1 second"),
  Effect.forever
);

const fiber = Effect.runFork(server);

setTimeout(() => {
  Effect.runPromise(Fiber.interrupt(fiber));
}, 5_000);
```

### Why

Detached fibers keep services running while allowing external interruption.

## Handle Unexpected Errors by Inspecting the Cause

**Rule:** Examine `Cause` data to separate expected failures from defects.

### Example

```typescript
import { Cause, Data, Effect } from "effect";

class DbError extends Data.TaggedError("DbError")<{ readonly step: string }> {}

const connect = (url: string) =>
  url === "bad"
    ? Effect.fail(new DbError({ step: "connect" }))
    : Effect.sync(() => {
        throw new Error("driver crashed");
      });

const program = connect("driver").pipe(
  Effect.catchAllCause((cause) =>
    Effect.gen(function* () {
      if (Cause.isDie(cause)) {
        yield* Effect.logError(Cause.pretty(cause));
      } else {
        yield* Effect.logWarning(JSON.stringify(Cause.failureOption(cause)));
      }
      return Effect.succeed("recovered");
    })
  )
);

Effect.runPromise(program);
```

### Why

Inspecting the cause delivers tailored logging and recovery for each failure mode.

## Implement Graceful Shutdown for Your Application

**Rule:** Combine `runFork` with OS signals to stop services cleanly.

### Example

```typescript
import { Effect, Fiber } from "effect";
import * as http from "node:http";

const server = Effect.gen(function* () {
  const httpServer = http.createServer((_req, res) => {
    res.end("ok");
  });

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      httpServer.close();
      console.log("Server closed");
    })
  );

  yield* Effect.async<void, Error>((resume) => {
    httpServer.listen(3456, () => resume(Effect.succeed(void 0)));
  });

  yield* Effect.log("Server ready");
  yield* Effect.never;
});

const fiber = Effect.runFork(Effect.scoped(server));

process.on("SIGINT", () => {
  Effect.runPromise(Fiber.interrupt(fiber)).then(() => process.exit(0));
});
```

### Why

Interruption triggers finalizers so sockets, pools, and files close predictably.

## Manage Resource Lifecycles with Scope

**Rule:** Use `Effect.scoped` or `Effect.acquireRelease` for deterministic cleanup.

### Example

```typescript
import { Effect } from "effect";

const openFile = Effect.log("File opened").pipe(
  Effect.as({ write: (msg: string) => Effect.log(`Write ${msg}`) })
);
const closeFile = Effect.log("File closed");

const scopedFile = Effect.acquireRelease(openFile, () => closeFile);

const program = Effect.gen(function* () {
  const file = yield* Effect.scoped(scopedFile);
  yield* file.write("hello");
  yield* file.write("world");
});

Effect.runPromise(program);
```

### Why

Acquire and release logic stays adjacent, avoiding leaks when scopes exit early.

## Manage Resources Safely in a Pipeline

**Rule:** Use `Stream.acquireRelease` to guard resources inside streaming flows.

### Example

```typescript
import { Effect, Stream } from "effect";

const open = Effect.log("Stream source opened").pipe(
  Effect.as(["a", "b", "fail", "c"] as const)
);
const close = Effect.log("Stream source closed");

const stream = Stream.acquireRelease(open, () => close).pipe(
  Stream.flatMap(Stream.fromIterable),
  Stream.tap((line) => Effect.log(`Processing ${line}`)),
  Stream.filter((line) => line !== "fail")
);

Effect.runPromise(Stream.runDrain(stream));
```

### Why

Even when the pipeline fails or short circuits, the release handler still runs.

## Manually Manage Lifecycles with Scope

**Rule:** Register finalizers directly on a `Scope` for fine grained control.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.scope((scope) =>
  Effect.gen(function* () {
    yield* Effect.addFinalizerWith(scope, () => Effect.log("Cleanup run"));
    yield* Effect.log("Doing work");
  })
);

Effect.runPromise(program);
```

### Why

Manual scopes allow nested lifetimes that differ from lexical structure.

## Organize Layers into Composable Modules

**Rule:** Group related services into layers and merge them at the app boundary.

### Example

```typescript
import { Effect, Layer } from "effect";

class Logger extends Effect.Service<Logger>()(
  "Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`))
    })
  }
) {}

class UserRepository extends Effect.Service<UserRepository>()(
  "UserRepository",
  {
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding ${id}`);
            return { id, name: `User ${id}` };
          })
      };
    }),
    dependencies: [Logger.Default]
  }
) {}

const AppLayer = Layer.merge(Logger.Default, UserRepository.Default);

const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  yield* Effect.log(JSON.stringify(user));
});

Effect.runPromise(Effect.provide(program, AppLayer));
```

### Why

Composable modules keep feature boundaries explicit and simplify testing.

## Poll for Status Until a Task Completes

**Rule:** Race a polling loop against the main job so completion stops polling.

### Example

```typescript
import { Effect, Schedule } from "effect";

const job = Effect.log("Job complete").pipe(Effect.delay("10 seconds"));

const poll = Effect.log("Polling status").pipe(
  Effect.repeat(Schedule.spaced("2 seconds"))
);

Effect.runPromise(Effect.race(job, poll));
```

### Why

`Effect.race` cancels the poller automatically when the main job finishes.

## Run Background Tasks with Effect.fork

**Rule:** Fork background work and control it using the returned fiber handle.

### Example

```typescript
import { Effect, Fiber } from "effect";

const ticker = Effect.log("tick").pipe(
  Effect.delay("1 second"),
  Effect.forever
);

const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(ticker);
  yield* Effect.sleep("5 seconds");
  yield* Fiber.interrupt(fiber);
});

Effect.runPromise(program);
```

### Why

Forked fibers keep background loops responsive to shutdown signals.

## Teach Your AI Agents Effect with the MCP Server

**Rule:** Start the MCP server with your app layer so tooling has live context.

### Example

```bash
npx @effect/mcp-server --layer src/layers.ts:AppLayer
```

```typescript
import { Effect } from "effect";
import { UserService } from "./features/User/UserService";

const program = Effect.gen(function* () {
  const service = yield* UserService;
  const user = yield* service.getUser("123");
  yield* Effect.log(`Found ${user.name}`);
});
```

### Why

Connecting agents to live layers removes guesswork and improves generated code.

## Understand Fibers as Lightweight Threads

**Rule:** Use fibers for massive concurrency without OS thread overhead.

### Example

```typescript
import { Effect, Fiber } from "effect";

const makeTask = (i: number) =>
  Effect.sleep("1 second").pipe(Effect.as(i));

const program = Effect.gen(function* () {
  const fibers = yield* Effect.forEach(
    Array.from({ length: 1_000 }, (_, i) => makeTask(i)),
    Effect.fork
  );

  const results = yield* Fiber.joinAll(fibers);
  yield* Effect.log(`Completed ${results.length} fibers`);
});

Effect.runPromise(program);
```

### Why

Fibers are cheap to create, schedule, and cancel, enabling extreme concurrency.
