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
	const { req, res } = createReqRes("valid-token");

	jwtUtilsMock.verifyAccessToken.mockReturnValue({ id: "user-1" });
	getStoredTokenMock.mockResolvedValue("valid-token");
	prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", profile: { name: "Tester" }, role: { name: "admin" } });
	prismaMock.logs.create.mockResolvedValue({});

	await respons.success("Success message", { hello: "world" }, HttpStatus.OK, res, req);

	expect(res.statusCode).toBe(200);
	expect(res.payload.success).toBe(true);
	expect(prismaMock.user.findUnique).toHaveBeenCalled();
	expect(prismaMock.logs.create).toHaveBeenCalled();
	expect(loggerMock.info).toHaveBeenCalled();
});

test("respons.error logs warning when database write fails", async () => {
	const { req, res } = createReqRes();

	jwtUtilsMock.verifyAccessToken.mockReturnValue({ id: "user-1" });
	getStoredTokenMock.mockResolvedValue("token-123");
	prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", profile: { name: "Tester" } });
	prismaMock.logs.create.mockRejectedValue(new Error("DB Error"));

	await respons.error("Error message", { reason: "failure" }, HttpStatus.BAD_REQUEST, res, req);

	expect(res.statusCode).toBe(400);
	expect(res.payload.success).toBe(false);
	expect(loggerMock.error).toHaveBeenCalled();
	expect(loggerMock.warn).toHaveBeenCalled(); // Should log warning when DB write fails
});
