import { test, expect, mock } from "bun:test";

const prismaMock = {
	user: { findUnique: mock() },
	logs: { create: mock() },
};

mock.module("@/configs/database.js", () => ({
	__esModule: true,
	default: prismaMock,
}));

const jwtUtilsMock = {
	verifyAccessToken: mock(),
};
mock.module("@/utils/jwt.js", () => ({
	jwtUtils: jwtUtilsMock,
}));

const getStoredTokenMock = mock();
mock.module("@/utils/tokenStore.js", () => ({
	getStoredToken: getStoredTokenMock,
}));

const loggerMock = {
	info: mock(),
	warn: mock(),
	error: mock(),
};
mock.module("@/utils/logger.js", () => ({
	logger: loggerMock,
}));

// Import the module AFTER defining mocks
import { respons, HttpStatus } from "@/utils/respons.js";

const createReqRes = (token: string = "token-123") => {
	const req: any = {
		headers: {
			authorization: `Bearer ${token}`,
			"x-forwarded-for": "203.0.113.1",
			"user-agent": "UnitTestAgent/1.0",
		},
		socket: { remoteAddress: "10.0.0.1" },
		get: () => "localhost",
		protocol: "http",
		originalUrl: "/api/test",
		method: "POST",
		startTime: Date.now(),
	};

	const res: any = {
		statusCode: 0,
		payload: null,
		status: mock(function (this: any, code: number) {
			this.statusCode = code;
			return this;
		}),
		json: mock(function (this: any, body: any) {
			this.payload = body;
			return this;
		}),
	};

	return { req, res };
};

test("respons.success logs and responds with payload", async () => {
	const { req } = createReqRes("valid-token");

	const ctx = {
		request: { method: "POST", url: "http://localhost/api/test", headers: req.headers } as any,
		set: { status: 0 as number | string, headers: {} as any },
		body: {},
		query: {},
		path: "/api/test",
		reqId: "test-req-id",
		startTime: Date.now(),
		server: { requestIP: () => ({ address: "10.0.0.1", port: 3006 }) },
		user: { id: "user-1", roleName: "admin", profile: { name: "Tester", phone: null, address: null, photo: null, NIK: null } },
	};

	await respons.success("Success message", { hello: "world" }, HttpStatus.OK, ctx);

	expect(ctx.set.status).toBe(200);
	expect(loggerMock.info).toHaveBeenCalled();
});

test("respons.error logs warning when database write fails", async () => {
	const { req } = createReqRes();

	const ctx = {
		request: { method: "POST", url: "http://localhost/api/test", headers: req.headers } as any,
		set: { status: 0 as number | string, headers: {} as any },
		body: {},
		query: {},
		path: "/api/test",
		reqId: "test-req-id",
		startTime: Date.now(),
		server: { requestIP: () => ({ address: "10.0.0.1", port: 3006 }) },
		user: { id: "user-1", roleName: "admin", profile: { name: "Tester", phone: null, address: null, photo: null, NIK: null } },
	};

	prismaMock.logs.create.mockRejectedValue(new Error("DB Error"));

	await respons.error("Error message", { reason: "failure" }, HttpStatus.BAD_REQUEST, ctx);

	expect(ctx.set.status).toBe(400);
	expect(loggerMock.error).toHaveBeenCalled();
	expect(loggerMock.warn).toHaveBeenCalled();
});
