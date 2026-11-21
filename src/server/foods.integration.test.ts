import { count } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

// Without the Start compiler plugin, createServerFn cannot run its server path
// in vitest. This stand-in runs the real validator and then the real handler.
// The database is real.
vi.mock("@tanstack/react-start", () => {
	type Validator = (data: unknown) => unknown;
	type Handler = (ctx: { data: unknown }) => unknown;
	const build = (validator?: Validator) => ({
		validator: (next: Validator) => build(next),
		inputValidator: (next: Validator) => build(next),
		handler: (fn: Handler) => async (opts?: { data?: unknown }) =>
			fn({ data: validator ? validator(opts?.data) : opts?.data }),
	});
	return { createServerFn: () => build() };
});

import { db } from "#/db";
import { foods } from "#/db/schema";
import { createFood, deleteFood, listFoods } from "./foods";

const base = { name: "Oatmeal", mealType: "breakfast", calories: 300 } as const;
const unknownId = "123e4567-e89b-42d3-a456-426614174000";

async function rowCount() {
	const [row] = await db.select({ n: count() }).from(foods);
	return row.n;
}

async function create(data: Record<string, unknown>) {
	const result = await createFood({ data } as never);
	if (!result.ok) throw new Error(`create failed: ${result.message}`);
	return result.food;
}

describe("createFood", () => {
	it("inserts one row and returns the generated id and stored eatenAt", async () => {
		const eatenAt = "2024-05-01T08:30:00.000Z";
		const food = await create({ ...base, eatenAt });

		expect(await rowCount()).toBe(1);
		expect(food.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(food.eatenAt.toISOString()).toBe(eatenAt);
		const [stored] = await db.select().from(foods);
		expect(stored.id).toBe(food.id);
		expect(stored.eatenAt.toISOString()).toBe(eatenAt);
	});

	it("uses server time when eatenAt is omitted", async () => {
		const before = Date.now();
		const food = await create(base);
		const after = Date.now();
		// Allow small clock differences between the app and the container.
		expect(food.eatenAt.getTime()).toBeGreaterThan(before - 5_000);
		expect(food.eatenAt.getTime()).toBeLessThan(after + 5_000);
	});

	it("stores macros and trimmed serving size, with null for omitted fat", async () => {
		await create({
			...base,
			proteinG: 0,
			carbsG: 25,
			servingSize: "  150 g ",
		});
		const [stored] = await db.select().from(foods);
		expect(stored.proteinG).toBe(0);
		expect(stored.carbsG).toBe(25);
		expect(stored.fatG).toBeNull();
		expect(stored.servingSize).toBe("150 g");
	});

	it("stores four nulls when the new fields are omitted", async () => {
		await create(base);
		const [stored] = await db.select().from(foods);
		expect(stored.proteinG).toBeNull();
		expect(stored.carbsG).toBeNull();
		expect(stored.fatG).toBeNull();
		expect(stored.servingSize).toBeNull();
	});

	it("does not insert invalid input", async () => {
		const result = await createFood({
			data: { ...base, proteinG: 10001 },
		} as never);
		expect(result).toMatchObject({ ok: false, code: "validation" });
		expect(await rowCount()).toBe(0);
	});
});

describe("listFoods", () => {
	it("returns every row ordered by eatenAt then createdAt descending", async () => {
		const tie = "2024-05-02T12:00:00.000Z";
		const oldest = await create({
			...base,
			name: "oldest",
			eatenAt: "2024-05-01T12:00:00.000Z",
		});
		const tieFirst = await create({ ...base, name: "tie-first", eatenAt: tie });
		const tieSecond = await create({
			...base,
			name: "tie-second",
			eatenAt: tie,
		});
		const newest = await create({
			...base,
			name: "newest",
			eatenAt: "2024-05-03T12:00:00.000Z",
		});

		const list = await listFoods();
		expect(list.map((f) => f.id)).toEqual([
			newest.id,
			tieSecond.id,
			tieFirst.id,
			oldest.id,
		]);
	});

	it("returns an empty array for an empty table", async () => {
		expect(await listFoods()).toEqual([]);
	});
});

describe("deleteFood", () => {
	it("removes exactly one row and returns its id", async () => {
		const keep = await create({ ...base, name: "keep" });
		const gone = await create({ ...base, name: "gone" });

		const result = await deleteFood({ data: { id: gone.id } } as never);
		expect(result).toEqual({ ok: true, id: gone.id });
		const rest = await db.select().from(foods);
		expect(rest.map((f) => f.id)).toEqual([keep.id]);
	});

	it("returns not_found for an unknown id and leaves the table unchanged", async () => {
		await create(base);
		const result = await deleteFood({ data: { id: unknownId } } as never);
		expect(result).toMatchObject({ ok: false, code: "not_found" });
		expect(await rowCount()).toBe(1);
	});

	it("returns ok then not_found when deleting the same id twice", async () => {
		await create({ ...base, name: "other" });
		const target = await create(base);

		const first = await deleteFood({ data: { id: target.id } } as never);
		const afterFirst = await db.select().from(foods);
		const second = await deleteFood({ data: { id: target.id } } as never);
		const afterSecond = await db.select().from(foods);

		expect(first).toEqual({ ok: true, id: target.id });
		expect(second).toMatchObject({ ok: false, code: "not_found" });
		expect(afterSecond).toEqual(afterFirst);
		expect(afterSecond).toHaveLength(1);
	});
});
