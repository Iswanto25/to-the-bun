module.exports = {
	apps: [
		{
			name: "boilerplate-backend",
			script: "dist/app.js",
			interpreter: "bun",
			instances: 1,
			exec_mode: "fork",
			kill_timeout: 5000,
			env: {
				NODE_ENV: "staging",
				PORT: 4004,
			},
		},
		{
			name: "boilerplate-worker",
			script: "dist/worker.js",
			interpreter: "bun",
			instances: 1,
			exec_mode: "fork",
			kill_timeout: 5000,
			env: {
				NODE_ENV: "staging",
			},
		},
	],
};
