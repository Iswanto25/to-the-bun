import prisma from "../src/configs/database.js";
import { Action } from "@prisma/client";

const IS_SEED_ENABLED = true;

async function main() {
	if (!IS_SEED_ENABLED) {
		console.info("🌱 [SEED] Seeding dilewati (IS_SEED_ENABLED = false).");
		return;
	}

	console.info("🌱 [SEED] Memulai proses database seeding (konsep upsert)...");

	const roles = [
		{
			id: "a1b2c3d4-e5f6-4a7b-8c9d-0123456789ab",
			name: "Superadmin",
			status: true,
		},
		{
			id: "f47ac10b-58cc-4372-a567-0e02b2c3d4e5",
			name: "USER",
			status: true,
		},
	];

	for (const role of roles) {
		await prisma.role.upsert({
			where: { id: role.id },
			update: { name: role.name, status: role.status },
			create: role,
		});
	}
	console.info(`✅ [SEED] ${roles.length} roles berhasil di-upsert.`);

	const modules = [
		{
			id: "11111111-2222-4333-8444-555555555555",
			number: 1,
			name: "Authentication",
		},
		{
			id: "66666666-7777-4888-8999-000000000000",
			number: 2,
			name: "User Management",
		},
	];

	for (const mod of modules) {
		await prisma.module.upsert({
			where: { id: mod.id },
			update: { name: mod.name, number: mod.number },
			create: mod,
		});
	}
	console.info(`✅ [SEED] ${modules.length} modules berhasil di-upsert.`);

	const resources = [
		{
			id: "77777777-8888-4999-8000-111111111111",
			number: 1,
			name: "Auth",
			moduleId: modules[0].id,
			availableActions: [Action.LIST, Action.CREATE, Action.UPDATE, Action.DELETE, Action.DETAIL],
		},
		{
			id: "22222222-3333-4444-8555-666666666666",
			number: 1,
			name: "User",
			moduleId: modules[1].id,
			availableActions: [Action.LIST, Action.CREATE, Action.UPDATE, Action.DELETE, Action.DETAIL],
		},
	];

	for (const resource of resources) {
		await prisma.resource.upsert({
			where: { id: resource.id },
			update: {
				name: resource.name,
				number: resource.number,
				moduleId: resource.moduleId,
				availableActions: resource.availableActions,
			},
			create: resource,
		});
	}
	console.info(`✅ [SEED] ${resources.length} resources berhasil di-upsert.`);

	const rolePermissions = [
		{
			id: "33333333-4444-4555-8666-777777777777",
			roleId: roles[0].id,
			resourceId: resources[0].id,
			grantedActions: [Action.LIST, Action.CREATE, Action.UPDATE, Action.DELETE, Action.DETAIL],
		},
		{
			id: "44444444-5555-4666-8777-888888888888",
			roleId: roles[0].id,
			resourceId: resources[1].id,
			grantedActions: [Action.LIST, Action.CREATE, Action.UPDATE, Action.DELETE, Action.DETAIL],
		},
		{
			id: "55555555-6666-4777-8888-999999999999",
			roleId: roles[1].id,
			resourceId: resources[1].id,
			grantedActions: [Action.LIST, Action.DETAIL],
		},
	];

	for (const perm of rolePermissions) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_resourceId: {
					roleId: perm.roleId,
					resourceId: perm.resourceId,
				},
			},
			update: {
				grantedActions: perm.grantedActions,
			},
			create: perm,
		});
	}
	console.info(`✅ [SEED] ${rolePermissions.length} rolePermissions berhasil di-upsert.`);
	console.info("🎉 [SEED] Seeding selesai dengan sukses!");
}

main()
	.catch((e) => {
		console.error("❌ [SEED] Terjadi kesalahan saat seeding:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
