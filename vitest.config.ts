import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so unit tests skip the TanStack Start, Nitro and devtools plugins.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}"],
		exclude: ["src/**/*.integration.test.{ts,tsx}", "node_modules/**"],
	},
});
