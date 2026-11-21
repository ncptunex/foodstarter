import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	insert: vi.fn(),
	values: vi.fn(),
	insertReturning: vi.fn(),
	delete: vi.fn(),
	where: vi.fn(),
	deleteReturning: vi.fn(),
}));

vi.mock("#/db", () => {
	mocks.insert.mockReturnValue({ values: mocks.values });
	mocks.values.mockReturnValue({ returning: mocks.insertReturning });
	mocks.delete.mockReturnValue({ where: mocks.where });
	mocks.where.mockReturnValue({ returning: mocks.deleteReturning });
	return { db: { insert: mocks.insert, delete: mocks.delete } };
});

// Without the Start compiler plugin, createServerFn cannot run its server path
// in vitest. This stand-in runs the real validator and then the real handler.
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

import { createFood, deleteFood } from "./foods";

const validInput = {
	name: "Oatmeal",
	mealType: "breakfast",
	calories: 300,
};
const SECRET = "connection refused to secret-host";
const uuid = "123e4567-e89b-42d3-a456-426614174000";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	mocks.insert.mockReturnValue({ values: mocks.values });
	mocks.values.mockReturnValue({ returning: mocks.insertReturning });
	mocks.delete.mockReturnValue({ where: mocks.where });
	mocks.where.mockReturnValue({ returning: mocks.deleteReturning });
	errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.clearAllMocks();
	errorSpy.mockRestore();
});

describe("createFood", () => {
	it("returns validation errors and does not insert for a bad macro", async () => {
		const result = await createFood({
			data: { ...validInput, proteinG: 10001 },
		});
		expect(result).toMatchObject({ ok: false, code: "validation" });
		expect(mocks.insert).not.toHaveBeenCalled();
	});

	it("does not insert when serving size is over 100 characters", async () => {
		const result = await createFood({
			data: { ...validInput, servingSize: "x".repeat(101) },
		});
		expect(result).toMatchObject({ ok: false, code: "validation" });
		expect(mocks.insert).not.toHaveBeenCalled();
	});

	it("maps the four new fields into the inserted values", async () => {
		const row = { id: uuid };
		mocks.insertReturning.mockResolvedValue([row]);
		const result = await createFood({
			data: {
				...validInput,
				proteinG: 0,
				carbsG: 25,
				servingSize: "  150 g ",
			},
		});
		expect(result).toEqual({ ok: true, food: row });
		expect(mocks.values).toHaveBeenCalledWith(
			expect.objectContaining({
				proteinG: 0,
				carbsG: 25,
				fatG: null,
				servingSize: "150 g",
			}),
		);
	});

	it("returns a fixed message and logs when the insert rejects", async () => {
		mocks.insertReturning.mockRejectedValue(new Error(SECRET));
		const result = await createFood({ data: validInput });
		expect(result).toMatchObject({ ok: false, code: "failed" });
		if (!result.ok) expect(result.message).not.toContain(SECRET);
		expect(errorSpy).toHaveBeenCalled();
	});
});

describe("deleteFood", () => {
	it("returns invalid_id and does not delete for a bad id", async () => {
		const result = await deleteFood({ data: { id: "not-a-uuid" } });
		expect(result).toMatchObject({ ok: false, code: "invalid_id" });
		expect(mocks.delete).not.toHaveBeenCalled();
	});

	it("returns not_found when no row is deleted", async () => {
		mocks.deleteReturning.mockResolvedValue([]);
		const result = await deleteFood({ data: { id: uuid } });
		expect(result).toMatchObject({ ok: false, code: "not_found" });
	});

	it("returns a fixed message and logs when the delete rejects", async () => {
		mocks.deleteReturning.mockRejectedValue(new Error(SECRET));
		const result = await deleteFood({ data: { id: uuid } });
		expect(result).toMatchObject({ ok: false, code: "failed" });
		if (!result.ok) expect(result.message).not.toContain(SECRET);
		expect(errorSpy).toHaveBeenCalled();
	});
});
