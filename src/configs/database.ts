import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "@/utils/logger.js";

let connectionString = Bun.env.DATABASE_URL || "";
let sslConfig: { rejectUnauthorized: boolean } | undefined = undefined;

if (connectionString.includes("sslmode=")) {
	sslConfig = { rejectUnauthorized: false };
	connectionString = connectionString.replace(/([&?])sslmode=[^&]*/, "");
	connectionString = connectionString.replace(/\?&/, "?").replace(/[?&]$/, "");
}

const pool = new Pool({
	connectionString,
	ssl: sslConfig,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
	adapter,
	log: [
		{ emit: "event", level: "error" },
		{ emit: "event", level: "warn" },
	],
});

prisma.$on("error", (e) => {
	logger.error(`Database Error: ${e.message}`);
});

prisma.$on("warn", (e) => {
	logger.warn(`Database Warning: ${e.message}`);
});

export default prisma;
