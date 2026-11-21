import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { db } from "#/db";
import { foods } from "#/db/schema";

// Start every test with an empty foods table.
beforeEach(async () => {
	await db.execute(sql`TRUNCATE TABLE ${foods}`);
});

afterAll(async () => {
	await db.$client.end();
});
