---
name: express-boilerplate
description: Standard patterns and conventions for Express.js + TypeScript + BullMQ + Prisma boilerplate. Use this skill for every coding task in this project.
version: 1.0.0
---

## Feature Structure

```
src/features/<name>/
├── controllers/       # Controller: validate input + call service + response
├── services/          # Service: business logic, throw apiError
├── repositories/      # Repository: database access via Prisma, transaction-aware
├── validations/       # Zod schema
├── types/             # Type inference from Zod
├── <name>.routes.ts   # Route definition
└── jobs/              # Background jobs (queue + worker + job logic)
```

## Import Rules

1. NPM packages at the top, `@/` aliases below.
2. Always use `.js` extension even when importing `.ts` files.
3. Named exports are dominant (avoid default exports except for Prisma).

## Data Flow

```
Controller → Service → Repository
     ↓                     ↑
  Zod.safeParse()     Prisma transaction
     ↓
  respons.success() / respons.error()
```

## Error Handling

- Throw `new apiError(400, "message")` in services.
- Catch in controllers, translate to Indonesian response messages.
- Never use try/catch in services.

## Validation

- Always use `.safeParse()` instead of `.parse()`.
- Retrieve errors from `validation.error.issues[0].message`.

## Response Format

```ts
respons.success("Success message", data, HttpStatus.OK, res, req);
respons.error("Error message", "Detail", HttpStatus.BAD_REQUEST, res, req);
```

## Database

- Repository methods must always accept `tx: TxClient = prisma`.
- Use `authRepository.transaction()` for multi-table transactions.
- Prisma v7 uses `prisma.config.ts` for connection URL and seeding configuration.
- Avoid enabling query logging (`emit: "query"`) on PrismaClient to keep the terminal output clean.

## Queue / Worker

- Queue, Job, and Worker are consolidated inside `{name}.jobs.ts` in the `jobs/` folder of each feature module.
- The worker processes jobs centrally using a switch/case block matching job names.
- Job logic can call utility helpers or service methods; avoid embedding long raw logic directly in the worker.

## Code Style

- Use `const` all the way (no `let`).
- Use `async/await`, avoid `.then()`.
- Object literal pattern: `export const authServices = {...}`.
- UPPER_SNAKE_CASE for constants.
- camelCase for functions and variables.
- Do not use regular expressions for string parsing (ReDoS-safe).

## Logging

- Pino: `logger.info()`, `logger.error({ err }, "msg")`.
- `pino-http` middleware is not used; request logs are automatically handled via `respons.success()` / `respons.error()` wrappers.
- The first argument must always be an object for errors.
- Do not log passwords or tokens.

## Testing

- Arrange-Act-Assert.
- `__tests__/helpers/` for mock & faker setups.
- Co-located specs: `*.spec.ts` next to the source files.
- Bun test for all testing levels (unit, middleware, integration, and infrastructure).
