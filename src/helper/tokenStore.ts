import { redisState } from "@/configs/redis.js";
import { logger } from "@/utils/logger.js";

const ACCESS_TOKEN_PREFIX = "access_token:";
const REFRESH_TOKEN_PREFIX = "refresh_token:";
const OTP_PREFIX = "otp:";

function getPrefix(type: "access" | "refresh" | "otp"): string {
	if (type === "access") return ACCESS_TOKEN_PREFIX;
	if (type === "otp") return OTP_PREFIX;
	return REFRESH_TOKEN_PREFIX;
}

export async function storeToken(userId: string, token: string, type: "access" | "refresh" | "otp", expiresInSeconds: number) {
	if (!redisState.isAvailable || !redisState.client) {
		logger.warn("Token storage skipped - Redis not available");
		return null;
	}

	try {
		const prefix = getPrefix(type);
		const key = `${prefix}${userId}`;
		const result = await redisState.client.set(key, token, "EX", expiresInSeconds);
		if (result !== "OK") throw new Error("Failed to store token");
		return key;
	} catch (error) {
		logger.warn({ error }, "Failed to store token in Redis");
		return null;
	}
}

export async function getStoredToken(userId: string, type: "access" | "refresh" | "otp") {
	if (!redisState.isAvailable || !redisState.client) {
		logger.warn("Token retrieval skipped - Redis not available");
		return null;
	}

	try {
		const prefix = getPrefix(type);
		return await redisState.client.get(`${prefix}${userId}`);
	} catch (error) {
		logger.warn({ error }, "Failed to get token from Redis");
		return null;
	}
}

export async function deleteToken(userId: string, type: "access" | "refresh" | "otp") {
	if (!redisState.isAvailable || !redisState.client) {
		logger.warn("Token deletion skipped - Redis not available");
		return;
	}

	try {
		const prefix = getPrefix(type);
		await redisState.client.del(`${prefix}${userId}`);
	} catch (error) {
		logger.warn({ error }, "Failed to delete token from Redis");
	}
}
