import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Runs once before the integration suite. Applies the committed migration
// files (not `drizzle-kit push`) so tests run against the real schema history.
export default async function setup() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is not set. Check .env.test.");
	}
	if (!/localhost:5433\//.test(url)) {
		throw new Error(
			"Integration tests must use the test database on localhost:5433.",
		);
	}

	const client = postgres(url, { max: 1, onnotice: () => {} });
	try {
		await migrate(drizzle(client), {
			migrationsFolder: "./drizzle/migrations",
		});
	} catch (error) {
		throw new Error(
			"Could not migrate the test database. Start it with `pnpm test:db:up`.",
			{ cause: error },
		);
	} finally {
		await client.end();
	}
}
