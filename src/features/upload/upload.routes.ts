import { Elysia } from "elysia";
import { uploadController } from "@/features/upload/controllers/upload.controller.js";
import { verifyToken } from "@/plugins/auth.plugin.js";
import { rateLimiter } from "@/plugins/rateLimiter.plugin.js";

const protectedRoutes = new Elysia({ name: "upload-protected" })
	.use(verifyToken)
	.post("/presigned-url", uploadController.presignedUrl, {
		beforeHandle: [rateLimiter({ windowInSeconds: 60, maxRequests: 30 })],
	})
	.post("/confirm", uploadController.confirm);

export const uploadRoutes = new Elysia({ prefix: "/upload" }).use(protectedRoutes);

export default uploadRoutes;
