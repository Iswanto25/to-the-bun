import { ConnectionOptions } from "bullmq";

export const bullConnection: ConnectionOptions = {
	host: Bun.env.REDIS_HOST || "127.0.0.1",
	port: Number(Bun.env.REDIS_PORT) || 6379,
	password: Bun.env.REDIS_PASSWORD || undefined,
	db: Number(Bun.env.REDIS_DB) || 0,
	maxRetriesPerRequest: null, // Required for BullMQ
};
