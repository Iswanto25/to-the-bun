import { settingsRepository } from "@/features/settings/repositories/settings.repository.js";
import { apiError } from "@/utils/respons.js";

export const settingsServices = {
	async getAllLogs(page: number, limit: number, search?: string) {
		return await settingsRepository.getAllLogs(page, limit, search);
	},

	async getDetailLogs(id: number) {
		const log = await settingsRepository.getDetailLogs(id);
		if (!log) throw new apiError(404, "Log tidak ditemukan");
		return log;
	},
};
