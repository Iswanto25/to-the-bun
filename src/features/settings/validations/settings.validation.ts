import { z } from "zod";

export const settingsValidation = {
	getLogs: z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(10),
		search: z.string().optional(),
	}),

	getLogDetail: z.object({
		id: z.coerce.number().int().positive(),
	}),
};
