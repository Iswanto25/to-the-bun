import prisma from "@/configs/database.js";
import { Prisma } from "@prisma/client";
import { paginate } from "@/utils/pagination.js";
import { apiError } from "@/utils/respons.js";

type TxClient = Prisma.TransactionClient;

export const settingsRepository = {
	transaction: async <T>(callback: (tx: TxClient) => Promise<T>) => {
		return await prisma.$transaction(callback);
	},

	getAllLogs: async (page: number, limit: number, search?: string, tx: TxClient = prisma) => {
		const whereCondition: Prisma.logsWhereInput = {};

		if (search) {
			whereCondition.OR = [
				{ method: { contains: search, mode: "insensitive" } },
				{ name: { contains: search, mode: "insensitive" } },
				{ reqId: { contains: search, mode: "insensitive" } },
				{ role: { contains: search, mode: "insensitive" } },
			];
		}

		const count = await tx.logs.count({ where: whereCondition });
		const { skip, take, pagination } = paginate(page, limit, count);

		const data = await tx.logs.findMany({
			where: whereCondition,
			skip,
			take,
			select: {
				id: true,
				date: true,
				name: true,
				role: true,
				reqId: true,
				method: true,
				ip: true,
				status: true,
				host: true,
			},
			orderBy: { date: "desc" },
		});

		return { data, pagination };
	},

	getDetailLogs: async (id: number, tx: TxClient = prisma) => {
		try {
			return await tx.logs.findUnique({
				where: { id },
				select: {
					id: true,
					date: true,
					name: true,
					role: true,
					reqId: true,
					method: true,
					ip: true,
					status: true,
					host: true,
					data: true,
				},
			});
		} catch (err) {
			throw new apiError(500, "Gagal mengambil detail log", err instanceof Error ? err.message : String(err));
		}
	},
};
