import Elysia from "elysia";
import { apiError, HttpStatus } from "@/utils/respons.js";

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

function jsonError(message: string, error: unknown, statusCode: number, set: any) {
	set.status = statusCode;
	return {
		success: false,
		message,
		error,
	};
}

export const errorHandlerPlugin = new Elysia().onError((ctx) => {
	const { code, error, set } = ctx;

	if (error instanceof apiError) {
		return jsonError(error.message, serializeError(error), error.statusCode, set);
	}

	if (code === "VALIDATION") {
		const detail = error?.all ?? error;
		return jsonError("Validation Error", serializeError(detail), HttpStatus.BAD_REQUEST, set);
	}

	if (code === "NOT_FOUND") {
		return jsonError("Route Not Found", null, HttpStatus.NOT_FOUND, set);
	}

	const message = error instanceof Error ? error.message : "Internal Server Error";
	return jsonError(message, serializeError(error), HttpStatus.INTERNAL_SERVER_ERROR, set);
});
