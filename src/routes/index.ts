import { Elysia } from "elysia";
import authRoutes from "@/features/auth/auth.routes.js";
import uploadRoutes from "@/features/upload/upload.routes.js";
import settingsRoutes from "@/features/settings/settings.routes.js";

export const apiRoutes = new Elysia({ prefix: "/api" }).use(authRoutes).use(uploadRoutes).use(settingsRoutes);

export default apiRoutes;
