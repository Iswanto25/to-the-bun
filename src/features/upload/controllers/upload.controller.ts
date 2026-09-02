import { uploadServices } from "@/features/upload/services/upload.service.js";
import { respons, validateOrThrow, HttpStatus } from "@/utils/respons.js";
import { uploadValidation } from "@/features/upload/validations/upload.validation.js";

export const uploadController = {
	presignedUrl: async (ctx: any) => {
		const data = validateOrThrow(uploadValidation.presignedUrl, ctx.body);
		const result = await uploadServices.getPresignedUrl(data);
		return respons.success("Berhasil generate presigned URL", result, HttpStatus.OK, ctx);
	},

	confirm: async (ctx: any) => {
		const { folder, fileName } = validateOrThrow<{ folder: string; fileName: string }>(uploadValidation.confirm, ctx.body);
		const result = await uploadServices.confirmUpload(folder, fileName);
		return respons.success("Upload berhasil dikonfirmasi", result, HttpStatus.OK, ctx);
	},
};
