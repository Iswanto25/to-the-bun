import Elysia from "elysia";
import { respons, apiError, HttpStatus } from "@/utils/respons.js";

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

export const errorHandlerPlugin = new Elysia()
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
            server: server as any
        };

        if (error instanceof apiError) {
            return respons.error(error.message, serializeError(error), error.statusCode, responsCtx);
        }

        if (code === "VALIDATION") {
            const detail = error?.all ?? error;
            return respons.error("Validation Error", serializeError(detail), HttpStatus.BAD_REQUEST, responsCtx);
        }

        if (code === "NOT_FOUND") {
            return respons.error("Route Not Found", null, HttpStatus.NOT_FOUND, responsCtx);
        }

        const message = error instanceof Error ? error.message : "Internal Server Error";
        return respons.error(message, serializeError(error), HttpStatus.INTERNAL_SERVER_ERROR, responsCtx);
    });