import { test, expect, mock } from "bun:test";

const signMock = mock(() => "mock-jwt-token");
const verifyMock = mock(() => ({ id: "user-1", role: "admin" }));

mock.module("jsonwebtoken", () => ({
	default: {
		sign: signMock,
		verify: verifyMock,
	},
}));

process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const { jwtUtils } = await import("@/utils/jwt.js");

test("jwtUtils.generateAccessToken calls jwt.sign with correct args", () => {
	signMock.mockClear();
	signMock.mockReturnValue("access-token-123");

	const payload = { id: "user-1", role: "admin" };
	const token = jwtUtils.generateAccessToken(payload);

	expect(token).toBe("access-token-123");
	expect(signMock).toHaveBeenCalledWith(payload, "test-secret", { expiresIn: "1d" });
});

test("jwtUtils.generateRefreshToken calls jwt.sign with refresh secret", () => {
	signMock.mockClear();
	signMock.mockReturnValue("refresh-token-456");

	const payload = { id: "user-1" };
	const token = jwtUtils.generateRefreshToken(payload);

	expect(token).toBe("refresh-token-456");
	expect(signMock).toHaveBeenCalledWith(payload, "test-refresh-secret", { expiresIn: "7d" });
});

test("jwtUtils.verifyAccessToken calls jwt.verify with correct secret", () => {
	verifyMock.mockClear();
	verifyMock.mockReturnValue({ id: "user-1", role: "admin" });

	const result = jwtUtils.verifyAccessToken("some-token");

	expect(result).toEqual({ id: "user-1", role: "admin" });
	expect(verifyMock).toHaveBeenCalledWith("some-token", "test-secret");
});

test("jwtUtils.verifyRefreshToken calls jwt.verify with refresh secret", () => {
	verifyMock.mockClear();
	verifyMock.mockReturnValue({ id: "user-1", role: "user" });

	const result = jwtUtils.verifyRefreshToken("refresh-token");

	expect(result).toEqual({ id: "user-1", role: "user" });
	expect(verifyMock).toHaveBeenCalledWith("refresh-token", "test-refresh-secret");
});

test("jwtUtils.verifyAccessToken throws on invalid token", () => {
	verifyMock.mockClear();
	verifyMock.mockImplementation(() => {
		throw new Error("jwt malformed");
	});

	expect(() => jwtUtils.verifyAccessToken("invalid")).toThrow("jwt malformed");
});
