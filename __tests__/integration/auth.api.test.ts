import { mock } from "bun:test";

mock.module("@/configs/database.js", () => {
	const mockPrisma = {
		user: {
			create: mock(),
			findFirst: mock(),
			findUnique: mock(),
			findMany: mock(),
			update: mock(),
			delete: mock(),
			count: mock(),
			createMany: mock(),
		},
		role: {
			findUnique: mock((args: any) => {
				if (args?.where?.name === "User") return { id: "role-user-id", name: "User" };
				return null;
			}),
			findFirst: mock(),
		},
		resource: { findFirst: mock() },
		rolePermission: { findFirst: mock(), createMany: mock() },
		logs: { create: mock() },
		$transaction: mock(async (callback: any) => callback(mockPrisma)),
		$disconnect: mock(),
		$connect: mock(),
		$queryRaw: mock().mockResolvedValue([{ "?column?": 1 }]),
	};
	return { __esModule: true, default: mockPrisma };
});

mock.module("@/utils/s3.js", () => ({
	uploadBase64: mock().mockResolvedValue({ fileName: "photo.jpg", url: "https://example.com/photo.jpg" }),
	getPublicUrl: mock().mockReturnValue("https://example.com/photo.jpg"),
	deleteFile: mock().mockResolvedValue({ deleted: true, key: "photo.jpg" }),
	headFile: mock().mockResolvedValue({ exists: true }),
	uploadFile: mock().mockResolvedValue({ fileName: "photo.jpg", folder: "avatars" }),
	getFile: mock().mockResolvedValue("https://example.com/signed-url"),
}));

mock.module("@/utils/tokenStore.js", () => ({
	storeToken: mock().mockResolvedValue("token-key"),
	getStoredToken: mock().mockResolvedValue("valid-token"),
	deleteToken: mock().mockResolvedValue(undefined),
}));

mock.module("@/utils/encryption.js", () => ({
	encryptionUtils: {
		encryptSensitive: mock().mockReturnValue({ version: 1, ciphertext: "encrypted" }),
		decryptSensitive: mock().mockReturnValue("decrypted"),
	},
}));

mock.module("@/utils/jwt.js", () => ({
	jwtUtils: {
		generateAccessToken: mock().mockReturnValue("mock-access-token"),
		generateRefreshToken: mock().mockReturnValue("mock-refresh-token"),
		verifyAccessToken: mock().mockReturnValue({ id: "user-123", email: "test@example.com" }),
		verifyRefreshToken: mock().mockReturnValue({ id: "user-123", email: "test@example.com" }),
	},
}));

mock.module("@/utils/smtp.js", () => ({
	sendEmail: mock().mockResolvedValue(undefined),
}));

mock.module("@/utils/utils.js", () => ({
	encryptPassword: mock().mockResolvedValue("hashed-password"),
	comparePassword: mock((_p, h) => Promise.resolve(h === "hashed-password")),
	isEmailValid: mock().mockReturnValue(true),
	isPhoneNumberValid: mock().mockReturnValue(true),
	generateOTP: mock().mockReturnValue("123456"),
	formatDateTime: mock().mockReturnValue("2024-01-01 00:00:00"),
	formatDate: mock().mockReturnValue("20240101"),
	randomString: mock().mockReturnValue("20240101-random"),
	pLimit: mock((_c) => (fn: any) => fn()),
}));

mock.module("@/utils/mail.js", () => ({
	generateOTPEmail: mock().mockReturnValue("<html>otp</html>"),
}));

mock.module("@/utils/pagination.js", () => ({
	paginate: mock().mockReturnValue({ pagination: { currentPage: 1, totalPages: 1, totalData: 0, limit: 10 } }),
}));

mock.module("@/features/auth/jobs/auth.jobs.js", () => ({
	authQueue: { add: mock().mockResolvedValue(undefined) },
	authWorker: { close: mock().mockResolvedValue(undefined) },
}));

mock.module("@/utils/logger.js", () => ({
	logger: {
		info: mock(),
		error: mock(),
		warn: mock(),
		debug: mock(),
	},
	getLogLevel: mock().mockReturnValue("info"),
}));

mock.module("@/configs/redis.js", () => ({
	redisState: {
		client: {
			get: mock(),
			set: mock(),
			del: mock(),
		},
		isAvailable: true,
	},
}));

import { describe, it, expect, beforeAll } from "bun:test";
import request from "supertest";
import { app } from "@/configs/express.js";
import prisma from "@/configs/database.js";
import { generateFakeRegisterData, generateFakeLoginData, setFakerSeed } from "__tests__/helpers/faker.helper.js";

describe("Auth API Integration Tests", () => {
	beforeAll(() => {
		setFakerSeed(12345);
	});

	describe("POST /api/auth/register", () => {
		it("should register a new user successfully", async () => {
			const registerData = generateFakeRegisterData();
			(prisma.user.findUnique as any).mockResolvedValue(null);
			(prisma.user.create as any).mockResolvedValue({
				id: "user-123",
				email: registerData.email,
				roleId: "role-user-id",
			});

			const response = await request(app).post("/api/auth/register").send(registerData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toBe("Berhasil register");
		});

		it("should return 400 if required fields are missing", async () => {
			const response = await request(app).post("/api/auth/register").send({ email: "missing@fields.com" });

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		it("should return error if email already exists", async () => {
			const registerData = generateFakeRegisterData();
			(prisma.user.findUnique as any).mockResolvedValue({ id: "existing-id" });

			const response = await request(app).post("/api/auth/register").send(registerData);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.message).toBe("Email sudah terdaftar");
		});
	});

	describe("POST /api/auth/login", () => {
		it("should login successfully with valid credentials", async () => {
			const loginData = generateFakeLoginData();
			(prisma.user.findUnique as any).mockResolvedValue({
				id: "user-123",
				email: loginData.email,
				password: "hashed-password",
				roleId: "role-123",
			});

			const response = await request(app).post("/api/auth/login").send(loginData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("accessToken");
			expect(response.body.data).toHaveProperty("refreshToken");
		});

		it("should return 400 if credentials are missing", async () => {
			const response = await request(app).post("/api/auth/login").send({ email: "only@email.com" });

			expect(response.status).toBe(400);
		});

		it("should return error if user not found", async () => {
			const loginData = generateFakeLoginData();
			(prisma.user.findUnique as any).mockResolvedValue(null);

			const response = await request(app).post("/api/auth/login").send(loginData);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("User tidak ditemukan");
		});
	});

	describe("POST /api/auth/forgot-password", () => {
		it("should send forgot password email successfully", async () => {
			const email = "user@example.com";
			(prisma.user.findUnique as any).mockResolvedValue({ id: "user-123", email });

			const response = await request(app).post("/api/auth/forgot-password").send({ email });

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it("should return 400 if email is missing", async () => {
			const response = await request(app).post("/api/auth/forgot-password").send({});

			expect(response.status).toBe(400);
		});
	});
});
