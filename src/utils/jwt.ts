import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(Bun.env.JWT_SECRET);
const JWT_REFRESH_SECRET = new TextEncoder().encode(Bun.env.JWT_REFRESH_SECRET);

export const jwtUtils = {
	generateAccessToken: async (payload: Record<string, unknown>) => {
		return new jose.SignJWT(payload)
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("1d")
			.sign(JWT_SECRET);
	},
	generateRefreshToken: async (payload: Record<string, unknown>) => {
		return new jose.SignJWT(payload)
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("7d")
			.sign(JWT_REFRESH_SECRET);
	},
	verifyAccessToken: async (token: string) => {
		const { payload } = await jose.jwtVerify(token, JWT_SECRET);
		return payload;
	},
	verifyRefreshToken: async (token: string) => {
		const { payload } = await jose.jwtVerify(token, JWT_REFRESH_SECRET);
		return payload;
	},
};
