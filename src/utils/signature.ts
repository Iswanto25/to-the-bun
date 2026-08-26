import crypto from "node:crypto";
import { HttpStatus, respons } from "@/utils/respons.js";

/**
 * Generate a secure API Key with HMAC signature
 */
export async function generateApiKey(userKey: string, secretKey: string): Promise<string> {
	const timestamp = Date.now().toString();
	const dataToSign = `${userKey}:${timestamp}`;
	const hmac = crypto.createHmac("sha256", secretKey);
	hmac.update(dataToSign);
	const signature = hmac.digest("hex");
	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

/**
 * Elysia beforeHandle hook — verify API Key and Signature
 * Usage: .get("/endpoint", handler, { beforeHandle: [verifyApiKey] })
 */
export function verifyApiKey(ctx: any) {
	const apiKey = ctx.headers["x-api-key"];

	if (!apiKey) {
		return respons.error("API key tidak ditemukan", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
	}

	try {
		const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
		const [userKey, timestamp, signature] = decoded.split(":");

		if (!userKey || !timestamp || !signature) {
			return respons.error("Format tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}

		if (userKey !== process.env.USER_KEY) {
			return respons.error("Identitas tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}

		const requestTime = parseInt(timestamp);
		const currentTime = Date.now();
		const timeDiff = Math.abs(currentTime - requestTime);
		const maxAge = 5 * 60 * 1000; // 5 minutes

		if (timeDiff > maxAge) {
			return respons.error("Request expired", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}

		const secretKey = process.env.SECRET_KEY;
		if (!secretKey) {
			return respons.error("Server configuration error", "Internal Server Error", HttpStatus.INTERNAL_SERVER_ERROR, ctx);
		}

		const dataToVerify = `${userKey}:${timestamp}`;
		const hmac = crypto.createHmac("sha256", secretKey);
		hmac.update(dataToVerify);
		const expectedSignature = hmac.digest("hex");

		if (signature !== expectedSignature) {
			return respons.error("Signature tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}
	} catch {
		return respons.error("Gagal memproses kunci", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
	}
}
