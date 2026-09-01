import { logger, formatIsoWithTz } from "@/utils/logger.js";
import { saveAuditLog } from "@/utils/auditLogger.js";
import { maskSensitive, truncateLongStrings } from "@/plugins/requestContext.plugin.js";

export enum HttpStatus {
	OK = 200,
	CREATED = 201,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	CONFLICT = 409,
	PAYLOAD_TOO_LARGE = 413,
	UNPROCESSABLE_ENTITY = 422,
	UNSUPPORTED_MEDIA_TYPE = 415,
	TOO_MANY_REQUESTS = 429,
	BAD_GATEWAY = 502,
	SERVICE_UNAVAILABLE = 503,
	INTERNAL_SERVER_ERROR = 500,
}

interface ResponsCtx {
	request?: Request;
	// biome-ignore lint/suspicious/noExplicitAny: Elysia HTTPHeaders tidak cocok dengan Record<string, string>
	set: { status?: number | string; headers?: any };
	body?: unknown;
	query?: unknown;
	path?: string;
	reqId?: string;
	startTime?: number;
	server?: { requestIP(request: Request): { address: string; port: number } | null } | null;
	user?: { id: string; roleName?: string; profile?: { name: string | null } | null };
}

interface LogUser {
	id?: string;
	name: string;
	role: string | null;
}

function getLogUser(ctx?: ResponsCtx): LogUser {
	if (!ctx?.user) return { name: "Guest", role: null };

	return {
		id: ctx.user.id,
		name: ctx.user.profile?.name || "Unknown",
		role: ctx.user.roleName || null,
	};
}

function getClientIp(ctx: ResponsCtx): string {
	const forwarded = ctx.request?.headers.get("x-forwarded-for");
	return forwarded?.split(",")[0].trim() || ctx.server?.requestIP(ctx.request!)?.address || "unknown";
}

function buildLogRequest(ctx?: ResponsCtx): Record<string, unknown> {
	if (!ctx) return {};
	const query = ctx.query;
	const hasQuery = query && typeof query === "object" && Object.keys(query).length > 0;
	return {
		...(truncateLongStrings(maskSensitive(ctx.body)) as Record<string, unknown>),
		...(hasQuery ? { query } : {}),
	};
}

function buildLogResponse(payload: unknown, resTime: string, fallbackKey: "data" | "error" = "data"): Record<string, any> {
	const processed = truncateLongStrings(maskSensitive(payload));
	if (processed === null || processed === undefined) {
		return { resTime };
	}
	if (typeof processed === "object" && !Array.isArray(processed)) {
		return { ...(processed as Record<string, any>), resTime };
	}
	return { [fallbackKey]: processed, resTime };
}

export const respons = {
	success(message: string, data: unknown, code: number, ctx: ResponsCtx, pagination?: any) {
		const logUser = getLogUser(ctx);
		const ip = getClientIp(ctx);
		const startTime = ctx.startTime || Date.now();
		const now = Date.now();
		const responseTime = now - startTime;
		const path = ctx.path || new URL(ctx.request?.url || "http://localhost/").pathname;
		const isoNow = formatIsoWithTz(new Date(now));

		const reqBody = truncateLongStrings(buildLogRequest(ctx)) as Record<string, unknown>;

		const logPayload = {
			level: "INFO",
			time: isoNow,
			path,
			method: ctx.request?.method,
			status: code,
			reqId: ctx.reqId,
			userId: logUser.id || null,
			userRole: logUser.role || "GUEST",
			request: { ...reqBody, reqTime: formatIsoWithTz(new Date(startTime)) },
			response: buildLogResponse(data, isoNow, "data"),
			userAgent: ctx.request?.headers.get("user-agent") || "Unknown",
			durationMs: responseTime,
			msg: "HTTP Transaction completed",
		};

		logger.info(logPayload);

		saveAuditLog({
			userId: logUser.id || null,
			name: logUser.name,
			role: logUser.role,
			ip,
			host: ctx.request?.url || "",
			status: code.toString(),
			method: ctx.request?.method || "UNKNOWN",
			reqId: ctx.reqId,
			data: logPayload,
			date: new Date(now),
		});

		ctx.set.status = code;

		return {
			success: true,
			message,
			data,
			...(pagination && { pagination }),
		};
	},

	error(message: string, error: unknown, code: number, ctx?: ResponsCtx) {
		const logUser = getLogUser(ctx);
		const ip = ctx ? getClientIp(ctx) : "";
		const startTime = ctx?.startTime || Date.now();
		const now = Date.now();
		const responseTime = now - startTime;
		const path = ctx?.path || (ctx?.request ? new URL(ctx.request.url).pathname : "unknown");
		const isoNow = formatIsoWithTz(new Date(now));
		const hint = (error as any)?.hint || (error as any)?.code || undefined;

		const reqBody = truncateLongStrings(buildLogRequest(ctx)) as Record<string, unknown>;

		const logPayload = {
			level: "ERROR",
			time: isoNow,
			path,
			method: ctx?.request?.method || "UNKNOWN",
			status: code,
			reqId: ctx?.reqId,
			userId: logUser.id || null,
			userRole: logUser.role || "GUEST",
			request: { ...reqBody, reqTime: formatIsoWithTz(new Date(startTime)) },
			response: buildLogResponse(error, isoNow, "error"),
			userAgent: ctx?.request?.headers.get("user-agent") || "Unknown",
			durationMs: responseTime,
			...(hint ? { hint } : {}),
			msg: "HTTP Transaction completed",
		};

		logger.error(logPayload);

		saveAuditLog({
			userId: logUser.id || null,
			name: logUser.name,
			role: logUser.role,
			ip,
			host: ctx?.request?.url || "",
			status: code.toString(),
			method: ctx?.request?.method || "UNKNOWN",
			reqId: ctx?.reqId,
			data: logPayload,
			date: new Date(now),
		});

		if (ctx) ctx.set.status = code;

		return {
			success: false,
			message,
			hint,
			error,
		};
	},
};

export class apiError extends Error {
    public statusCode: number;
    public hint?: string;
    public readonly isApiError = true;

    constructor(statusCode: number, message: string, hint?: string) {
        super(message);
        this.name = "apiError";
        this.statusCode = statusCode;
        this.hint = hint;
    }
}

export const validateOrThrow = <T>(
	schema: { safeParse(data: unknown): { success: boolean; data?: T; error?: { issues: { message: string }[] } } },
	data: unknown,
): T => {
	const result = schema.safeParse(data);
	if (!result.success) {
		const errorMsg = result.error?.issues?.[0]?.message || "Data tidak valid";
		throw new apiError(HttpStatus.BAD_REQUEST, errorMsg);
	}
	return result.data as T;
};
