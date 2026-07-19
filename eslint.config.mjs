import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ["dist/", "node_modules/", "test-report/", "coverage/", "jest.config.js"],
	},
	{
		files: ["src/**/*.ts", "__tests__/**/*.ts", "scripts/**/*.ts", "prisma/**/*.ts", "prisma.config.ts"],
		languageOptions: {
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"no-console": ["warn", { allow: ["warn", "error", "info"] }],
			"prefer-const": "error",
			"no-var": "error",
		},
	},
);
