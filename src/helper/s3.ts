import { S3Client } from "@/configs/s3Client.js";
import path from "node:path";
import { randomString } from "@/utils/utils.js";
import { logger } from "@/utils/logger.js";

function normalizeEndpoint(raw?: string, useSSL?: boolean, port?: string): string | null {
	if (!raw?.trim()) return null;
	let e = raw.trim();
	while (e.endsWith("/")) e = e.slice(0, -1);
	const lower = e.toLowerCase();
	if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
		e = `${useSSL ? "https" : "http"}://${e}`;
	}
	if (port) {
		try {
			const u = new URL(e);
			if (!u.port) {
				u.port = port;
				e = u.toString();
				while (e.endsWith("/")) e = e.slice(0, -1);
			}
		} catch {
			void 0;
		}
	}
	return e;
}

const USE_SSL = String(Bun.env.S3_USE_SSL || "").toLowerCase() === "true";
const S3_PORT = Bun.env.S3_PORT?.trim();
const ENDPOINT = normalizeEndpoint(Bun.env.S3_ENDPOINT, USE_SSL, S3_PORT);
const BUCKET = Bun.env.S3_BUCKET_NAME?.trim();
const ACCESS_KEY = Bun.env.S3_ACCESS_KEY?.trim();
const SECRET_KEY = Bun.env.S3_SECRET_KEY?.trim();

const isS3Configured = !!(ENDPOINT && BUCKET && ACCESS_KEY && SECRET_KEY);

const s3Holder: { client: S3Client | null } = { client: null };

if (isS3Configured) {
	try {
		s3Holder.client = new S3Client({
			accessKeyId: ACCESS_KEY,
			secretAccessKey: SECRET_KEY,
			bucket: BUCKET,
			endpoint: ENDPOINT,
		});
		console.info("S3 Storage configured successfully");
	} catch {
		console.warn("S3 Storage initialization failed - file upload features will be disabled");
		s3Holder.client = null;
	}
} else {
	console.warn("S3 Storage not configured (S3_ENDPOINT, S3_BUCKET_NAME, S3_ACCESS_KEY, S3_SECRET_KEY) - file upload features will be disabled");
}

function publicUrl(key: string): string {
	return `${ENDPOINT}/${BUCKET}/${key}`;
}

export function getPublicUrl(folder: string, file: string): string {
	const publicBaseUrl = (Bun.env.STORAGE_PUBLIC_URL || "").replace(/^"|"$/g, "").replace(/\/$/, "");
	const bucket = (Bun.env.S3_BUCKET_NAME || "").trim();
	return `${publicBaseUrl}/${bucket}/${folder}/${file}`;
}

export async function getPresignedUploadUrl(
	folder: string,
	opts: {
		contentType?: string;
		fileExtension?: string;
		expiresIn?: number;
		maxSize?: number;
	} = {},
): Promise<{ url: string; key: string; publicUrl: string; fields?: Record<string, string> }> {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

	const ext =
		opts.fileExtension ?
			opts.fileExtension.startsWith(".") ?
				opts.fileExtension
			:	`.${opts.fileExtension}`
		:	"";
	const fileName = `${randomString()}${ext}`;
	const key = `${folder}/${fileName}`;
	const expiresIn = opts.expiresIn ?? 3600;

	const url = s3.presign(key, {
		method: "PUT",
		expiresIn,
		...(opts.contentType ? { type: opts.contentType } : {}),
	});

	return { url, key, publicUrl: publicUrl(key) };
}

function throwS3NotConfigured(): never {
	throw Object.assign(new Error("S3 Storage is not configured"), {
		name: "S3NotConfiguredError",
		code: "S3_NOT_CONFIGURED",
		httpStatus: 503,
		hint: "Please configure S3_ENDPOINT, S3_BUCKET_NAME, S3_ACCESS_KEY, and S3_SECRET_KEY in your environment variables",
	});
}

export async function headFile(folder: string, file: string) {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

	const key = `${folder}/${file}`;
	try {
		const s3File = s3.file(key);
		const stat = await s3File.stat();
		if (!stat) return { exists: false as const };
		return {
			exists: true as const,
			etag: stat.etag,
			contentLength: stat.size,
			contentType: stat.type,
			lastModified: stat.lastModified,
		};
	} catch (err) {
		const error = err as { status?: number };
		if (error?.status === 404) return { exists: false as const };
		throw err;
	}
}

export async function uploadFile(file: { originalname: string; mimetype: string; path?: string; buffer?: Buffer }, folder: string) {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

	const fileExtension = path.extname(file.originalname) || "";
	const fileName = `${randomString()}${fileExtension}`;
	const key = `${folder}/${fileName}`;

	let body: Buffer;
	if (file.path) {
		const fileBuffer = await Bun.file(file.path).arrayBuffer();
		body = Buffer.from(fileBuffer);
	} else if (file.buffer) {
		body = file.buffer;
	} else {
		throw new Error("File must have either path or buffer");
	}

	try {
		const s3File = s3.file(key);
		await s3File.write(body, {
			type: file.mimetype || "application/octet-stream",
		});
		return { fileName, folder };
	} finally {
		if (file.path) {
			try {
				await Bun.file(file.path).delete();
			} catch {
				void 0;
			}
		}
	}
}

function stripAsciiWhitespace(s: string): string {
	const chars: string[] = [];
	for (let i = 0; i < s.length; i++) {
		const cp = s.codePointAt(i) ?? -1;
		if (cp !== 32 && cp !== 9 && cp !== 10 && cp !== 13) chars.push(s[i]);
	}
	return chars.join("");
}

function isValidBase64String(s: string): boolean {
	for (let i = 0; i < s.length; i++) {
		const cp = s.codePointAt(i) ?? -1;
		const valid = (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122) || (cp >= 48 && cp <= 57) || cp === 43 || cp === 47 || cp === 61;
		if (!valid) return false;
	}
	return true;
}

function parseBase64Input(raw: string): { mimeType: string; base64Data: string } {
	const DATA_URI_PREFIX = "data:";
	const BASE64_MARKER = ";base64,";

	if (raw.startsWith(DATA_URI_PREFIX)) {
		const markerIdx = raw.indexOf(BASE64_MARKER);
		if (markerIdx !== -1) {
			return {
				mimeType: raw.slice(DATA_URI_PREFIX.length, markerIdx).toLowerCase(),
				base64Data: raw.slice(markerIdx + BASE64_MARKER.length),
			};
		}
		return { mimeType: "application/octet-stream", base64Data: raw };
	}

	const sanitized = stripAsciiWhitespace(raw);
	if (!isValidBase64String(sanitized)) {
		throw Object.assign(new Error("Format base64 tidak valid."), {
			name: "UploadBase64Error",
			code: "INVALID_BASE64",
			httpStatus: 400,
			hint: "Pastikan string base64 tidak mengandung karakter di luar A–Z, a–z, 0–9, +, /, =.",
		});
	}
	return { mimeType: "image/jpeg", base64Data: sanitized };
}

export async function uploadBase64(folder: string, file: string, maxSizeInMB: number = 10, allowedFormats?: string[]) {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

	if (typeof file !== "string") {
		throw Object.assign(new Error("Field 'file' harus berupa string base64 atau data URI."), {
			name: "UploadBase64Error",
			code: "INVALID_TYPE",
			httpStatus: 400,
			hint: "Kirim 'file' sebagai data:image/jpeg;base64,... atau base64 murni.",
		});
	}

	const totalStartTime = Date.now();
	const memStart = process.memoryUsage().heapUsed / 1024 / 1024;

	const parsed = parseBase64Input(file.trim());
	let mimeType = parsed.mimeType;
	const { base64Data } = parsed;

	if (mimeType === "image/jpg") mimeType = "image/jpeg";

	if (allowedFormats?.length && !allowedFormats.includes(mimeType)) {
		throw Object.assign(new Error(`Tipe file tidak diizinkan: ${mimeType}`), {
			name: "UploadBase64Error",
			code: "UNSUPPORTED_MEDIA_TYPE",
			httpStatus: 415,
			details: { allowed: allowedFormats },
			hint: `Gunakan salah satu: ${allowedFormats.join(", ")}`,
		});
	}

	const decodeStart = Date.now();
	const buffer = Buffer.from(stripAsciiWhitespace(base64Data), "base64");
	const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
	const decodeTime = Date.now() - decodeStart;
	logger.info(`decode: ${decodeTime}ms`);
	logger.info(`File size: ${fileSizeMB} MB | Memory after decode: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

	const maxBytes = maxSizeInMB * 1024 * 1024;
	if (buffer.length > maxBytes) {
		throw Object.assign(new Error(`Ukuran file terlalu besar. Maksimum ${maxSizeInMB}MB.`), {
			name: "UploadBase64Error",
			code: "PAYLOAD_TOO_LARGE",
			httpStatus: 413,
			details: { sizeBytes: buffer.length, maxBytes },
			hint: "Kompres gambar atau turunkan resolusi sebelum upload.",
		});
	}

	const ext = (mimeType.split("/")[1] || "bin").toLowerCase();
	const fileName = `${randomString()}.${ext}`;
	const key = `${folder}/${fileName}`;

	const uploadStart = Date.now();
	try {
		const s3File = s3.file(key);
		await s3File.write(new Response(buffer), {
			type: mimeType,
		});
		const uploadTime = Date.now() - uploadStart;
		logger.info(`upload: ${uploadTime}ms`);
	} catch (e) {
		const uploadTime = Date.now() - uploadStart;
		const totalTime = Date.now() - totalStartTime;
		logger.error(`Upload failed after ${totalTime}ms (upload stage: ${uploadTime}ms)`);
		throw Object.assign(new Error("Gagal menyimpan objek ke storage."), {
			name: "UploadBase64Error",
			code: "STORAGE_WRITE_FAILED",
			httpStatus: 502,
			details: { storage: "s3", message: (e as Error)?.message },
			hint: "Periksa koneksi ke S3 Storage, credential, permission bucket, dan endpoint.",
		});
	}

	const totalTime = Date.now() - totalStartTime;
	const memEnd = process.memoryUsage().heapUsed / 1024 / 1024;
	logger.info(`Total upload time: ${totalTime}ms | Memory delta: ${(memEnd - memStart).toFixed(2)} MB`);

	return { fileName, folder, url: publicUrl(key) };
}

export async function getFile(
	folder: string,
	file: string,
	expired: number = 3600,
	opts?: {
		ensureExists?: boolean;
		cacheControl?: string;
		contentDisposition?: "inline" | `attachment; filename="${string}"`;
		contentType?: string;
	},
): Promise<string | null> {
	if (!s3Holder.client) {
		console.warn("S3 Storage not configured - cannot generate presigned URL");
		return null;
	}
	const s3 = s3Holder.client;

	const ensureExists = opts?.ensureExists ?? true;
	const key = `${folder}/${file}`;

	try {
		if (ensureExists) {
			const head = await headFile(folder, file);
			if (!head.exists) return null;
		}

		const url = s3.presign(key, {
			method: "GET",
			expiresIn: expired,
		});

		return url;
	} catch (error) {
		logger.error({ err: error }, "Error getFile from S3 Storage");
		return null;
	}
}

export async function deleteFile(
	folder: string,
	file: string,
	opts?: { strict?: boolean; verifyAfter?: boolean },
): Promise<{ deleted: boolean; key: string; reason?: "not_found" | "still_exists" | "error" | "s3_not_configured" }> {
	if (!s3Holder.client) {
		console.warn("S3 Storage not configured - cannot delete file");
		return { deleted: false, key: `${folder}/${file}`, reason: "s3_not_configured" };
	}
	const s3 = s3Holder.client;

	const key = `${folder}/${file}`;
	const strict = opts?.strict ?? true;
	const verifyAfter = opts?.verifyAfter ?? false;

	try {
		if (strict) {
			const pre = await headFile(folder, file);
			if (!pre.exists) return { deleted: false, key, reason: "not_found" };
		}

		const s3File = s3.file(key);
		await s3File.delete();

		if (verifyAfter) {
			const post = await headFile(folder, file);
			if (post.exists) return { deleted: false, key, reason: "still_exists" };
		}

		return { deleted: true, key };
	} catch (error) {
		logger.error({ err: error }, "Error deleteFile from S3 Storage");
		return { deleted: false, key, reason: "error" };
	}
}

export async function deleteMany(items: Array<{ folder: string; file: string }>): Promise<{ deleted: string[]; errors: string[] }> {
	if (!s3Holder.client) {
		console.warn("S3 Storage not configured - cannot delete files");
		return { deleted: [], errors: items.map((i) => `${i.folder}/${i.file}: S3 not configured`) };
	}
	const s3 = s3Holder.client;

	if (!items.length) return { deleted: [], errors: [] };

	const deleted: string[] = [];
	const errors: string[] = [];

	for (const item of items) {
		const key = `${item.folder}/${item.file}`;
		try {
			const s3File = s3.file(key);
			await s3File.delete();
			deleted.push(key);
		} catch (err) {
			errors.push(`${key}: ${(err as Error)?.message || "Delete failed"}`);
		}
	}

	return { deleted, errors };
}

export async function deleteByPrefix(prefix: string): Promise<{ deleted: number; errors: number }> {
	if (!s3Holder.client) {
		console.warn("S3 Storage not configured - cannot delete by prefix");
		return { deleted: 0, errors: 0 };
	}
	const s3 = s3Holder.client;

	const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
	let totalDeleted = 0;
	let totalErrors = 0;

	try {
		const result = await S3Client.list(
			{ prefix: normalizedPrefix, maxKeys: 1000 },
			{
				accessKeyId: ACCESS_KEY,
				secretAccessKey: SECRET_KEY,
				bucket: BUCKET,
				endpoint: ENDPOINT ?? undefined,
			},
		);

		const objects = result.contents ?? [];
		if (!objects.length) return { deleted: 0, errors: 0 };

		for (const obj of objects) {
			try {
				const s3File = s3.file(obj.key);
				await s3File.delete();
				totalDeleted++;
			} catch {
				totalErrors++;
			}
		}
	} catch (err) {
		logger.error({ err }, "Error deleting by prefix");
		totalErrors++;
	}

	return { deleted: totalDeleted, errors: totalErrors };
}

const s3 = s3Holder.client;
export { s3, isS3Configured };
