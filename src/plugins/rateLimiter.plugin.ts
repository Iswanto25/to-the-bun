import { logger } from "@/utils/logger.js";
import { HttpStatus, respons } from "@/utils/respons.js";
import { redisState } from "@/configs/redis.js";
import type { AuthUser } from "@/plugins/requestContext.plugin.js";

interface RateLimitOptions {
	keyPrefix?: string;
	windowInSeconds?: number;
	maxRequests?: number;
	blockDuration?: number;
	useUserId?: boolean;
}

export function rateLimiter(options?: RateLimitOptions) {
	const { keyPrefix = "rate_limit:", windowInSeconds = 60, maxRequests = 30, blockDuration = 60, useUserId = true } = options || {};

	return async (ctx: any) => {
		if (!redisState.isAvailable || !redisState.client) {
			logger.warn("Rate limiting skipped - Redis not available");
			return;
		}

		try {
			const user = ctx.user as AuthUser | undefined;
			const userId = useUserId && user?.id ? user.id : null;
			const forwarded = ctx.request?.headers?.get("x-forwarded-for");
			const ip = forwarded?.split(",")[0].trim() || ctx.server?.requestIP(ctx.request)?.address || "unknown";

			const keyId = userId || ip;
			const key = `${keyPrefix}${keyId}`;

			const current = await redisState.client.incr(key);
			if (current === 1) {
				await redisState.client.expire(key, windowInSeconds);
			}

			if (current > maxRequests) {
				const ttl = await redisState.client.ttl(key);

				await redisState.client.set(`${keyPrefix}blocked:${keyId}`, "1", "EX", blockDuration);
				logger.warn(`Rate limit exceeded for ${userId ? `user ${userId}` : ip}`);

				return respons.error(
					"Terlalu banyak permintaan",
					`Terlalu banyak permintaan. Coba lagi dalam ${ttl} detik.`,
					HttpStatus.TOO_MANY_REQUESTS,
					ctx,
				);
			}
		} catch (error) {
			logger.warn({ error }, "Rate limiter error - skipping rate limit");
		}
	};
}
