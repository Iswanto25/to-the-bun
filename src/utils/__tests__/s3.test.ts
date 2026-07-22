import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect, mock } from "bun:test";
import { createRequire } from "node:module";

const requireModule = createRequire(__filename);
const modulePath = "@/utils/s3";

// Define shared state for handlers
const handlers = new Map<string, (command: any) => any>();
const sendMock = mock(async (command: any) => {
	const handler = handlers.get(command.constructor.name);
	if (!handler) {
		throw new Error(`Unhandled command: ${command.constructor.name}`);
	}
	return handler(command);
});

const getSignedUrl = mock(async () => "signed-url");

class BaseCommand {
	input: any;
	constructor(input: any) {
		this.input = input;
	}
}

mock.module("@aws-sdk/client-s3", () => ({
	S3Client: class {
		async send(command: any) {
			return sendMock(command);
		}
	},
	PutObjectCommand: class extends BaseCommand {},
	GetObjectCommand: class extends BaseCommand {},
	DeleteObjectCommand: class extends BaseCommand {},
	HeadObjectCommand: class extends BaseCommand {},
	DeleteObjectsCommand: class extends BaseCommand {},
	ListObjectsV2Command: class extends BaseCommand {},
	_Object: class {},
}));

mock.module("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl,
}));

const setup = async () => {
	process.env.S3_ENDPOINT = "http://localhost:9000";
	process.env.S3_BUCKET_NAME = "test-bucket";
	process.env.S3_ACCESS_KEY = "access";
	process.env.S3_SECRET_KEY = "secret";
	process.env.S3_REGION = "us-east-1";

	handlers.clear();
	sendMock.mockClear();
	getSignedUrl.mockClear();

	delete requireModule.cache[requireModule.resolve(modulePath)];
	const module = requireModule(modulePath);

	return { module };
};

const createTempFile = (contents: string = "hello world") => {
	const filePath = path.join(os.tmpdir(), `upload-${Date.now()}.txt`);
	fs.writeFileSync(filePath, contents);
	return filePath;
};

test("headFile returns metadata when object exists", async () => {
	const { module } = await setup();
	const lastModified = new Date();
	handlers.set("HeadObjectCommand", async () => ({
		ETag: "etag",
		ContentLength: 123,
		ContentType: "image/png",
		LastModified: lastModified,
	}));

	const result = await module.headFile("avatars", "user.png");
	expect(result).toEqual({
		exists: true,
		etag: "etag",
		contentLength: 123,
		contentType: "image/png",
		lastModified,
	});
});

test("uploadFile uploads stream and removes temp file", async () => {
	const { module } = await setup();

	let capturedKey = "";
	handlers.set("PutObjectCommand", async (command) => {
		capturedKey = command.input.Key;
		return {};
	});

	const tempFile = createTempFile();
	const file = {
		originalname: "avatar.jpg",
		mimetype: "image/jpeg",
		path: tempFile,
	} as any;

	const result = await module.uploadFile(file, "avatars");
	expect(sendMock.mock.calls.length).toBe(1);
	expect(capturedKey.startsWith("avatars/")).toBeTruthy();
	expect(result.folder).toBe("avatars");
	expect(result.fileName.endsWith(".jpg")).toBeTruthy();
	expect(fs.existsSync(tempFile)).toBe(false);
});

test("uploadBase64 stores buffer and validates size", async () => {
	const { module } = await setup();
	let savedContentType = "";
	handlers.set("PutObjectCommand", async (command) => {
		savedContentType = command.input.ContentType;
		return {};
	});

	const base64 = "data:image/png;base64," + Buffer.from("filedata").toString("base64");
	const result = await module.uploadBase64("images", base64, 2, ["image/png"]);

	expect(result.url).toBeDefined();
	expect(savedContentType).toBe("image/png");
});

test("getFile returns presigned url when object exists", async () => {
	const { module } = await setup();
	handlers.set("HeadObjectCommand", async () => ({ ETag: "etag" }));

	const url = await module.getFile("avatars", "user.png");
	expect(url).toBe("signed-url");
	expect(getSignedUrl.mock.calls.length).toBe(1);
});

test("deleteFile respects strict and verifyAfter options", async () => {
	const { module } = await setup();
	let headCalls = 0;
	handlers.set("HeadObjectCommand", async () => {
		headCalls += 1;
		if (headCalls === 1) return { ETag: "etag" };
		const error: any = new Error("NotFound");
		error.name = "NotFound";
		error.$metadata = { httpStatusCode: 404 };
		throw error;
	});
	handlers.set("DeleteObjectCommand", async () => ({}));

	const result = await module.deleteFile("avatars", "user.png", { strict: true, verifyAfter: true });
	expect(result.deleted).toBe(true);
	expect(headCalls).toBe(2);
});
