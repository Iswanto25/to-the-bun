// src/plugins/errorHandler.plugin.ts
import Elysia from "elysia";
import { respons, apiError, HttpStatus } from "@/utils/respons.js";

export const errorHandlerPlugin = new Elysia()
    .as("global") // <--- TAMBAHKAN INI agar hook onError menembus ke sub-plugin (apiRoutes)
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
            user: (ctx as any).user
        };

        if (error && typeof error === "object" && "isApiError" in error && (error as apiError).isApiError) {
            const apiErr = error as apiError;
            return respons.error(apiErr.message, apiErr, apiErr.statusCode, responsCtx);
        }

        if (code === "VALIDATION") {
            return respons.error("Validation Error", error.all, HttpStatus.BAD_REQUEST, responsCtx);
        }

        if (code === "NOT_FOUND") {
            return respons.error("Route Not Found", null, HttpStatus.NOT_FOUND, responsCtx);
        }

        const message = error instanceof Error ? error.message : "Internal Server Error";
        return respons.error(message, error, HttpStatus.INTERNAL_SERVER_ERROR, responsCtx);
    });