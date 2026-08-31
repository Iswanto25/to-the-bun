import { authServices } from "@/features/auth/services/auth.service.js";
import { HttpStatus, respons, validateOrThrow, apiError } from "@/utils/respons.js";
import { authValidation } from "@/features/auth/validations/auth.validation.js";

const ALLOWED_PHOTO_MIMES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export const authController = {
	register: async (ctx: any) => {
		const data = validateOrThrow(authValidation.register, ctx.body);
		try {
			const result = await authServices.register(data);
			return respons.success("Berhasil register", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	login: async (ctx: any) => {
		const data = validateOrThrow<{ email: string; password: string }>(authValidation.login, ctx.body);
		try {
			const result = await authServices.login(data.email, data.password);
			return respons.success("Berhasil login", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	logout: async (ctx: any) => {
		try {
			const result = await authServices.logout(ctx.user.id);
			return respons.success("Berhasil logout", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	refreshToken: async (ctx: any) => {
		const body = ctx.body as { refreshToken?: string };
		const refreshToken = validateOrThrow<string>(authValidation.refreshToken, body?.refreshToken);
		try {
			const result = await authServices.refreshToken(refreshToken);
			return respons.success("Berhasil refresh token", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	profile: async (ctx: any) => {
		try {
			const result = await authServices.profile(ctx.user.id);
			return respons.success("Berhasil get profile", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	forgotPassword: async (ctx: any) => {
		const data = validateOrThrow<{ email: string }>(authValidation.forgotPassword, ctx.body);
		try {
			const result = await authServices.forgotPassword(data.email);
			return respons.success("Berhasil kirim email", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	sendOtp: async (ctx: any) => {
		const data = validateOrThrow(authValidation.sendOtp, { ...ctx.body, ...ctx.query });
		try {
			const result = await authServices.sendOtp(data);
			return respons.success("OTP berhasil dikirim ke email", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	verifyOtp: async (ctx: any) => {
		const data = validateOrThrow(authValidation.verifyOtp, ctx.body);
		try {
			const result = await authServices.verifyOtp(data);
			return respons.success("OTP berhasil diverifikasi", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	resetPassword: async (ctx: any) => {
		const data = validateOrThrow(authValidation.resetPassword, { token: ctx.query.token, ...ctx.body });
		try {
			const result = await authServices.resetPassword(data);
			return respons.success("Password berhasil diubah", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	getUsers: async (ctx: any) => {
		const query = ctx.query as Record<string, string | undefined>;
		const page = Number(query.page || 1);
		const limit = Number(query.limit || 10);
		const search = query.search;
		try {
			const result = await authServices.getUsers(page, limit, search);
			return respons.success("Berhasil get users", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	updateProfile: async (ctx: any) => {
		const data = validateOrThrow(authValidation.updateProfile, ctx.body);
		try {
			const result = await authServices.updateProfile(ctx.user.id, data);
			return respons.success("Berhasil update profile", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	deleteProfile: async (ctx: any) => {
		const id = ctx.params.id as string;
		if (!id) {
			return respons.error("Id tidak boleh kosong", "Id tidak boleh kosong", HttpStatus.BAD_REQUEST, ctx);
		}
		if (ctx.user.id !== id && ctx.user.roleName !== "Superadmin") {
			return respons.error(
				"Anda tidak memiliki akses untuk menghapus profil ini",
				"Anda tidak memiliki akses untuk menghapus profil ini",
				HttpStatus.FORBIDDEN,
				ctx,
			);
		}
		try {
			await authServices.deleteProfile(id);
			return respons.success("Berhasil menghapus profile", {}, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	updatePhoto: async (ctx: any) => {
		const file = (ctx.body as { photo?: File })?.photo;

		if (!(file instanceof File)) {
			return respons.error("File foto wajib diunggah", "File foto wajib diunggah", HttpStatus.BAD_REQUEST, ctx);
		}

		if (!ALLOWED_PHOTO_MIMES.includes(file.type.toLowerCase())) {
			return respons.error(
				"Tipe file tidak diizinkan. Gunakan format JPEG, PNG, JPG, atau WEBP.",
				"Tipe file tidak diizinkan. Gunakan format JPEG, PNG, JPG, atau WEBP.",
				HttpStatus.UNSUPPORTED_MEDIA_TYPE,
				ctx,
			);
		}

		if (file.size > MAX_PHOTO_SIZE) {
			return respons.error(
				"Ukuran file terlalu besar. Maksimum 5MB.",
				"Ukuran file terlalu besar. Maksimum 5MB.",
				HttpStatus.PAYLOAD_TOO_LARGE,
				ctx,
			);
		}

		try {
			const result = await authServices.updatePhoto(ctx.user.id, file);
			return respons.success("Berhasil update foto profil", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	updatePhotoDirect: async (ctx: any) => {
		const data = validateOrThrow<{ contentType?: string }>(authValidation.updatePhotoDirect, ctx.body);
		try {
			const result = await authServices.updatePhotoDirect(ctx.user.id, data.contentType);
			return respons.success("Berhasil update foto profil", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},
};
