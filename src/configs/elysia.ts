import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { respons, HttpStatus, apiError } from "@/utils/respons.js";
import apiRoutes from "@/routes/index.js";
import { requestContext } from "@/plugins/requestContext.plugin.js";

const errorTranslations: Record<string, string> = {
	"User not found": "User tidak ditemukan",
	"Invalid email": "Email tidak valid",
	"Invalid password": "Password salah",
	"Email already exists": "Email sudah terdaftar",
	"File not found in storage": "File tidak ditemukan di storage",
	Forbidden: "Anda tidak memiliki akses",
	Unauthorized: "Tidak terautentikasi",
	"Not found": "Tidak ditemukan",
	"Too many requests": "Terlalu banyak permintaan",
};

function translateMessage(message: string): string {
	return errorTranslations[message] || message;
}

export const app = new Elysia({ name: "boilerplate-bun-elysia" })
	// Security headers (pengganti helmet)
	.onRequest(({ set }) => {
		set.headers["Content-Security-Policy"] =
			"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src-attr 'none'; upgrade-insecure-requests";
		set.headers["Cross-Origin-Embedder-Policy"] = "require-corp";
		set.headers["Cross-Origin-Opener-Policy"] = "same-origin";
		set.headers["Cross-Origin-Resource-Policy"] = "same-origin";
		set.headers["Origin-Agent-Cluster"] = "?1";
		set.headers["Referrer-Policy"] = "no-referrer";
		set.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
		set.headers["X-Content-Type-Options"] = "nosniff";
		set.headers["X-DNS-Prefetch-Control"] = "off";
		set.headers["X-Download-Options"] = "noopen";
		set.headers["X-Frame-Options"] = "DENY";
		set.headers["X-Permitted-Cross-Domain-Policies"] = "none";
		set.headers["X-XSS-Protection"] = "0";
		set.headers["Permissions-Policy"] =
			"camera=(), geolocation=(), microphone=(), fullscreen=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()";
	})
	.use(requestContext)
	.use(
		cors({
			origin: Bun.env.ALLOWED_ORIGINS ? Bun.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : true,
			methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
			preflight: true,
			credentials: !!Bun.env.ALLOWED_ORIGINS,
		}),
	)
	.get("/", ({ redirect }) => redirect("/health"))
	.get("/health", (ctx) => {
		const data = {
			status: "ok",
			timestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }),
			version: Bun.env.VERSION || "1.0.0",
			environment: Bun.env.NODE_ENV || "development",
		};
		return respons.success("Service is healthy", data, HttpStatus.OK, ctx);
	})
	.use(apiRoutes)
	.onError((ctx) => {
		const isProduction = Bun.env.NODE_ENV === "production";
		const { code, error, request, path, set, server } = ctx as any;

		let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
		let hint: string | undefined;

		if (error instanceof apiError) {
			statusCode = error.statusCode;
			hint = error.hint;
		} else if (typeof error === "object" && error !== null && "statusCode" in (error as any)) {
			statusCode = Number((error as any).statusCode);
		} else if (typeof error === "object" && error !== null && "status" in (error as any)) {
			statusCode = Number((error as any).status);
		}

		let message: string;
		if (code === "NOT_FOUND") {
			statusCode = HttpStatus.NOT_FOUND;
			hint = "Not Found";
			message = isProduction ? "Not found" : `Route ${request.method} ${path} not found`;
		} else if (code === "PARSE") {
			statusCode = HttpStatus.BAD_REQUEST;
			message = "Format request tidak valid";
		} else if (code === "INTERNAL_SERVER_ERROR" && !(error instanceof Error)) {
			message = "Terjadi kesalahan pada server";
		} else {
			const rawMessage = (error instanceof Error && error.message) || "Terjadi kesalahan pada server";
			message =
				isProduction && statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? "Internal server error" : translateMessage(rawMessage);
		}

		return respons.error(message, hint || message, statusCode, { request, set, path, server });
	});
