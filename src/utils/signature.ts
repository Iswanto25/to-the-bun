import crypto from "node:crypto";
import { HttpStatus, respons } from "@/utils/respons.js";

/**
 * Mendapatkan current timestamp dalam format milidetik, disesuaikan ke zona waktu WIB (UTC+7).
 */
function timeFormater(): string {
	const now = new Date();
	// Konversi waktu lokal ke waktu WIB (UTC+7) secara matematis
	const wibOffset = 7 * 60 * 60 * 1000;
	const wibTime = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + wibOffset);
	return wibTime.getTime().toString();
}

/**
 * Generate API Key dengan kondisi lingkungan (Environment-aware)
 */
export async function generateApiKey(userKey: string, secretKey: string): Promise<string> {
	const isProd = Bun.env.NODE_ENV === "production";
	const timestamp = timeFormater();

	if (!isProd) {
		// Mode Dev / Staging: Hanya menggunakan userKey dan secretKey (atau payload sederhana)
		const payload = `${userKey}:${secretKey}`;
		return Buffer.from(payload).toString("base64");
	}

	// Mode Production: Menggunakan HMAC signature dan timestamp WIB
	const dataToSign = `${userKey}:${timestamp}`;
	const hmac = crypto.createHmac("sha256", secretKey);
	hmac.update(dataToSign);
	const signature = hmac.digest("hex");
	const payload = `${userKey}:${timestamp}:${signature}`;
	return Buffer.from(payload).toString("base64");
}

/**
 * Elysia beforeHandle hook — verifikasi API Key dengan kondisi environment
 */
export function verifyApiKey(ctx: any) {
	const apiKey = ctx.headers["x-api-key"];

	if (!apiKey) {
		return respons.error("API key tidak ditemukan", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
	}

	try {
		const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
		const isProd = Bun.env.NODE_ENV === "production";

		if (!isProd) {
			// Mode Dev / Staging: Verifikasi sederhana berdasarkan userKey dan secretKey
			const [userKey, secretKey] = decoded.split(":");

			if (userKey !== Bun.env.USER_KEY || secretKey !== Bun.env.SECRET_KEY) {
				return respons.error("Identitas atau Secret Key tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
			}
			return; // Lolos verifikasi dev/staging
		}

		// Mode Production: Verifikasi lengkap (UserKey, Timestamp WIB, Signature HMAC, dan Expired 5 menit)
		const [userKey, timestamp, signature] = decoded.split(":");

		if (!userKey || !timestamp || !signature) {
			return respons.error("Format tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}

		if (userKey !== Bun.env.USER_KEY) {
			return respons.error("Identitas tidak valid", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}

		const requestTime = parseInt(timestamp);
		const currentTime = parseInt(timeFormater()); // Menggunakan acuan waktu WIB saat verifikasi
		const timeDiff = Math.abs(currentTime - requestTime);
		const maxAge = 5 * 60 * 1000; // 5 menit

		if (timeDiff > maxAge) {
			return respons.error("Request expired", "Unauthorized", HttpStatus.UNAUTHORIZED, ctx);
		}

		const secretKey = Bun.env.SECRET_KEY;
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
