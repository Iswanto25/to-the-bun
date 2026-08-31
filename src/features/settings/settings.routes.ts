import { Elysia } from "elysia";
import { settingsController } from "@/features/settings/controllers/settings.controller.js";
import { verifyToken } from "@/plugins/auth.plugin.js";

const protectedRoutes = new Elysia({ name: "settings-protected" })
	.use(verifyToken)
	.get("/logs", settingsController.getAllLogs)
	.get("/logs/:id", settingsController.getDetailLogs);

export const settingsRoutes = new Elysia({ prefix: "/settings" }).use(protectedRoutes);

export default settingsRoutes;
