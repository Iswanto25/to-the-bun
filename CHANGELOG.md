# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [2.4.0] - 2026-06-02

### ✨ Added

- **GitHub Actions CI/CD**: Workflow deploy staging (`.github/workflows/deploy-staging.yml`) dengan 7 jobs: lint → unit tests → integration tests → build → deploy → health-check → notify
- **PM2 ecosystem config** (`ecosystem.config.cjs`): Konfigurasi 2 proses — `boilerplate-backend` (port 4004) dan `boilerplate-worker` — menggunakan Bun interpreter

### 🔄 Changed

- **Build script**: Sekarang build kedua entry point (`src/app.ts` + `src/worker.ts`) dalam satu perintah
- **Build target**: `--target=bun` → `--target=node` untuk memperbaiki resolusi path `thread-stream` pino di mesin berbeda

### 🔧 Fixed

- **ESLint error**: Menghapus variabel `isDevelopment` yang tidak digunakan di `src/configs/database.ts`
- **Integration test** (`__tests__/integration/auth.api.test.ts`): Rewrite menggunakan dynamic import dan `mock.module` yang kompatibel dengan Bun test runner — 8/8 test passing
- **Auth controller spec** (`auth.controller.spec.ts`): Menambahkan mock `@/utils/respons.js`, mengganti `mockRejectedValue` → `mockImplementation` (tidak didukung Bun), menambahkan `beforeEach` cleanup — 16/16 test passing
- **Mock request helper** (`__tests__/helpers/mock.helper.ts`): Menambahkan field `get()`, `protocol`, `path`, `method`, `socket` yang dibutuhkan `respons.ts`

---

## [Unreleased]

## [2.3.0] - 2026-06-01

### ✨ Added

- **Postman Collection**: Menambahkan `postman_collection.json` dengan 30+ endpoint request untuk memudahkan pengujian dan dokumentasi API.
- **Database Seeding**: Implementasi script seeding (`prisma/seed.ts`) yang otomatis membuat data awal: 2 role (Superadmin, User), 2 module, 2 resource, permission, dan 2 user (admin, user biasa).
- **Jenkins Pipeline**: Menambahkan `Jenkinsfile` untuk CI/CD otomatis build, test, dan deploy aplikasi backend.
- **Dev Entry Point**: File `src/dev.ts` menjalankan API server dan BullMQ worker dalam satu command `bun run dev`.
- **Docker Compose Worker**: `docker-compose.worker.yml` untuk menjalankan worker BullMQ secara terpisah di production.
- **Bun-Native Test Runner**: Migrasi penuh dari Jest ke `bun:test` — semua test file menggunakan `mock.module()`, `describe`, `it`, `expect` dari Bun.
- **Test Environment Script**: `scripts/prepare-test-env.ts` menggantikan `prepare-test-env.cjs` menggunakan `Bun.spawnSync`.
- **Role naming convention**: Update konvensi penamaan role menjadi lebih konsisten dengan pola RBAC.

### 🔄 Changed

- **Centralized Logging**: `pino-http` middleware dihapus dari Express — logging request sekarang sepenuhnya ditangani oleh `respons.success` dan `respons.error` termasuk pencatatan ke tabel `logs`.
- **Bun-Native Runtime**: Semua fallback Node.js (`bcrypt`, `crypto` dinamis) dihapus — password hashing dan API key generation sekarang eksklusif menggunakan `Bun.password` dan `Bun.CryptoHasher`.
- **Prisma Config**: `prisma.config.ts` menggunakan `import "dotenv/config"` alih-alih `dotenv.config()` manual, dan menambahkan konfigurasi seed path.
- **API Signature Disederhanakan**: `generateApiKey` dan `verifyApiKey` tidak lagi menyertakan `method`, `url`, dan `body hash` dalam signature HMAC — hanya `userKey:timestamp`.
- **Logger Refactor**: Logger tidak lagi membuat direktori secara manual (`fs.mkdirSync`) — menggunakan opsi `mkdir: true` bawaan pino. Menambahkan `getLogLevel()` helper.
- **Prisma Query Logging Dinonaktifkan**: Log query di environment development dihapus untuk mengurangi noise di console.
- **Test Helpers**: Semua mock helper (`mock.helper.ts`) dimigrasi dari `jest.fn()` ke `mock()` dari `bun:test`. `flushPromises` menggunakan `setTimeout` alih-alih `setImmediate`.
- **Faker Password**: Password fake di `faker.helper.ts` sekarang selalu valid terhadap Zod schema (mengandung huruf besar, angka, dan karakter spesial).

### 🗑️ Removed

- **pino-http**: Dependency dan middleware logging HTTP dihapus — logging dilakukan terpusat melalui `respons.ts`.
- **Jest**: Seluruh Jest testing framework dan config (`jest.config.cjs`, `jest.setup.cjs`) dihapus — digantikan `bun:test`.
- **`src/utils/bulkRegisterReport.ts`**: Utilitas laporan performa bulk register dihapus (fitur bulk register sudah dihapus di v2.0.0).
- **`src/utils/existingUsers.ts`**: Utilitas pengecekan email existing dihapus — logika sudah dipindahkan ke auth repository.
- **`src/middlewares/multerMiddleware.ts`**: Middleware upload file dihapus karena upload sekarang ditangani via base64 dan S3 utility langsung.
- **`dotenv` fallback**: Semua pemanggilan `dotenv.config()` manual dihapus, digantikan `import "dotenv/config"` di entry point.

### 🔧 Fixed

- **Prisma Generate Fix**: `prisma generate` di `prepare-test-env.ts` sekarang menggunakan `Bun.spawnSync` alih-alih `Bun.spawn` async.
- **Password mock** di integration test: password hashing test sekarang menggunakan `Bun.password.hash` langsung untuk konsistensi dengan utility asli.

---

## [2.2.0] - 2026-05-20

### ✨ Added

- **RBAC (Role-Based Access Control)**: Implementasi sistem otorisasi berbasis role, module, resource, dan permission yang mendalam.
- **Background Jobs**: Integrasi **BullMQ** untuk pemrosesan tugas asinkron di latar belakang (e.g. file processing, emails).
- **Dedicated Worker**: Penambahan proses worker terpisah (`src/worker.ts`) untuk menangani antrian job.
- **Zod Validation**: Migrasi sistem validasi input menggunakan **Zod** untuk type-safety yang lebih baik dan skema yang lebih deklaratif.
- **Database Logging**: Skema database sekarang mencakup tabel `logs` untuk audit trail dan monitoring aktivitas aplikasi.
- **Bun-Native Runtime**: Optimalisasi penuh untuk **Bun**, menggunakan script `bun` untuk development, testing, dan execution.

### 🔄 Changed

- **Schema Update**: Penambahan relasi kompleks antara User, Role, Module, dan Permissions pada `schema.prisma`.
- **Validation Refactor**: Refaktorisasi `auth.validation.ts` menggunakan Zod schemas.
- **Logger Enhancement**: Peningkatan integrasi pino-http untuk logging request yang lebih detail.

---

## [2.1.0] - 2026-03-24

### ✨ Added

- **Multi-device Support**: Perbaikan manajemen refresh token yang memungkinkan user login di banyak perangkat sekaligus.
- **Native Concurrency**: Implementasi `pLimit` secara native di `utils.ts` untuk menggantikan dependency `p-limit`.

### 🔄 Changed

- **Storage Refactor**: Semua operasi "get" file kini menggunakan URL publik langsung (`urlStorage`) melalui fungsi utilitas `getPublicUrl` di `s3.ts`.
- **Response Standardization**: Field `status` dihapus dari body respons sukses untuk menyederhanakan data (status tetap ada di HTTP header).
- **NIK Encryption**: Peningkatan penanganan enkripsi NIK menggunakan AES-256-GCM.
- **Service Refactor**: Memindahkan semua logika query Prisma dari `authServices.ts` ke `authRepository.ts` untuk meningkatkan separasi perhatian (separation of concerns).
- **ID Generation**: Menggunakan `crypto.randomUUID()` secara eksplisit di backend untuk pembuatan ID yang konsisten dan aman, tanpa mengandalkan default database.
- **Dependency Cleanup**: Menghapus library yang tidak digunakan lagi seperti `uuid`, `nanoid`, dan `@aws-sdk/node-http-handler` untuk mengoptimalkan ukuran proyek dan performa.

### 🔧 Fixed

- **Base64 Upload**: Perbaikan validasi dan penanganan error pada upload file dalam format base64.

## [2.0.0] - 2026-03-08

### ⚡ Breaking Changes

- **Prisma upgrade ke v7**: Upgrade `prisma`, `@prisma/client`, dan `@prisma/adapter-pg` dari v6 ke **v7.4.2**
    - `url` di `datasource` block pada `schema.prisma` tidak lagi didukung di Prisma v7 — konfigurasi koneksi database sepenuhnya dipindahkan ke `prisma.config.ts`
- **API route prefix diubah**: Semua endpoint tidak lagi menggunakan prefix `/v1`
    - `POST /api/v1/auth/*` → `POST /api/auth/*`
    - `POST /api/v1/files/*` → `POST /api/files/*`

### 🗑️ Removed

- **Bulk Register** fitur dihapus:
    - `POST /api/auth/bulk-register` endpoint dihapus dari `authRoutes.ts`
    - `authController.bulkRegister` dihapus dari `authControllers.ts`
    - `authServices.bulkRegister` dihapus dari `authServices.ts`
    - `authRepository.createUsersBatch` dan `authRepository.createProfilesBatch` dihapus dari `authRepository.ts`
    - Test case `bulkRegister` dihapus dari `authControllers.spec.ts` dan `authServices.spec.ts`
    - `src/utils/bulkRegisterReport.ts` tidak lagi digunakan

### ✨ Changed

- **Import path alias**: Semua import path diubah dari relative path (`../../../utils/...`) ke alias `@/` (`@/utils/...`) untuk keterbacaan dan konsistensi
    - Berlaku di `authControllers.ts`, `authServices.ts`, dan file lainnya
- **`schema.prisma`**: Field `url` dihapus dari blok `datasource db` (dipindahkan ke `prisma.config.ts` sesuai Prisma v7)
- **`src/generated/`**: Folder disiapkan untuk output custom Prisma Client

---

## [1.4.0] - 2026-03-07

### ✨ Added

- **Docker support**: Konfigurasi Docker dan Docker Compose untuk containerized deployment
    - `Dockerfile` dengan multi-stage build
    - `docker-compose.yml` dengan service database, Redis, dan aplikasi
    - Environment variable-based configuration untuk semua Docker services
    - Auto-run `prisma migrate deploy` saat container start
- **`prisma.config.ts`**: File konfigurasi Prisma terpusat (menggunakan Prisma Config API)
    - Mendukung pembacaan `DATABASE_URL` dari environment variable

### 🔧 Fixed

- **Docker Prisma connection**: Perbaikan error `Can't reach database server` di dalam container karena penggunaan `localhost` — diganti dengan hostname service dari `docker-compose.yml`

---

## [1.3.0] - 2026-03-06

### ✨ Added

- **NIK encryption**: Enkripsi field NIK dengan AES-256-GCM di `encryption.ts`
- **Bulk register** endpoint: `POST /api/v1/auth/bulk-register` untuk mendaftarkan banyak user sekaligus (array input, hingga 1000 user) dengan:
    - Concurrency control via `p-limit`
    - Batch database insert (250 per batch)
    - Auto photo upload ke S3 Storage
    - Performance profiling & markdown report generation
- **Performance profiling utilities**:
    - `src/utils/bulkRegisterReport.ts` — generate laporan performa bulk register
    - `src/utils/getUsersReport.ts` — generate laporan performa get users
- **API Signature** (`signature.ts`): Verifikasi endpoint dengan HMAC-SHA256
- **`scripts/generateApiKey.ts`**: Generate API key untuk testing signature endpoint

### 🔧 Fixed

- Perbaikan TypeScript type error pada query parameter `status` di RBAC controllers

---

## [1.2.0] - 2026-03-05

### ✨ Added

- **Email template system** (`src/utils/mail.ts`): Template modular untuk berbagai jenis email
    - OTP Email untuk password reset
    - Verification Email untuk aktivasi akun
    - Welcome Email untuk pengguna baru
    - Password Changed Email
- **`docs/EMAIL_TEMPLATES.md`**: Dokumentasi penggunaan email template
- **Get Users** endpoint: `GET /api/v1/auth/users` mengembalikan semua user lengkap dengan data profil dan URL foto

### 🔄 Changed

- Password hashing diperbarui dengan double-layer bcrypt dan custom salt (`SALT_HASH`, `SALT_ROUNDS`)

---

## [1.1.0] - 2026-03-04

### ✨ Added

- **Redis integration** (`src/configs/redis.ts`): Opsional untuk rate limiting dan token caching
- **Rate limiting** (`src/utils/rateLimiter.ts`): Berbasis Redis, graceful fallback jika Redis tidak tersedia
- **Token store** (`src/utils/tokenStore.ts`): Menyimpan refresh token di Redis
- **S3 Storage integration** (`src/utils/s3.ts`):
    - Upload file multipart dan base64
    - Presigned URL generation
    - Validasi format dan ukuran file
    - Auto-delete file lama saat update profil
- **SMTP integration** (`src/utils/smtp.ts`): Email sending dengan Nodemailer
- **Forgot password & OTP flow**: Reset password menggunakan OTP via email
- **Profile management**: Update dan delete profil user termasuk cleanup S3 files
- **Graceful degradation**: Aplikasi tetap berjalan meskipun layanan optional (Redis, S3, SMTP) tidak dikonfigurasi

---

## [1.0.0] - 2026-03-01

### 🎉 Initial Release

- **Express.js v5** dengan TypeScript
- **Prisma ORM** untuk database management
- **Authentication**:
    - Register dengan pembuatan profil
    - Login dengan JWT (access token + refresh token)
    - Logout
    - Refresh token
    - Get profile
- **JWT utilities** (`src/utils/jwt.ts`): Sign dan verify token
- **Encryption utilities** (`src/utils/encryption.ts`): AES-256-GCM untuk data sensitif
- **Response formatting** (`src/utils/respons.ts`): Format standar JSON response
- **Structured logging** dengan Pino dan pino-pretty
- **ESLint & Prettier**: Code quality tools
- **Helmet & CORS**: Security headers dan cross-origin request handling
- **Global error handler & 404 handler**
- **Test suite** dengan Node.js test runner dan Jest

---

[Unreleased]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Iswanto25/boilerplate-expressJs/releases/tag/v1.0.0
