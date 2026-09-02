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
		const { code, error, request, path } = ctx;

		// apiError — Elysia uses .status and .toResponse() automatically
		if (error instanceof apiError) {
			const logPayload = {
				level: "ERROR",
				path,
				method: request.method,
				status: error.status,
				reqId: request.headers.get("x-request-id") || crypto.randomUUID(),
				message: error.message,
				hint: error.hint,
				error: error.message,
			};

			logger.error(logPayload);

			saveAuditLog({
				userId: (ctx as any).user?.id || null,
				name: (ctx as any).user?.profile?.name || "Guest",
				role: (ctx as any).user?.roleName || null,
				ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
				host: request.url,
				status: error.status.toString(),
				method: request.method,
				reqId: logPayload.reqId,
				data: logPayload,
				date: new Date(),
			});

			return jsonResponse(error.toResponse(), error.status);
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

		// Fallback — internal server error
		const message = error instanceof Error ? error.message : "Internal Server Error";
		return jsonResponse(
			{
				success: false,
				message,
				error: message,
			},
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
	});
