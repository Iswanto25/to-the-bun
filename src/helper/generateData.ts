import { fakerID_ID as faker } from "@faker-js/faker";
import path from "node:path";

interface UserData {
	name: string;
	email: string;
	password: string;
	address: string;
	phone: string;
	photo: string;
	NIK: string;
}

const generateUserData = (count: number): UserData[] => {
	const users: UserData[] = [];
	const usedEmails = new Set<string>();

	const base64Photo =
		"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

	let attempts = 0;
	const maxAttempts = count * 2;

	while (users.length < count && attempts < maxAttempts) {
		attempts++;

		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const randomNum = faker.number.int({ min: 100, max: 9999 });
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@example.com`;
		const NIK = faker.string.numeric(16);

		if (usedEmails.has(email)) {
			continue;
		}

		usedEmails.add(email);

		users.push({
			name: `${firstName} ${lastName}`,
			email: email,
			password: Bun.env.SEED_USER_PASSWORD ?? "SecurePassword123!",
			address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
			phone: "0812" + faker.string.numeric(8),
			photo: base64Photo,
			NIK: NIK,
		});
	}

	return users;
};

const main = async () => {
	const COUNT = 1000;

	console.info(`Generating ${COUNT} unique user data...`);

	const startTime = Date.now();
	const users = generateUserData(COUNT);
	const endTime = Date.now();

	const outputPath = path.join(process.cwd(), "test_data.json");
	await Bun.write(outputPath, JSON.stringify(users, null, 2));

	console.info(`Successfully generated ${users.length} users`);
	console.info(`Saved to: ${outputPath}`);
	console.info(`Time taken: ${endTime - startTime}ms`);
	console.info(`Sample data (first 3 users):`);
	console.info(JSON.stringify(users.slice(0, 3), null, 2));
};

if (import.meta.main) {
	main();
}

export { generateUserData };
