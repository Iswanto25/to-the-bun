import Elysia from "elysia";
import { apiError, HttpStatus } from "@/utils/respons.js";
import { logger } from "@/utils/logger.js";
import { saveAuditLog } from "@/utils/auditLogger.js";

function jsonResponse(data: unknown, status: number): Response {
	return Response.json(data, {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const errorHandlerPlugin = new Elysia()
	.as("global")
	.onError((ctx) => {
		const { code, error, request, set, body, query, path, server } = ctx;

		const responsCtx = {
			request,
			set,
			body,
			query,
			path,
			reqId: request.headers.get("x-request-id") || crypto.randomUUID(),
			startTime: (ctx as any).startTime || Date.now(),
			server: server as any,
			user: (ctx as any).user,
		};

		// apiError — custom application error
		if (error && typeof error === "object" && "isApiError" in error && (error as apiError).isApiError) {
			const apiErr = error as apiError;
			const hint = apiErr.hint || undefined;

			const logPayload = {
				level: "ERROR",
				path,
				method: request.method,
				status: apiErr.statusCode,
				reqId: responsCtx.reqId,
				message: apiErr.message,
				hint,
				error: apiErr.message,
			};

			logger.error(logPayload);

			saveAuditLog({
				userId: (ctx as any).user?.id || null,
				name: (ctx as any).user?.profile?.name || "Guest",
				role: (ctx as any).user?.roleName || null,
				ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
				host: request.url,
				status: apiErr.statusCode.toString(),
				method: request.method,
				reqId: responsCtx.reqId,
				data: logPayload,
				date: new Date(),
			});

			return jsonResponse(
				{
					success: false,
					message: apiErr.message,
					...(hint && { hint }),
					error: apiErr.message,
				},
				apiErr.statusCode,
			);
		}

		// Elysia validation error
		if (code === "VALIDATION") {
			return jsonResponse(
				{
					success: false,
					message: "Validation Error",
					error: error.all,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		// Route not found
		if (code === "NOT_FOUND") {
			return jsonResponse(
				{
					success: false,
					message: "Route Not Found",
					error: null,
				},
				HttpStatus.NOT_FOUND,
			);
		}

		// Fallback — internal server error
		const message = error instanceof Error ? error.message : "Internal Server Error";
		return jsonResponse(
			{
				success: false,
				message,
				error,
			},
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
	});
