import Elysia from "elysia";
import { apiError } from "@/utils/respons.js";

function serializeError(error: unknown): Record<string, unknown> {
	if (error instanceof apiError) {
		return { name: error.name, message: error.message, statusCode: error.statusCode, hint: error.hint };
	}
	if (error instanceof Error) {
		return { name: error.name, message: error.message };
	}
	if (typeof error === "object" && error !== null) {
		return error as Record<string, unknown>;
	}
	return { message: String(error) };
}

export const errorHandlerPlugin = new Elysia().onError(({ code, error, status }) => {
	if (error instanceof apiError) {
		return status(error.statusCode, {
			success: false,
			message: error.message,
			error: serializeError(error),
		});
	}

	if (code === "VALIDATION") {
		const detail = (error as any)?.all ?? error;
		return status(400, {
			success: false,
			message: "Validation Error",
			error: serializeError(detail),
		});
	}

	if (code === "NOT_FOUND") {
		return status(404, {
			success: false,
			message: "Route Not Found",
			error: null,
		});
	}

	const message = error instanceof Error ? error.message : "Internal Server Error";
	return status(500, {
		success: false,
		message,
		error: serializeError(error),
	});
});
