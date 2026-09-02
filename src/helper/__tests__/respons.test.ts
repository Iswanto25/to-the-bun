import { test, expect, mock } from "bun:test";

const loggerMock = {
	info: mock(),
	warn: mock(),
	error: mock(),
};
mock.module("@/utils/logger.js", () => ({
	logger: loggerMock,
	formatIsoWithTz: mock(() => "2026-01-01T00:00:00.000Z"),
}));

mock.module("@/utils/auditLogger.js", () => ({
	saveAuditLog: mock(),
}));

mock.module("@/plugins/requestContext.plugin.js", () => ({
	maskSensitive: (data: unknown) => data,
	truncateLongStrings: (data: unknown) => data,
}));

import { respons, HttpStatus } from "@/utils/respons.js";

test("respons.success logs and responds with payload", async () => {
	const headers = new Headers({
		authorization: "Bearer token-123",
		"x-forwarded-for": "203.0.113.1",
		"user-agent": "UnitTestAgent/1.0",
	});

	const ctx = {
		request: { method: "POST", url: "http://localhost/api/test", headers } as any,
		set: { status: 0 as number | string, headers: {} as any },
		body: {},
		query: {},
		path: "/api/test",
		reqId: "test-req-id",
		startTime: Date.now(),
		server: { requestIP: () => ({ address: "10.0.0.1", port: 3006 }) },
		user: { id: "user-1", roleName: "admin", profile: { name: "Tester" } },
	};

	await respons.success("Success message", { hello: "world" }, HttpStatus.OK, ctx);

	expect(ctx.set.status).toBe(200);
	expect(loggerMock.info).toHaveBeenCalled();
});

test("respons.error logs error when called", async () => {
	const headers = new Headers({
		authorization: "Bearer token-123",
		"x-forwarded-for": "203.0.113.1",
		"user-agent": "UnitTestAgent/1.0",
	});

	const ctx = {
		request: { method: "POST", url: "http://localhost/api/test", headers } as any,
		set: { status: 0 as number | string, headers: {} as any },
		body: {},
		query: {},
		path: "/api/test",
		reqId: "test-req-id",
		startTime: Date.now(),
		server: { requestIP: () => ({ address: "10.0.0.1", port: 3006 }) },
		user: { id: "user-1", roleName: "admin", profile: { name: "Tester" } },
	};

	const result = respons.error("Error message", { reason: "failure" }, HttpStatus.BAD_REQUEST, ctx);

	expect(ctx.set.status).toBe(400);
	expect(loggerMock.error).toHaveBeenCalled();
	expect(result.success).toBe(false);
});
