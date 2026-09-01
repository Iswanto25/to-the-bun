import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { respons, HttpStatus } from "@/utils/respons.js";
import apiRoutes from "@/routes/index.js";
import { requestContext } from "@/plugins/requestContext.plugin.js";
import { errorHandlerPlugin } from "@/plugins/errorHandler.plugin.js";

export const app = new Elysia({ name: "boilerplate-bun-elysia" })
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
	.use(errorHandlerPlugin);
