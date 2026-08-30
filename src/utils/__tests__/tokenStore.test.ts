import { test, expect, mock, beforeEach, afterEach } from "bun:test";

let redisClient: any;
let tokenStore: any;

function setupModule(overrides?: Partial<Record<string, any>>) {
	redisClient = {
		set: mock(async () => "OK"),
		get: mock(async () => null),
		del: mock(async () => 1),
		...(overrides || {}),
	};

	mock.module("@/configs/redis.js", () => ({
		redisState: { client: redisClient, isAvailable: true },
	}));
}

beforeEach(() => {
	setupModule();
});

afterEach(async () => {
	await new Promise((r) => setTimeout(r, 10));
	mock.restore();
});

test("storeToken persists token with the correct prefix", async () => {
	tokenStore = await import("@/utils/tokenStore.js");
	const key = await tokenStore.storeToken("user-1", "token-value", "access", 120);

	expect(key).toBe("access_token:user-1");
	expect(redisClient.set.mock.calls[0]).toEqual(["access_token:user-1", "token-value", "EX", 120]);
});

test("storeToken returns null when Redis not available", async () => {
	mock.module("@/configs/redis.js", () => ({
		redisState: { client: null, isAvailable: false },
	}));

	tokenStore = await import("@/utils/tokenStore.js");
	const key = await tokenStore.storeToken("user-2", "token", "refresh", 60);

	expect(key).toBeNull();
});

test("getStoredToken reads token from Redis", async () => {
	mock.module("@/configs/redis.js", () => ({
		redisState: { client: { get: mock(async () => "stored-token"), set: mock(), del: mock() }, isAvailable: true },
	}));

	tokenStore = await import("@/utils/tokenStore.js");
	const result = await tokenStore.getStoredToken("user-3", "access");

	expect(result).toBe("stored-token");
});

test("deleteToken removes token key", async () => {
	tokenStore = await import("@/utils/tokenStore.js");
	await tokenStore.deleteToken("user-4", "refresh");

	expect(redisClient.del.mock.calls[0]).toEqual(["refresh_token:user-4"]);
});
