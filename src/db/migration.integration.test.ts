import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type * as schema from "./schema";

// listFoods imports `db` from "#/db". Point it at the scratch database, which
// is created in beforeAll. The proxy forwards every call to the scratch client.
const holder = vi.hoisted(() => ({
	db: undefined as unknown,
}));

vi.mock("#/db", () => ({
	db: new Proxy(
		{},
		{
			get: (_target, prop) => {
				const real = holder.db as Record<string | symbol, unknown>;
				const value = real[prop];
				return typeof value === "function" ? value.bind(real) : value;
			},
		},
	),
}));

// Without the Start compiler plugin, createServerFn cannot run its server path
// in vitest. This stand-in runs the real validator (if any) and the handler.
vi.mock("@tanstack/react-start", () => {
	type Validator = (data: unknown) => unknown;
	type Handler = (ctx: { data: unknown }) => unknown;
	const build = (validator?: Validator) => ({
		validator: (next: Validator) => build(next),
		handler: (fn: Handler) => async (opts?: { data?: unknown }) =>
			fn({ data: validator ? validator(opts?.data) : opts?.data }),
	});
	return { createServerFn: () => build() };
});

import { listFoods } from "#/server/foods";

const MIGRATIONS = "./drizzle/migrations";
const scratchName = `migration_test_${process.pid}_${Date.now()}`;

type Journal = { entries: { idx: number; tag: string }[] };

let admin: ReturnType<typeof postgres>;
let scratch: ReturnType<typeof postgres>;
let scratchDb: PostgresJsDatabase<typeof schema>;
let tmpFolder: string;

function urlFor(name: string) {
	const url = new URL(process.env.DATABASE_URL ?? "");
	url.pathname = `/${name}`;
	return url.toString();
}

// Copy only the first migration and a journal that lists only it.
function makeFirstMigrationFolder(): string {
	const journal = JSON.parse(
		readFileSync(join(MIGRATIONS, "meta", "_journal.json"), "utf8"),
	) as Journal;
	const first = journal.entries[0];
	const dir = mkdtempSync(join(tmpdir(), "foods-migration-"));
	mkdirSync(join(dir, "meta"));
	cpSync(join(MIGRATIONS, `${first.tag}.sql`), join(dir, `${first.tag}.sql`));
	writeFileSync(
		join(dir, "meta", "_journal.json"),
		JSON.stringify({ ...journal, entries: [first] }),
	);
	return dir;
}

describe("migration 0001 on existing rows", () => {
	beforeAll(async () => {
		const url = process.env.DATABASE_URL ?? "";
		if (!/localhost:5433\//.test(url)) {
			throw new Error("Migration test must use the test database on 5433.");
		}
		admin = postgres(url, { max: 1, onnotice: () => {} });
		await admin.unsafe(`CREATE DATABASE "${scratchName}"`);
		scratch = postgres(urlFor(scratchName), { max: 1, onnotice: () => {} });
		scratchDb = drizzle(scratch) as unknown as PostgresJsDatabase<
			typeof schema
		>;
		holder.db = scratchDb;
		tmpFolder = makeFirstMigrationFolder();
	});

	afterAll(async () => {
		await scratch?.end();
		if (admin) {
			await admin.unsafe(
				`DROP DATABASE IF EXISTS "${scratchName}" WITH (FORCE)`,
			);
			await admin.end();
		}
		if (tmpFolder) rmSync(tmpFolder, { recursive: true, force: true });
	});

	it("keeps existing values, adds NULL columns, and lists the row", async () => {
		await migrate(scratchDb, { migrationsFolder: tmpFolder });

		const columnsBefore = await scratchDb.execute<{ column_name: string }>(
			sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'foods'`,
		);
		const namesBefore = columnsBefore.map((c) => c.column_name);
		expect(namesBefore).not.toContain("protein_g");

		const eatenAt = new Date("2024-05-06T07:08:09.000Z");
		await scratchDb.execute(sql`
			INSERT INTO foods (name, meal_type, calories, notes, eaten_at)
			VALUES ('Oatmeal', 'breakfast', 300, 'with milk', ${eatenAt.toISOString()})
		`);

		await migrate(scratchDb, { migrationsFolder: MIGRATIONS });

		const rows =
			await scratchDb.execute<Record<string, unknown>>(
				sql`SELECT * FROM foods`,
			);
		expect(rows).toHaveLength(1);
		const row = rows[0];
		expect(row.name).toBe("Oatmeal");
		expect(row.meal_type).toBe("breakfast");
		expect(row.calories).toBe(300);
		expect(row.notes).toBe("with milk");
		expect(new Date(row.eaten_at as string).getTime()).toBe(eatenAt.getTime());
		expect(row.protein_g).toBeNull();
		expect(row.carbs_g).toBeNull();
		expect(row.fat_g).toBeNull();
		expect(row.serving_size).toBeNull();

		const listed = await listFoods();
		expect(listed).toHaveLength(1);
		expect(listed[0]).toMatchObject({
			id: row.id,
			name: "Oatmeal",
			mealType: "breakfast",
			calories: 300,
			notes: "with milk",
			proteinG: null,
			carbsG: null,
			fatG: null,
			servingSize: null,
		});
		expect(listed[0].eatenAt.getTime()).toBe(eatenAt.getTime());
	});
});
