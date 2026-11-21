import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// .env first, then .env.local overrides it.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error(
		"DATABASE_URL is not set. Define it in .env or .env.local.",
	);
}

export default defineConfig({
	out: "./drizzle/migrations",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
});
