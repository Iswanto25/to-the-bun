# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-08-30

### 🔄 Changed

- **S3 → Bun.S3Client**: Migrasi dari `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` ke `Bun.S3Client` bawaan. Operasi upload, delete, presign, stat, dan list menggunakan API native Bun.
- **Redis → Bun.RedisClient**: Migrasi dari `ioredis` ke `Bun.RedisClient` bawaan. Koneksi, set/get, incr, expire, ttl, dan del menggunakan API native Bun.
- **File IO → Bun.write**: `generateData.ts` menggunakan `Bun.write()` alih-alih `fs.writeFileSync()`. Pattern `import.meta.main` menggantikan `require.main === module`.
- **Infrastructure Test**: Update Redis connectivity test untuk menggunakan `redisState.isAvailable` alih-alih `client.status`.

### 🗑️ Removed

- **@aws-sdk/client-s3**: Dihapus dari dependencies — digantikan `Bun.S3Client`.
- **@aws-sdk/s3-request-presigner**: Dihapus dari dependencies — presign sudah built-in di `Bun.S3Client`.
- **ioredis**: Dihapus dari dependencies — digantikan `Bun.RedisClient`.

### 📝 Note

Fitur yang **belum dimigrasi** ke API Bun bawaan:
- **BullMQ** (queue/worker) → Tidak diganti karena `Bun.cron` hanya untuk scheduled tasks, bukan job queue
- **Bun.Worker** → Tidak diganti karena BullMQ Worker berbeda konsep dengan Bun Worker threads
- **Bun.Archive** → Tidak digunakan di project ini
- **logger.ts** → Masih menggunakan `fs.createWriteStream` untuk kompatibilitas dengan `pino.multistream`

---

## [2.0.1] - 2026-08-30

### 🔄 Changed

- **Bun Upgrade (1.3 → 1.4)**: Runtime diperbarui ke Bun v1.4.0 — Rust rewrite, Node.js 26.3.0 compatibility, lockfile v2, isolasi linker untuk monorepo.
- **Dockerfile**: Base image diubah dari `oven/bun:1-alpine` ke `oven/bun:1.4-alpine` di semua stage (dependencies, build, production).
- **README.md**: Dokumentasi diperbarui — port default, environment variables, struktur direktori, tech stack, dan CI/CD section disesuaikan dengan kondisi project saat ini.

### 🗑️ Removed

- **Unused Dependencies**: `@typescript-eslint/eslint-plugin` dan `@typescript-eslint/parser` dihapus dari devDependencies — redundan dengan `typescript-eslint` v8+ yang sudah bundled parser dan plugin internal.

### ✨ Added

- **Missing Dependency**: `dotenv` ditambahkan ke dependencies — digunakan di `prisma.config.ts` untuk load environment variables.

---

## [2.0.0] - 2026-08-26

### 🔄 Changed

- **Framework — Express.js → ElysiaJS**: Migrasi penuh dari Express.js 5 ke **ElysiaJS** (Bun-native web framework). Express, helmet, compression, multer, dan pino-http dihapus.
- **Server Setup**: `app.ts` dan `dev.ts` menggunakan `app.listen()` alih-alih `http.createServer()` — lebih ringkas dan optimal untuk Bun.
- **Middleware → Elysia Plugins**: Semua middleware Express dikonversi ke Elysia plugin/derive/hook:
    - `requestContext.ts` → `requestContext.plugin.ts` (derive global, reqId + startTime)
    - `authMiddleware.ts` → `auth.plugin.ts` (derive global, verifyToken)
    - `rbacMiddleware.ts` → `rbac.plugin.ts` (beforeHandle hook, `requirePermission`)
    - `rateLimiter.ts` → `rateLimiter.plugin.ts` (beforeHandle hook, Redis-based)
- **Security Headers**: `helmet` dihapus — diganti custom `onRequest` hook yang menambahkan security headers secara manual (CSP, HSTS, X-Frame-Options, dll).
- **File Upload**: `multer` dihapus — menggunakan native `File` API dari Bun. Controller menerima `ctx.body.photo` sebagai `File` langsung.
- **Response Helper**: `respons.ts` ditulis ulang — parameter `req: Request, res: Response` diganti `ctx: ResponsCtx` (Elysia context). Fungsi `validateOrThrow` dan `apiError` dipertahankan.
- **Route Definitions**: Route Express (`Router()`) diganti `new Elysia({ prefix })` dengan `.post()` / `.get()` chaining. Protected routes menggunakan `.use(verifyToken)` sebagai beforeHandle.
- **Controller Pattern**: Parameter controller berubah dari `(req: Request, res: Response)` menjadi `(ctx: any)`. Input diakses via `ctx.body`, `ctx.query`, `ctx.params`, `ctx.headers`. User diakses via `ctx.user`.
- **Build Target**: `--target=bun` (sebelumnya `--target=node`) agar optimal untuk runtime Bun.
- **Password Hashing**: `Bun.password.hash/verify` digunakan langsung dengan bcrypt algorithm. `SALT_ROUNDS` dibatasi 4-31 (Bun requirement).
- **Database Schema (Prisma)**: `prisma db pull` dari live DB — schema menggunakan `Action` enum (bukan `String[]`), field `number` pada module/resource, index berbeda. Tabel `otp` dihapus (OTP disimpan di Redis).

### ✨ Added

- **Elysia Plugins**: File terpisah di `src/plugins/` untuk requestContext, auth, rbac, dan rateLimiter — modular dan reusable.
- **`Bun.file()` / `Bun.write()` Type Declarations**: Didefinisikan di `types/bun.d.ts` untuk kompatibilitas TypeScript.
- **Signature Hook**: `verifyApiKey` diubah dari Express middleware menjadi Elysia beforeHandle hook.

### 🗑️ Removed

- **Express.js**: Framework, `express()` app, `http.createServer()`, Express Router, Express Request/Response types.
- **helmet**: Security headers ditangani via custom onRequest hook.
- **compression**: Tidak digunakan di Elysia (handled by Bun runtime).
- **multer**: File upload menggunakan native `File` API.
- **pino-http**: Logging request ditangani oleh `respons.success`/`respons.error`.
- **multerMiddleware.ts**: Seluruh file dihapus.
- **rateLimiter.ts** (old): Diganti `rateLimiter.plugin.ts`.
- **Otp Repository Methods**: `deactivateOtpsByEmail`, `createOtp`, `findActiveOtp`, `useOtp` dihapus dari auth.repository.ts (dead code — OTP stored in Redis).

### 🔧 Fixed

- **Type Errors**: Seluruh error tipe Express (`Request`, `Response`, `NextFunction`, `Express.Multer.File`) dihapus dan diganti tipe Elysia.
- **Build**: `bun run build` berhasil tanpa error.
- **Typecheck**: `bun run typecheck` (`tsc --noEmit`) berhasil tanpa error.
- **Health Check**: Endpoint `GET /health` berfungsi dengan format response identik.

---

## [1.0.0] - 2026-07-22

### ✨ Added

- **Upload Feature**: Module upload file dengan dedicated `src/features/upload/` — endpoints `POST /api/upload/presigned-url` dan `POST /api/upload/confirm` untuk S3 presigned URL upload flow.
- **Request Context Middleware** (`requestContext.ts`): Request ID generation via `x-request-id` header atau `crypto.randomUUID()`, sensitive data masking untuk field password, token, NIK, dan base64 sebelum logging.
- **Audit Logger** (`auditLogger.ts`): Buffered async writer ke tabel `logs` — antrean 1000 entry, batch write 10 record, timeout 5 detik per write, worker concurrency 10.
- **Multer Middleware** (`multerMiddleware.ts`): Upload foto profil dengan disk storage (`uploads/`), filter format JPEG/PNG/JPG/WEBP, limit 5MB, error handling untuk file size dan tipe tidak diizinkan.
- **Photo Upload via BullMQ**: Upload foto profil diproses asinkron melalui `auth-queue` — base64 file dikirim ke queue, Worker memanggil `uploadBase64`, update profile, dan cleanup file lama di S3.
- **Forgot Password & Reset Password**: Flow forgot password dengan time-limited token di Redis (900s), email notification via `send-forgot-password-email` job. Reset password dengan validasi token + password baru.
- **OTP Flow**: OTP generation & verification — `sendOtp` dan `verifyOtp` endpoint. OTP 6 digit disimpan di Redis (300s), dikirim via `send-otp-email` job.
- **RBAC Middleware** (`rbacMiddleware.ts`): Role-Based Access Control dengan `requirePermission("Module", "ACTION")` — mengecek `req.user.roles` terhadap resource dan granted actions. Role "Superadmin" bypass all checks.
- **Zod Validation**: Validasi skema input untuk semua endpoint auth dan upload — schemas di `auth.validation.ts`, tipe di-infer via `z.infer<>` di `auth.types.ts`.
- **`validateOrThrow` Utility**: Fungsi validasi Zod di `respons.ts`, menggunakan `safeParse()` secara konsisten — throw `apiError` jika validasi gagal.
- **BullMQ Worker Observability**: Event listener `active`, `completed`, `failed`, `error` pada auth worker — mencatat attempt, duration, retry status, dan informasi konteks.
- **SMTP Email Sending** (`smtp.ts`): Nodemailer singleton transport dengan error propagation ke BullMQ agar retry otomatis (3x exponential backoff).
- **Email Templates** (`mail.ts`): Template modular untuk reset password email dan generic OTP email.
- **Database Seeding** (`prisma/seed.ts`): Seeder untuk data awal — 2 role (Superadmin, User), module, resource, permission, 2 user (admin + user biasa).
- **Postman Collection**: `postman_collection.json` dengan 30+ endpoint request, auto-set token via Login endpoint.
- **Jenkins Pipeline** (`Jenkinsfile`): CI/CD otomatis build, test, dan deploy.
- **GitHub Actions CI/CD** (`.github/workflows/deploy-staging.yml`): Pipeline 7 jobs — lint, unit tests, integration tests, build, deploy (SCP + PM2 canary), health check, notify.
- **Docker Support**: `Dockerfile` multi-stage, `docker-compose.yml` (app + DB + Redis + S3), `docker-compose.worker.yml` (standalone worker).
- **Dev Entry** (`src/dev.ts`): Menjalankan API server + BullMQ Worker dalam satu process `bun --watch`.
- **Worker Entry** (`src/worker.ts`): Dedicated worker process untuk production — `bun run worker:start`.
- **Graceful Shutdown**: SIGTERM/SIGINT handler untuk clean shutdown HTTP server + worker.
- **Database Indexes**: Index pada tabel `logs` (date, userId, reqId) untuk performa query audit.
- **API Signature** (`signature.ts`): HMAC-SHA256 verification dengan expiry 5 menit, script `generateApiKey.ts`.

### 🔄 Changed

- **Runtime — Bun Native**: Migrasi penuh dari Node.js + tsx ke **Bun** — dev (`bun --watch src/dev.ts`), build (`bun build src/app.ts --target=node`), test runner (`bun test`).
- **Test Runner — Bun Test**: Dari Jest + `node --test` ke **Bun test runner** native. Semua test menggunakan `mock.module()` dari `bun:test`, `describe`/`it`/`expect` dari Bun.
- **Prisma v7 Upgrade**: Konfigurasi database URL dan seed dipindahkan dari `schema.prisma` ke `prisma.config.ts`. Database URL dibaca via `import "dotenv/config"`.
- **Build — Dual Entrypoint**: Build script menghasilkan `dist/app.js` dan `dist/worker.js` dalam satu perintah `bun build`.
- **Build Target**: `--target=node` agar kompatibel dengan Pino thread-stream di berbagai environment.
- **Centralized Logging**: `pino-http` middleware dihapus — logging request sepenuhnya ditangani oleh `respons.success`/`respons.error` termasuk audit log ke tabel `logs`.
- **API Route Prefix**: Semua endpoint tanpa prefix `/v1` — langsung `/api/auth/*`, `/api/upload/*`.
- **Import Path Alias**: Semua import dari relative path (`../../../utils/`) ke alias `@/` (`@/utils/...`).
- **Response Format**: Field `status` dihapus dari body respons (status tetap di HTTP header).
- **ID Generation**: Menggunakan `crypto.randomUUID()` secara eksplisit, tidak mengandalkan default database.
- **Password Hashing**: Eksklusif menggunakan `Bun.password` — semua fallback bcrypt dihapus.
- **Auth Module Architecture**: Modernisasi struktur — file dipisah ke `controllers/`, `services/`, `repositories/`, `validations/`, `types/`, `jobs/`.
- **Controllers Refactor**: Semua `try-catch` dihapus dari controllers. Validasi manual diganti `validateOrThrow()`. Error handling via global handler.
- **Error Handler**: Global error handler menerjemahkan pesan error Inggris ke Bahasa Indonesia secara otomatis. Menyembunyikan stack trace di production.
- **Auth Security**: Refresh token tidak lagi disimpan di database — hanya di Redis. Multi-device login support.
- **NIK Encryption**: AES-256-GCM untuk enkripsi field NIK dengan decrypt via `decryptSensitive`.
- **Logger**: Pino multistream (console + file harian di `logger/`), base64 truncation, sensitive field masking.
- **Audit Log via Queue**: Log disimpan ke tabel `logs` via queue-based buffer (1000 entry, batch 10, timeout 5s).
- **Response Messages**: Semua pesan user-facing dalam Bahasa Indonesia (`"Berhasil login"`, `"Email sudah terdaftar"`).

### 🔧 Fixed

- **ESLint Error**: Variabel `isDevelopment` tidak terpakai di `src/configs/database.ts`.
- **Integration Test**: Rewrite menggunakan `mock.module()` dan dynamic import — 8/8 test passing di Bun.
- **Auth Controller Spec**: Mock `@/utils/respons.js`, ganti `mockRejectedValue` ke `mockImplementation` (Bun tidak support rejected), tambah `beforeEach` cleanup — 16/16 passing.
- **Mock Request Helper**: Tambah field `get()`, `protocol`, `path`, `method`, `socket` yang dibutuhkan `respons.ts`.

### 🗑️ Removed

- **Jest**: Seluruh testing framework, config (`jest.config.cjs`, `jest.setup.cjs`), dan dependency Jest.
- **pino-http**: Dependency dan middleware logging HTTP.
- **dotenv fallback**: Semua pemanggilan `dotenv.config()` manual — digantikan `import "dotenv/config"` di entry point.
- **Bulk Register**: Endpoint, controller, service, repository, test, report utility (`bulkRegisterReport.ts`) — fitur dihapus total.
- **Unused Dependencies**: `uuid`, `nanoid`, `@aws-sdk/node-http-handler`, `p-limit`.
