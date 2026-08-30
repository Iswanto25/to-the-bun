declare namespace Bun {
	const version: string;
	const env: Record<string, string | undefined>;

	namespace password {
		function hash(
			password: string | Buffer,
			options?: {
				algorithm?: "bcrypt" | "argon2id" | "argon2d" | "argon2i";
				cost?: number;
				memoryCost?: number;
				timeCost?: number;
			},
		): Promise<string>;
		function verify(password: string | Buffer, hash: string): Promise<boolean>;
	}

	/**
	 * Read a file into memory efficiently
	 */
	function file(path: string | URL | number, options?: { type?: string }): BunFile;

	/**
	 * Write data to a file
	 */
	function write(
		destination: string | URL | number | BunFile,
		data: string | Buffer | ArrayBuffer | Uint8Array | ReadableStream,
		options?: { type?: string; mode?: number },
	): Promise<number>;

	interface BunFile {
		size: number;
		type: string;
		text(): Promise<string>;
		json(): Promise<any>;
		arrayBuffer(): Promise<ArrayBuffer>;
		stream(): ReadableStream;
		bytes(): Promise<Uint8Array>;
		writer(params?: { highWaterMark?: number }): FileSink;
		exists(): Promise<boolean>;
		delete(): Promise<void>;
	}
}
