import type { AuthUser } from "@/plugins/requestContext.plugin.js";
import prisma from "@/configs/database.js";
import { HttpStatus, respons } from "@/utils/respons.js";
import type { Action } from "@prisma/client";

export const requirePermission = (resourceName: string, action: string) => {
	return async (ctx: any) => {
		try {
			const user = ctx.user as AuthUser | undefined;
			if (!user || !user.roleId) {
				return respons.error("Forbidden", "Akses ditolak", HttpStatus.FORBIDDEN, ctx);
			}

			const rolePermission = await prisma.rolePermission.findFirst({
				where: {
					roleId: user.roleId,
					resource: {
						name: resourceName,
					},
				},
			});

			if (!rolePermission) {
				return respons.error("Forbidden", "Anda tidak memiliki izin untuk resource ini", HttpStatus.FORBIDDEN, ctx);
			}

			if (!rolePermission.grantedActions.includes(action as Action)) {
				return respons.error("Forbidden", `Anda tidak memiliki izin aksi '${action}' pada resource ini`, HttpStatus.FORBIDDEN, ctx);
			}
		} catch {
			return respons.error("Internal Server Error", "Gagal memverifikasi izin auth", HttpStatus.INTERNAL_SERVER_ERROR, ctx);
		}
	};
};
