import { app } from "@/configs/express.js";
import http from "http";
import { logger } from "@/utils/logger.js";
import { checkServicesHealth } from "@/utils/healthCheck.js";

const PORT = Number(process.env.PORT) || 3006;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

if (isProd) {
	console.info("Running in PRODUCTION mode");
} else {
	console.info("Running in DEVELOPMENT mode");
}

server.listen(PORT, HOST, () => {
	const baseUrl = isProd ? Bun.env.BASE_URL || `https://${Bun.env.DOMAIN || "yourdomain.com"}` : `http://${HOST}:${PORT}`;

	console.info("========================================");
	console.info(`Server is running on Bun ${Bun.version}`);
	console.info(`Version: ${Bun.env.VERSION || "2.3.0"}`);
	console.info(`Environment: ${NODE_ENV}`);
	console.info(`URL: ${baseUrl}`);
	console.info("========================================");

	checkServicesHealth().catch((err) => {
		logger.error({ err }, "Unexpected error during health check");
	});
});

process.on("SIGTERM", () => {
	console.info("SIGTERM signal received: closing HTTP server");
	server.close(() => {
		console.info("HTTP server closed gracefully");
		process.exit(0);
	});
});
