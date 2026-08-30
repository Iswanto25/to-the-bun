# Bun + ElysiaJS Boilerplate

Boilerplate production-ready untuk REST API menggunakan **ElysiaJS**, TypeScript, dan Prisma, berjalan sepenuhnya di **Bun**. Arsitektur modular, scalable, dengan RBAC, JWT auth, background jobs (BullMQ), S3 upload, dan structured logging.

> **Dibangun dengan AI Agent:**
>
> - [Command Code](https://commandcode.ai/) + DeepSeek V4 Pro
> - [Gemini CLI](https://github.com/google-gemini/gemini-cli) + Gemini Pro 3.5
> - [GPT Codex](https://openai.com/index/introducing-codex/) + GPT-5 Pro
> - [Antygrafity](https://antygrafity.ai/) — Multi Model
> - [Google Jules](https://github.com/google/jules) + Google Gemini 3 Pro

## Filosofi Arsitektur

### 1. Modular Feature-based Architecture

Setiap fitur (misal: `auth`) memiliki ekosistem sendiri: controller, service, repository, validation, dan jobs.

- **Manfaat**: Navigasi mudah saat proyek membesar, fitur bisa ditambah/hapus secara terisolasi.

### 2. Separation of Concerns (SoC) dengan Repository Pattern

- **Controllers**: Request/response dan validasi skema (Zod). Tidak ada try-catch — error propagate ke global handler.
- **Services**: Business logic dan aturan bisnis.
- **Repositories**: Satu-satunya lapisan yang berinteraksi dengan Database (Prisma).
- **Jobs**: Tugas berat asinkron (BullMQ) agar API tetap responsif.

### 3. Graceful Degradation & Resilience

- **Optional Services**: Redis, S3, SMTP — jika tidak tersedia, aplikasi tetap berjalan dengan fallback + warning log.
- **Background Jobs**: BullMQ dengan auto-retry (3x exponential backoff).

### 4. Developer Experience & Performance

- **Bun Native**: Test runner, package manager, dan build tool terintegrasi.
- **ElysiaJS**: Web framework yang dirancang khusus untuk Bun — performa optimal.
- **Type-Safety**: TypeScript + Zod memastikan error terdeteksi saat development.

---

## Fitur Utama

| Layer       | Tech                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Runtime     | **Bun** (v1.x)                                                       |
| Framework   | **ElysiaJS** (Bun-native)                                            |
| Language    | TypeScript (ESM, bundler)                                            |
| ORM         | Prisma v7 + PostgreSQL (pg Pool adapter) + Seed di prisma.config.ts  |
| Cache/Queue | Redis (ioredis) + BullMQ                                             |
| Auth        | JWT (access 15m, refresh 7d) + token store in Redis                  |
| Storage     | MinIO/S3 via @aws-sdk                                                |
| Logger      | Pino (centralized via response helper, pino-http removed)            |
| Test        | **Bun test runner** (`bun test`)                                     |
| Container   | Docker multi-stage                                                   |

- **RBAC** granular: Module → Resource → Action-based permissions. Role "Superadmin" bypass semua check.
- **Security**: Zod validation, custom security headers, CORS, rate limiting (Redis), HMAC-SHA256 API signature, AES-256-GCM NIK encryption.
- **Upload**: File via BullMQ jobs (base64), S3 presigned URL, `Bun.file()` native.
- **Password**: `Bun.password.hash/verify` dengan bcrypt, configurable salt rounds.

## Struktur Proyek

```
src/
├── app.ts                          # API server entry point
├── dev.ts                          # Dev entry — server + worker combined
├── worker.ts                       # BullMQ worker entry point
├── configs/
│   ├── elysia.ts                   # Elysia app setup (security headers, cors, routes, error handler)
│   ├── database.ts                 # Prisma client
│   ├── redis.ts                    # Redis client (graceful degradation)
│   └── bull.ts                     # BullMQ connection
├── features/
│   ├── auth/
│   │   ├── controllers/            # HTTP request handlers
│   │   ├── services/               # Business logic
│   │   ├── repositories/           # Prisma data access (transaction-aware)
│   │   ├── validations/            # Zod schemas
│   │   ├── types/                  # Zod-inferred types
│   │   ├── jobs/                   # BullMQ queue, worker, job processor
│   │   └── auth.routes.ts          # Elysia route definitions
│   └── upload/                     # File upload (presigned URL)
│       ├── controllers/            # HTTP request handlers
│       ├── services/               # Business logic
│       ├── validations/            # Zod schemas
│       ├── types/                  # Zod-inferred types
│       └── upload.routes.ts        # Elysia route definitions
├── plugins/
│   ├── requestContext.plugin.ts    # Request ID, sensitive data masking
│   ├── auth.plugin.ts              # JWT verification + user loading
│   ├── rbac.plugin.ts              # Permission check (beforeHandle hook)
│   └── rateLimiter.plugin.ts       # Redis-based rate limiter
├── routes/
│   └── index.ts                    # Elysia route aggregator
└── utils/
    ├── auditLogger.ts              # Audit log DB writer (buffered)
    ├── encryption.ts               # AES-256-GCM encrypt/decrypt
    ├── generateData.ts             # Faker-based data generator
    ├── healthCheck.ts              # Service health check reporter
    ├── jwt.ts                      # JWT sign/verify helpers
    ├── logger.ts                   # Pino logger setup
    ├── mail.ts                     # HTML email templates
    ├── pagination.ts               # Pagination helper
    ├── respons.ts                  # respons.success/error + apiError class
    ├── s3.ts                       # S3/MinIO helpers
    ├── signature.ts                # HMAC-SHA256 API key verification
    ├── smtp.ts                     # Nodemailer SMTP sender
    ├── tokenStore.ts               # Redis token CRUD
    └── utils.ts                    # Password hashing, email/phone validation, OTP, pLimit
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.4+
- PostgreSQL
- Redis (untuk BullMQ & caching)

### Installation

```bash
git clone git@github.com:Iswanto25/boilerplate-bun-elysia.git
cd boilerplate-bun-elysia
bun install
cp .env.example .env
```

**Required Variables:**

```env
NODE_ENV=development
PORT=3006
HOST=0.0.0.0
DATABASE_URL="your-database-connection-string"
DATA_ENCRYPTION_KEY="your-64-char-hex-key"
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
SALT_HASH="your-custom-salt-string"
SALT_ROUNDS=5
```

**Optional Services:**

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# S3 Storage
S3_ENDPOINT=localhost
S3_PORT=9000
S3_BUCKET_NAME=uploads
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
STORAGE_PUBLIC_URL=https://your-storage-url.com
S3_USE_SSL=false
S3_REGION=us-east-1

# SMTP
APP_NAME=Boilerplate ElysiaJS
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# API Signature (HMAC-SHA256)
USER_KEY=superSecret
SECRET_KEY=secretKey
```

### Setup Database

```bash
bunx prisma generate
bunx prisma migrate dev
bunx prisma db seed
```

### Menjalankan

**Development** (server + worker dalam satu process):

```bash
bun run dev
```

**Production** (server dan worker terpisah):

```bash
# API Server
bun run build
bun run start

# Worker (terpisah)
bun run worker:start
```

Server berjalan di `http://localhost:3006` (configurable via `PORT` env).

## Available Scripts

| Script                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `bun run dev`           | Start development server + worker (hot-reload) |
| `bun run worker:dev`    | Start worker saja (hot-reload)                 |
| `bun run build`         | Bundle app.js + worker.js                      |
| `bun run start`         | Run production server                          |
| `bun run worker:start`  | Run production worker                          |
| `bun run start:migrate` | Migrate + start server                         |
| `bun run lint`          | Check linting (ESLint)                         |
| `bun run lint:fix`      | Fix linting                                    |
| `bun run typecheck`     | Type check (tsc --noEmit)                      |
| `bun test`              | Run all test suite                             |
| `bun run test:unit`     | Run unit tests only                            |
| `bun run test:integration` | Run integration tests                       |
| `bun run test:infra`    | Run infrastructure tests                       |
| `bun run generate-api-key` | Generate HMAC-SHA256 API key                |

## API Endpoints

### Health Check

```http
GET /health
```

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2026-08-30 12:00:00",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

### Authentication

| Method   | Endpoint                         | Description                                 |
| -------- | -------------------------------- | ------------------------------------------- |
| `POST`   | `/api/auth/register`             | Register user baru                          |
| `POST`   | `/api/auth/login`                | Login, mengembalikan access + refresh token |
| `POST`   | `/api/auth/refresh-token`        | Refresh access token                        |
| `POST`   | `/api/auth/logout`               | Logout user                                 |
| `GET`    | `/api/auth/profile`              | Get profil user                             |
| `GET`    | `/api/auth/users`                | Get semua user (pagination + search)        |
| `PATCH`  | `/api/auth/profile`              | Update profil                               |
| `PATCH`  | `/api/auth/profile/photo`        | Upload foto profil (multipart)              |
| `PATCH`  | `/api/auth/profile/photo/direct` | Upload foto via presigned URL               |
| `DELETE` | `/api/auth/profile/:id`          | Hapus akun                                  |
| `POST`   | `/api/auth/forgot-password`      | Kirim email reset password                  |
| `POST`   | `/api/auth/reset-password`       | Reset password dengan token                 |
| `POST`   | `/api/auth/send-otp`             | Kirim OTP ke email                          |
| `POST`   | `/api/auth/verify-otp`           | Verifikasi OTP                              |

### Upload (requires S3)

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| `POST` | `/api/upload/presigned-url` | Generate presigned URL |
| `POST` | `/api/upload/confirm`       | Konfirmasi upload      |

## Route Pattern

```typescript
import { Elysia } from "elysia";
import { authController } from "./controllers/auth.controller.js";
import { verifyToken } from "../../plugins/auth.plugin.js";
import { rateLimiter } from "../../plugins/rateLimiter.plugin.js";

const publicRoutes = new Elysia()
  .post("/register", authController.register)
  .post("/login", authController.login);

const protectedRoutes = new Elysia({ name: "auth-protected" })
  .use(verifyToken)
  .get("/profile", authController.profile, {
    beforeHandle: [rateLimiter({ windowInSeconds: 30, maxRequests: 3, useUserId: true })],
  });

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(publicRoutes)
  .use(protectedRoutes);
```

## Controller Pattern

```typescript
export const authController = {
  register: async (ctx: any) => {
    const data = validateOrThrow(authValidation.register, ctx.body);
    const result = await authServices.register(data);
    return respons.success("Berhasil register", result, HttpStatus.OK, ctx);
  },

  profile: async (ctx: any) => {
    const result = await authServices.profile(ctx.user.id);
    return respons.success("Berhasil get profile", result, HttpStatus.OK, ctx);
  },
};
```

- Tidak ada try-catch — error throw ke global handler via `apiError`.
- Input dari `ctx.body`, `ctx.query`, `ctx.params`. User dari `ctx.user`.

## Plugin System

### Request Context (derive global)

```typescript
export const requestContext = new Elysia({ name: "request-context" })
  .derive({ as: "global" }, ({ request }) => ({
    reqId: request.headers.get("x-request-id") || crypto.randomUUID(),
    startTime: Date.now(),
  }));
```

### Auth (derive global)

```typescript
export const verifyToken = new Elysia({ name: "auth" })
  .derive({ as: "global" }, async ({ headers, set }) => {
    // Verify JWT, load user from Redis/DB, attach to ctx.user
  });
```

### RBAC (beforeHandle hook)

```typescript
export const requirePermission = (resourceName: string, action: string) => {
  return async (ctx: any) => {
    // Check ctx.user.roleId against RolePermission + Resource
  };
};
```

### Rate Limiter (beforeHandle hook)

```typescript
export const rateLimiter = (options: { windowInSeconds: number; maxRequests: number; useUserId?: boolean }) => {
  return async (ctx: any) => {
    // Redis-based sliding window, graceful degradation if Redis unavailable
  };
};
```

## Security Features

- **Custom Security Headers** — via Elysia onRequest hook (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, dll)
- **CORS** — configurable via environment
- **Rate Limiting** — Redis-based sliding window (optional, graceful degradation)
- **JWT Authentication** — access token (15m) + refresh token (7d) with Redis token store
- **RBAC** — granular permission per module/resource/action
- **Input Validation** — Zod schemas with `validateOrThrow()`
- **Password Hashing** — `Bun.password.hash/verify` with configurable bcrypt salt rounds
- **NIK Encryption** — AES-256-GCM for sensitive data
- **API Signature** — HMAC-SHA256 with expiry
- **Error Handling** — secure error responses, no stack traces in production

## Testing

```bash
# All tests
bun test

# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# Infrastructure tests
bun run test:infra
```

## Tech Stack

### Core

- **bun** (v1.x) — Runtime & package manager
- **elysia** (v1.4.x) — Web framework (Bun-native)
- **@elysiajs/cors** (v1.4.x) — CORS handling
- **typescript** (v5.9.x) — Type safety
- **@prisma/client** (v7.x) — Database ORM (pg Pool adapter)
- **zod** (v4.x) — Schema validation
- **bullmq** (v5.x) — Background jobs
- **ioredis** (v5.x) — Redis client
- **jsonwebtoken** (v9.x) — JWT authentication

### File Handling

- **@aws-sdk/client-s3** (v3.x) — S3 integration
- **@aws-sdk/s3-request-presigner** (v3.x) — S3 presigned URLs

### Utilities

- **pino** (v10.x) — Logging
- **nodemailer** (v7.x) — Email sending
- **dotenv** (v17.x) — Environment variables
- **@faker-js/faker** (v8.x) — Fake data generation

### Development & Testing

- **bun test** — Native fast testing
- **eslint** (v9.x) — Linting
- **prettier** — Code formatting
- **typescript-eslint** — TypeScript ESLint integration

## CI/CD

### GitHub Actions (Staging Deploy)

Push ke branch `staging` memicu pipeline multi-job:

1. **Notify Start** — Telegram notification
2. **Analyze** — Checkout → Install → Prisma Generate → Lint → Type Check → Unit Tests
3. **Build** — Compile TypeScript → Upload artifacts
4. **Transfer** — SCP artifacts ke server
5. **Pre-Deploy** — Install deps → Run migrations di server
6. **Deploy** — PM2 reload (zero downtime)
7. **Health Check** — Verify application health
8. **Notify** — Telegram notification (success/failure)

### Jenkins Pipeline

Pipeline lengkap dengan stage: Setup → Verify (Lint, TypeCheck, Unit Test, Integration Test parallel) → Build → Deploy → Health Check → Cleanup → Notify.

## License

ISC License — Created by [Iswanto25](https://github.com/Iswanto25)
