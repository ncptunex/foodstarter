import { parse } from "dotenv";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Load the test database URL from .env.test. It always wins over any
// DATABASE_URL in the shell so tests never touch the development database.
const testEnv = parse(readFileSync(".env.test"));
// globalSetup runs in the main process, which does not receive `test.env`.
Object.assign(process.env, testEnv);

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: "node",
		include: ["src/**/*.integration.test.ts"],
		env: testEnv,
		globalSetup: ["./src/test/integration/global-setup.ts"],
		setupFiles: ["./src/test/integration/setup.ts"],
		// All files share one database, so run them one at a time.
		fileParallelism: false,
		testTimeout: 15_000,
		hookTimeout: 30_000,
	},
});
