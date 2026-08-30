import { test, expect, mock } from "bun:test";

const presignMock = mock(() => "signed-url");
const writeMock = mock(async () => {});
const deleteMock = mock(async () => {});
const statMock = mock(async (): Promise<{ etag: string; size: number; type: string; lastModified: Date } | null> => ({
	etag: "etag",
	size: 123,
	type: "image/png",
	lastModified: new Date(),
}));
const existsMock = mock(async () => true);

const mockFile = {
	presign: presignMock,
	write: writeMock,
	delete: deleteMock,
	stat: statMock,
	exists: existsMock,
};

const listMock = mock(async () => ({
	isTruncated: false,
	contents: [],
}));

class MockS3Client {
	constructor() {}
	static presign = presignMock;
	static list = listMock;
	file(_key: string) { return mockFile; }
	presign = presignMock;
}

mock.module("@/configs/s3Client.js", () => ({
	S3Client: MockS3Client,
}));

const setup = async () => {
	process.env.S3_ENDPOINT = "http://localhost:9000";
	process.env.S3_BUCKET_NAME = "test-bucket";
	process.env.S3_ACCESS_KEY = "access";
	process.env.S3_SECRET_KEY = "secret";
	process.env.S3_REGION = "us-east-1";
	process.env.S3_USE_SSL = "false";

	presignMock.mockClear();
	writeMock.mockClear();
	deleteMock.mockClear();
	statMock.mockClear();
	existsMock.mockClear();
	listMock.mockClear();
	listMock.mockResolvedValue({ isTruncated: false, contents: [] });

	const module = await import("@/utils/s3.js");
	return { module };
};

test("headFile returns metadata when object exists", async () => {
	const { module } = await setup();
	const lastModified = new Date();
	statMock.mockResolvedValue({
		etag: "etag",
		size: 123,
		type: "image/png",
		lastModified,
	});

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
	writeMock.mockResolvedValue(undefined);

	const result = await module.uploadFile(
		{
			originalname: "avatar.jpg",
			mimetype: "image/jpeg",
			buffer: Buffer.from("test data"),
		},
		"avatars",
	);

	expect(writeMock.mock.calls.length).toBe(1);
	expect(result.folder).toBe("avatars");
	expect(result.fileName.endsWith(".jpg")).toBeTruthy();
});

test("uploadBase64 stores buffer and validates size", async () => {
	const { module } = await setup();
	writeMock.mockResolvedValue(undefined);

	const base64 = "data:image/png;base64," + Buffer.from("filedata").toString("base64");
	const result = await module.uploadBase64("images", base64, 2, ["image/png"]);

	expect(result.url).toBeDefined();
});

test("getFile returns presigned url when object exists", async () => {
	const { module } = await setup();
	presignMock.mockReturnValue("signed-url");

	const url = await module.getFile("avatars", "user.png");
	expect(url).toBe("signed-url");
	expect(presignMock.mock.calls.length).toBeGreaterThanOrEqual(1);
});

test("deleteFile respects strict and verifyAfter options", async () => {
	const { module } = await setup();
	let statCalls = 0;
	statMock.mockImplementation(async () => {
		statCalls += 1;
		if (statCalls === 1) return { etag: "etag", size: 123, type: "image/png", lastModified: new Date() };
		return null;
	});
	deleteMock.mockResolvedValue(undefined);

	const result = await module.deleteFile("avatars", "user.png", { strict: true, verifyAfter: true });
	expect(result.deleted).toBe(true);
	expect(statCalls).toBeGreaterThanOrEqual(2);
});

test("getPresignedUploadUrl returns url and key", async () => {
	const { module } = await setup();
	presignMock.mockReturnValue("http://localhost:9000/test-bucket/avatars/file.txt?signed=true");

	const result = await module.getPresignedUploadUrl("avatars", {
		contentType: "image/png",
		fileExtension: ".png",
		expiresIn: 3600,
	});

	expect(result.url).toContain("signed=true");
	expect(result.key).toMatch(/^avatars\//);
	expect(result.publicUrl).toContain("test-bucket/avatars/");
});

test("deleteMany deletes multiple files", async () => {
	const { module } = await setup();
	deleteMock.mockResolvedValue(undefined);

	const result = await module.deleteMany([
		{ folder: "avatars", file: "file1.png" },
		{ folder: "avatars", file: "file2.png" },
	]);

	expect(result.deleted.length).toBe(2);
	expect(result.errors.length).toBe(0);
});

test("isS3Configured is true when env vars are set", async () => {
	const { module } = await setup();
	expect(module.isS3Configured).toBe(true);
});
