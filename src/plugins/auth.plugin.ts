import { Elysia } from "elysia";
import prisma from "@/configs/database.js";
import { jwtUtils } from "@/utils/jwt.js";
import { respons, HttpStatus } from "@/utils/respons.js";
import { getStoredToken } from "@/utils/tokenStore.js";
import type { AuthUser } from "@/plugins/requestContext.plugin.js";

export interface DecodedToken {
	id: string;
	email: string;
}

export const authenticate = {
	async checkToken(request: Request): Promise<{ valid: boolean; userId?: string }> {
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return { valid: false };
		}

		const token = authHeader.split(" ")[1];
		try {
			const decoded = (await jwtUtils.verifyAccessToken(token)) as unknown as DecodedToken;
			const storedToken = await getStoredToken(decoded.id, "access");
			if (storedToken !== token) return { valid: false };
			return { valid: true, userId: decoded.id };
		} catch {
			return { valid: false };
		}
	},
};

export const verifyToken = new Elysia({ name: "auth-verify-token" })
	.derive({ as: "scoped" }, async (ctx: any) => {
		const result = await authenticate.checkToken(ctx.request);
		if (!result.valid || !result.userId) {
			return {
				user: null,
				authError: respons.error("Tidak terautentikasi", "Tidak terautentikasi", HttpStatus.UNAUTHORIZED, {
					request: ctx.request,
					set: ctx.set,
					path: ctx.path,
					server: ctx.server,
				}),
			};
		}

		const existingUser = await prisma.user.findUnique({
			where: { id: result.userId },
			include: { profile: true, role: true },
		});

		if (!existingUser) {
			return {
				user: null,
				authError: respons.error("User tidak ditemukan", "User tidak ditemukan", HttpStatus.UNAUTHORIZED, {
					request: ctx.request,
					set: ctx.set,
					path: ctx.path,
					server: ctx.server,
				}),
			};
		}

		return {
			user: {
				id: existingUser.id,
				email: existingUser.email,
				roleId: existingUser.roleId,
				roleName: existingUser.role.name,
				profile: existingUser.profile,
			} as AuthUser,
			authError: null,
		};
	})
	.onBeforeHandle({ as: "scoped" }, (ctx: any) => {
		if (ctx.authError) {
			return ctx.authError;
		}
	});
