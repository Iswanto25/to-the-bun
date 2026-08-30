import { RedisClient } from "bun";
import { logger } from "@/utils/logger.js";

const redisState: { client: RedisClient | null; isAvailable: boolean } = {
	client: null,
	isAvailable: false,
};

const hasRedisConfig = !!(Bun.env.REDIS_HOST || Bun.env.REDIS_PORT || Bun.env.REDIS_URL);

if (hasRedisConfig) {
	try {
		const host = Bun.env.REDIS_HOST || "127.0.0.1";
		const port = Bun.env.REDIS_PORT || "6379";
		const password = Bun.env.REDIS_PASSWORD;
		const db = Bun.env.REDIS_DB || "0";

		let url = Bun.env.REDIS_URL;
		if (!url) {
			const auth = password ? `:${password}@` : "";
			url = `redis://${auth}${host}:${port}/${db}`;
		}

		redisState.client = new RedisClient(url, {
			connectionTimeout: 10_000,
			autoReconnect: true,
			maxRetries: 3,
			idleTimeout: 0,
		});

		redisState.isAvailable = true;
		logger.info("Redis connected");
	} catch {
		redisState.isAvailable = false;
		logger.warn("Redis initialization failed - running without Redis");
	}
} else {
	logger.warn("Redis configuration not found (REDIS_URL or REDIS_HOST/REDIS_PORT) - running without Redis");
}

export { redisState };
