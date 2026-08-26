import { Elysia } from "elysia";
import { authController } from "@/features/auth/controllers/auth.controller.js";
import { verifyToken } from "@/plugins/auth.plugin.js";
import { rateLimiter } from "@/plugins/rateLimiter.plugin.js";

const publicRoutes = new Elysia()
	.post("/register", authController.register)
	.post("/login", authController.login)
	.post("/forgot-password", authController.forgotPassword, {
		beforeHandle: [rateLimiter({ windowInSeconds: 30, maxRequests: 5 })],
	})
	.post("/reset-password", authController.resetPassword, {
		beforeHandle: [rateLimiter({ windowInSeconds: 30, maxRequests: 5 })],
	})
	.post("/send-otp", authController.sendOtp, {
		beforeHandle: [rateLimiter({ windowInSeconds: 60, maxRequests: 3 })],
	})
	.post("/verify-otp", authController.verifyOtp, {
		beforeHandle: [rateLimiter({ windowInSeconds: 60, maxRequests: 5 })],
	});

const protectedRoutes = new Elysia({ name: "auth-protected" })
	.use(verifyToken)
	.post("/logout", authController.logout)
	.post("/refresh-token", authController.refreshToken)
	.get("/profile", authController.profile, {
		beforeHandle: [rateLimiter({ windowInSeconds: 30, maxRequests: 3, useUserId: true })],
	})
	.get("/users", authController.getUsers)
	.patch("/profile", authController.updateProfile)
	.patch("/profile/photo", authController.updatePhoto)
	.patch("/profile/photo/direct", authController.updatePhotoDirect)
	.delete("/profile/:id", authController.deleteProfile);

export const authRoutes = new Elysia({ prefix: "/auth" }).use(publicRoutes).use(protectedRoutes);

export default authRoutes;
