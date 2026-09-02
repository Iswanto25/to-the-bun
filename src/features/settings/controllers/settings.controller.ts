import { settingsServices } from "@/features/settings/services/settings.service.js";
import { HttpStatus, respons } from "@/utils/respons.js";

export const settingsController = {
	getAllLogs: async (ctx: any) => {
		const page = ctx.query.page ? Number(ctx.query.page) : 1;
		const limit = ctx.query.limit ? Number(ctx.query.limit) : 10;
		const search = ctx.query.search || "";
		const result = await settingsServices.getAllLogs(page, limit, search);
		return respons.success("Berhasil mengambil logs", result.data, HttpStatus.OK, ctx, result.pagination);
	},

	getDetailLogs: async (ctx: any) => {
		const id = Number(ctx.params.id);
		if (isNaN(id) || id <= 0) {
			return respons.error("Log tidak ditemukan", "Log tidak ditemukan", HttpStatus.NOT_FOUND, ctx);
		}
		const result = await settingsServices.getDetailLogs(id);
		return respons.success("Berhasil mengambil detail log", result, HttpStatus.OK, ctx);
	},
};
