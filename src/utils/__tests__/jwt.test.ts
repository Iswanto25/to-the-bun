import { test, expect } from "bun:test";
import * as jose from "jose";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const { jwtUtils } = await import("@/utils/jwt.js");

test("jwtUtils.generateAccessToken returns a valid JWT string", async () => {
	const payload = { id: "user-1", role: "admin" };
	const token = await jwtUtils.generateAccessToken(payload);

	expect(typeof token).toBe("string");
	expect(token.split(".")).toHaveLength(3);

	const { payload: decoded } = await jose.jwtVerify(token, new TextEncoder().encode("test-secret"));
	expect(decoded.id).toBe("user-1");
	expect(decoded.role).toBe("admin");
});

test("jwtUtils.generateRefreshToken returns a valid JWT string with refresh secret", async () => {
	const payload = { id: "user-1" };
	const token = await jwtUtils.generateRefreshToken(payload);

	expect(typeof token).toBe("string");
	expect(token.split(".")).toHaveLength(3);

	const { payload: decoded } = await jose.jwtVerify(token, new TextEncoder().encode("test-refresh-secret"));
	expect(decoded.id).toBe("user-1");
});

test("jwtUtils.verifyAccessToken verifies a valid token", async () => {
	const token = await new jose.SignJWT({ id: "user-1", role: "admin" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("1d")
		.sign(new TextEncoder().encode("test-secret"));

	const decoded = await jwtUtils.verifyAccessToken(token);
	expect(decoded.id).toBe("user-1");
	expect(decoded.role).toBe("admin");
});

test("jwtUtils.verifyRefreshToken verifies a valid refresh token", async () => {
	const token = await new jose.SignJWT({ id: "user-1", role: "user" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("7d")
		.sign(new TextEncoder().encode("test-refresh-secret"));

	const decoded = await jwtUtils.verifyRefreshToken(token);
	expect(decoded.id).toBe("user-1");
	expect(decoded.role).toBe("user");
});

test("jwtUtils.verifyAccessToken rejects an invalid token", async () => {
	await expect(jwtUtils.verifyAccessToken("invalid-token")).rejects.toThrow();
});
