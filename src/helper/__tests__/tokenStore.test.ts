import { test, expect, mock, beforeEach } from "bun:test";

const redisSetMock = mock<() => Promise<string>>(async () => "OK");
const redisGetMock = mock<() => Promise<string | null>>(async () => null);
const redisDelMock = mock<() => Promise<number>>(async () => 1);

const loggerMock = {
	info: mock(),
	warn: mock(),
	error: mock(),
};
mock.module("@/utils/logger.js", () => ({
	logger: loggerMock,
}));

mock.module("@/configs/redis.js", () => ({
	redisState: {
		client: {
			set: redisSetMock,
			get: redisGetMock,
			del: redisDelMock,
		},
		isAvailable: true,
	},
}));

const tokenStore = await import("@/utils/tokenStore.js");

beforeEach(() => {
	redisSetMock.mockClear();
	redisGetMock.mockClear();
	redisDelMock.mockClear();
	redisSetMock.mockResolvedValue("OK");
	redisGetMock.mockResolvedValue(null);
	redisDelMock.mockResolvedValue(1);
});

test("storeToken persists access token with correct prefix", async () => {
	const key = await tokenStore.storeToken("user-1", "token-value", "access", 120);

	expect(key).toBe("access_token:user-1");
	expect(redisSetMock).toHaveBeenCalledWith("access_token:user-1", "token-value", "EX", 120);
});

test("storeToken persists refresh token with correct prefix", async () => {
	const key = await tokenStore.storeToken("user-5", "refresh-token", "refresh", 604800);

	expect(key).toBe("refresh_token:user-5");
	expect(redisSetMock).toHaveBeenCalledWith("refresh_token:user-5", "refresh-token", "EX", 604800);
});

test("storeToken persists otp with correct prefix", async () => {
	const key = await tokenStore.storeToken("user-6", "123456", "otp", 600);

	expect(key).toBe("otp:user-6");
	expect(redisSetMock).toHaveBeenCalledWith("otp:user-6", "123456", "EX", 600);
});

test("getStoredToken reads token from Redis", async () => {
	redisGetMock.mockResolvedValue("stored-token");

	const result = await tokenStore.getStoredToken("user-3", "access");

	expect(result).toBe("stored-token");
	expect(redisGetMock).toHaveBeenCalledWith("access_token:user-3");
});

test("deleteToken removes token key", async () => {
	await tokenStore.deleteToken("user-4", "refresh");

	expect(redisDelMock).toHaveBeenCalledWith("refresh_token:user-4");
});

test("getStoredToken returns null when Redis not available", async () => {
	const redis = await import("@/configs/redis.js");
	const originalAvailable = redis.redisState.isAvailable;
	const originalClient = redis.redisState.client;

	redis.redisState.isAvailable = false;
	redis.redisState.client = null;

	const result = await tokenStore.getStoredToken("user-7", "access");
	expect(result).toBeNull();

	redis.redisState.isAvailable = originalAvailable;
	redis.redisState.client = originalClient;
});
