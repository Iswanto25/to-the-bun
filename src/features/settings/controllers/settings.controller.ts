import { settingsServices } from "@/features/settings/services/settings.service.js";
import { HttpStatus, respons, apiError } from "@/utils/respons.js";

export const settingsController = {
	getAllLogs: async (ctx: any) => {
		try {
			const page = ctx.query.page ? Number(ctx.query.page) : 1;
			const limit = ctx.query.limit ? Number(ctx.query.limit) : 10;
			const search = ctx.query.search || "";
			const result = await settingsServices.getAllLogs(page, limit, search);
			return respons.success("Berhasil mengambil logs", result.data, HttpStatus.OK, ctx, result.pagination);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},

	getDetailLogs: async (ctx: any) => {
		try {
			const id = ctx.params.id ? Number(ctx.params.id) : 0;
			const result = await settingsServices.getDetailLogs(id);
			return respons.success("Berhasil mengambil detail log", result, HttpStatus.OK, ctx);
		} catch (error) {
			if (error instanceof apiError) {
				return respons.error(error.message, error.message, error.statusCode, ctx);
			}
			throw error;
		}
	},
};
