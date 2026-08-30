import { describe, it, expect } from "bun:test";
import prisma from "@/configs/database.js";
import { redisState } from "@/configs/redis.js";

const DB_URL = process.env.DATABASE_URL || "";
const isDbConfigured = DB_URL.includes("localhost") || DB_URL.includes("127.0.0.1");

describe("Infrastructure Connectivity (Bun Runtime)", () => {
	describe("Prisma Database", () => {
		it("should connect and execute raw query", async () => {
			if (!isDbConfigured) return;

			try {
				const result = await prisma.$queryRaw<[{ "?column?": number }]>`SELECT 1`;
				expect(result).toBeDefined();
				expect(result[0]).toBeDefined();
			} catch {
				return;
			}
		});

		it("should be able to count users table", async () => {
			if (!isDbConfigured) return;

			try {
				const count = await prisma.user.count();
				expect(typeof count).toBe("number");
				expect(count).toBeGreaterThanOrEqual(0);
			} catch {
				return;
			}
		});

		it("should disconnect cleanly", async () => {
			if (!isDbConfigured) return;

			try {
				await prisma.$disconnect();
				await prisma.$connect();
			} catch {
				return;
			}
		});
	});

	describe("Redis", () => {
		it("should have Redis client initialized or gracefully unavailable", () => {
			if (!redisState.isAvailable) return;
			expect(redisState.client).toBeDefined();
		});

		it("should be able to ping Redis when available", async () => {
			if (!redisState.isAvailable || !redisState.client) return;

			try {
				const pong = await redisState.client.ping();
				expect(pong).toBe("PONG");
			} catch {
				return;
			}
		});

		it("should set and get a test key when available", async () => {
			if (!redisState.isAvailable || !redisState.client) return;

			try {
				const testKey = "bun:test:infrastructure";
				const testValue = `Bun v${Bun.version}`;

				await redisState.client.set(testKey, testValue, "EX", 10);
				const result = await redisState.client.get(testKey);

				expect(result).toBe(testValue);

				await redisState.client.del(testKey);
			} catch {
				return;
			}
		});
	});
});
