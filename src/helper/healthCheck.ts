import prisma from "@/configs/database.js";
import { redisState } from "@/configs/redis.js";
import { isS3Configured } from "@/utils/s3.js";
import { isSMTPConfigured } from "@/utils/smtp.js";
import { logger } from "@/utils/logger.js";

export async function checkServicesHealth() {
	logger.info("========================================");
	logger.info("SERVICE HEALTH REPORT");
	logger.info("========================================");

	try {
		await prisma.$queryRaw`SELECT 1`;
		logger.info("Database: Connected (Prisma)");
	} catch (error) {
		logger.error({ err: error }, "Database: Connection failed");
	}

	if (redisState.isAvailable) {
		logger.info("Redis: Connected and ready");
	} else {
		logger.warn("Redis: Not available (Running without cache)");
	}

	if (isS3Configured) {
		logger.info("S3 Storage: Configured");
	} else {
		logger.warn("S3 Storage: Not configured (File uploads disabled)");
	}

	if (isSMTPConfigured) {
		logger.info("SMTP: Configured");
	} else {
		logger.warn("SMTP: Not configured (Email sending disabled)");
	}

	logger.info("========================================");
}
