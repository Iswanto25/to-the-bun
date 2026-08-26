import { Elysia } from "elysia";
import authRoutes from "@/features/auth/auth.routes.js";
import uploadRoutes from "@/features/upload/upload.routes.js";

export const apiRoutes = new Elysia({ prefix: "/api" }).use(authRoutes).use(uploadRoutes);

export default apiRoutes;
