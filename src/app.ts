import { app } from "@/configs/elysia.js";
import { logger, closeLogger } from "@/utils/logger.js";
import { checkServicesHealth } from "@/utils/healthCheck.js";

const PORT = Number(Bun.env.PORT) || 3006;
const HOST = Bun.env.HOST || "0.0.0.0";
const NODE_ENV = Bun.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

if (isProd) {
	console.info("Running in PRODUCTION mode");
} else {
	console.info("Running in DEVELOPMENT mode");
}

app.listen(
	{
		port: PORT,
		hostname: HOST,
	},
	() => {
		const baseUrl = isProd ? Bun.env.BASE_URL || `https://${Bun.env.DOMAIN || "yourdomain.com"}` : `http://${HOST}:${PORT}`;

		console.info("========================================");
		console.info(`Server is running on Bun ${Bun.version}`);
		console.info(`Version: ${Bun.env.VERSION || "1.0.0"}`);
		console.info(`Environment: ${NODE_ENV}`);
		console.info(`URL: ${baseUrl}`);
		console.info("========================================");

		checkServicesHealth().catch((err) => {
			logger.error({ err }, "Unexpected error during health check");
		});
	},
);

process.on("SIGTERM", async () => {
	logger.info("SIGTERM received, shutting down...");
	app.stop();
	await closeLogger();
	process.exit(0);
});

process.on("SIGINT", async () => {
	logger.info("SIGINT received, shutting down...");
	app.stop();
	await closeLogger();
	process.exit(0);
});
