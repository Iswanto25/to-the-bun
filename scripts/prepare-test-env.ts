if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = "test";
}

if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL =
		"postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=10&pool_timeout=30&connect_timeout=5&sslmode=prefer";
}

if (!process.env.REDIS_URL) {
	process.env.REDIS_URL = "redis://localhost:6379";
}

if (!process.env.JWT_SECRET) {
	process.env.JWT_SECRET = "secret";
}

if (!process.env.JWT_REFRESH_SECRET) {
	process.env.JWT_REFRESH_SECRET = "refresh-secret";
}

const result = Bun.spawnSync({
	cmd: ["bunx", "prisma", "generate"],
	stdio: ["inherit", "inherit", "inherit"],
	env: process.env as Record<string, string>,
});

if (result.exitCode !== 0) {
	process.exit(result.exitCode ?? 1);
}
