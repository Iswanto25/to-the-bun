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

| Layer | Tech |
|---|---|
| Runtime | **Bun** (v1.x) |
| Framework | **ElysiaJS** (Bun-native) |
| Language | TypeScript (ESM, bundler) |
| ORM | Prisma v7 + PostgreSQL |
| Cache/Queue | Redis (ioredis) + BullMQ |
| Auth | JWT (access 1d, refresh 7d) + Redis token store |
| Storage | MinIO/S3 via @aws-sdk |
| Logger | Pino (via response helper) |
| Test | Bun test runner (`bun test`) |
| Container | Docker multi-stage |

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
├── middlewares/                     # (removed — replaced by plugins)
├── plugins/
│   ├── requestContext.plugin.ts    # Request ID, sensitive data masking
│   ├── auth.plugin.ts              # JWT verification + user loading
│   ├── rbac.plugin.ts              # Permission check (beforeHandle hook)
│   └── rateLimiter.plugin.ts       # Redis-based rate limiter
├── routes/
│   └── index.ts                    # Elysia route aggregator
└── utils/
    ├── encryption.ts               # AES-256-GCM encrypt/decrypt
    ├── jwt.ts                      # JWT sign/verify helpers
    ├── logger.ts                   # Pino logger setup
    ├── mail.ts                     # HTML email templates
    ├── pagination.ts               # Pagination helper
    ├── respons.ts                  # respons.success/error + apiError class
    ├── s3.ts                       # S3/MinIO helpers
    ├── signature.ts                # HMAC-SHA256 API key verification
    ├── smtp.ts                     # Nodemailer SMTP sender
    ├── tokenStore.ts               # Redis token CRUD
    ├── auditLogger.ts              # Audit log DB writer (buffered)
    └── utils.ts                    # Password hashing, validation, OTP, pLimit
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.1+
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
PORT=4004
HOST=localhost
DATABASE_URL="your-database-connection-string"
DATA_ENCRYPTION_KEY="your-32-character-hex-key"
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
SALT_ROUNDS=10  # bcrypt salt rounds (4-31)
```

**Optional Services:**

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# S3 Storage
S3_ENDPOINT=localhost:9000
S3_BUCKET_NAME=your-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
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

Server berjalan di `http://localhost:4004`.

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start development server + worker (hot-reload) |
| `bun run worker:dev` | Start worker saja (hot-reload) |
| `bun run build` | Bundle app.js + worker.js |
| `bun run start` | Run production server |
| `bun run worker:start` | Run production worker |
| `bun run start:migrate` | Migrate + start server |
| `bun test` | Run test suite |
| `bun run lint` | Check linting |
| `bun run lint:fix` | Fix linting |

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
    "timestamp": "2026-08-26 21:13:45",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register user baru |
| `POST` | `/api/auth/login` | Login, mengembalikan access + refresh token |
| `POST` | `/api/auth/refresh-token` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout user |
| `GET` | `/api/auth/profile` | Get profil user |
| `GET` | `/api/auth/users` | Get semua user (pagination + search) |
| `PATCH` | `/api/auth/profile` | Update profil |
| `PATCH` | `/api/auth/profile/photo` | Upload foto profil (multipart) |
| `PATCH` | `/api/auth/profile/photo/direct` | Upload foto via presigned URL |
| `DELETE` | `/api/auth/profile/:id` | Hapus akun |
| `POST` | `/api/auth/forgot-password` | Kirim email reset password |
| `POST` | `/api/auth/reset-password` | Reset password dengan token |
| `POST` | `/api/auth/send-otp` | Kirim OTP ke email |
| `POST` | `/api/auth/verify-otp` | Verifikasi OTP |

### Upload (requires S3)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload/presigned-url` | Generate presigned URL |
| `POST` | `/api/upload/confirm` | Konfirmasi upload |

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
- **JWT Authentication** — access token (1d) + refresh token (7d) with Redis token store
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

# Integration tests
bun run test:integration

# Infrastructure tests
bun run test:infra
```

## Tech Stack

### Core

- **bun** (v1.x) — Runtime & package manager
- **elysia** (v1.4.x) — Web framework (Bun-native)
- **typescript** (v5.9.x) — Type safety
- **@prisma/client** (v7.x) — Database ORM
- **zod** (v4.x) — Schema validation
- **bullmq** (v5.x) — Background jobs
- **ioredis** (v5.x) — Redis client
- **jsonwebtoken** (v9.x) — JWT authentication

### Security

- **@elysiajs/cors** — CORS handling

### File Handling

- **@aws-sdk/client-s3** (v3.x) — S3 integration

### Utilities

- **pino** (v10.x) — Logging
- **nodemailer** (v7.x) — Email sending
- **dotenv** (v17.x) — Environment variables

### Development & Testing

- **bun test** — Native fast testing
- **eslint** (v9.x) — Linting
- **prettier** — Code formatting

## CI/CD

### GitHub Actions Staging Deploy

Push ke branch `staging` memicu pipeline 7 jobs:

1. **Lint** — ESLint check
2. **Unit Tests** — Utils, plugins, auth services & controllers
3. **Integration Tests** — Auth API HTTP tests
4. **Build** — Bundle via Bun
5. **Deploy** — SCP + PM2 canary deploy
6. **Health Check** — SSH curl `localhost:4004/health`
7. **Notify** — Deployment summary

## License

ISC License — Created by [Iswanto25](https://github.com/Iswanto25)
