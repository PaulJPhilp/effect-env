# Gemini Code Assistant Context

This document provides context for the Gemini code assistant to understand the `effect-env` project.

## Project Overview

`effect-env` is a TypeScript library designed for managing environment variables in applications built with the `effect` library. It provides type safety, schema validation, and security features for handling environment-specific configurations.

- **Main Technologies:** TypeScript, Effect
- **Testing Framework:** Vitest
- **Package Manager:** npm

The library allows developers to define a schema for their environment variables using `@effect/schema`. It then provides an `Env` service that can be used to access these variables in a type-safe manner. The library supports loading environment variables from `process.env`, `.env` files, or in-memory records for testing.

Key features include:
- **Schema-based validation:** Ensures that environment variables conform to a predefined structure and type.
- **Typed accessors:** Provides methods to get, require, and parse environment variables into specific types (e.g., `number`, `boolean`, `json`).
- **Secret redaction:** Includes a `redact` utility to prevent sensitive information like API keys and passwords from being logged.
- **Testability:** Offers a `fromRecord` layer to create isolated environments for unit and integration tests.

## Building and Running

### Key Commands

The following commands are available in `package.json`:

- **Build the project:**
  ```bash
  npm run build
  ```
  This command compiles the TypeScript source code into JavaScript in the `dist` directory.

- **Run tests:**
  ```bash
  npm test
  ```
  This command executes the test suite using Vitest.

- **Type-check the code:**
  ```bash
  npm run typecheck
  ```
  This command runs the TypeScript compiler in no-emit mode to check for type errors.

- **Clean the `dist` directory:**
  ```bash
  npm run clean
  ```

- **Run the main entry point (after building):**
  ```bash
  npm start
  ```

## Development Conventions

- **Coding Style:** The project uses TypeScript and follows standard formatting and style conventions.
- **Testing:** Tests are written with Vitest and are located in the `test` directory. The tests cover the core functionalities of the library, including layers, redaction, service methods, and validation.
- **Contribution:** Before submitting a pull request, contributors should run `npm test` and `npm run typecheck` to ensure that the code is correct and passes all checks.
