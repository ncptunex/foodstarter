import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mealTypes } from "#/db/schema";
import { type CreateFoodInput, createFoodSchema } from "#/server/food-schemas";
import {
	deleteLabel,
	formatKcal,
	fromLocalDateTimeValue,
	getVisibleMacros,
	getVisibleServingSize,
	hasVisibleNotes,
	toFoodValues,
	toLocalDateTimeValue,
	toOptionalWholeNumber,
} from "./food-utils";

const RUNS = { numRuns: 200 };

const whitespace = fc
	.array(fc.constantFrom(" ", "\t", "\n", "\u00a0"), { maxLength: 5 })
	.map((chars) => chars.join(""));

const macro = fc.option(
	fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 10000 })),
	{ nil: undefined },
);

const blankOrUndefined = fc.oneof(fc.constant(undefined), whitespace);

const servingSize = fc.oneof(
	blankOrUndefined,
	fc
		.tuple(
			whitespace,
			fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim() !== ""),
			whitespace,
		)
		.map(([a, b, c]) => `${a}${b.trim()}${c}`),
);

const notes = fc.oneof(
	blankOrUndefined,
	fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim() !== ""),
);

const eatenAt = fc.oneof(
	fc.constant(undefined),
	fc.constant(""),
	fc
		.date({ noInvalidDate: true, min: new Date(0), max: new Date(4e12) })
		.map((d) => d.toISOString()),
);

const acceptedInput = fc
	.record({
		name: fc
			.string({ minLength: 1, maxLength: 50 })
			.filter((s) => s.trim() !== ""),
		mealType: fc.constantFrom(...mealTypes),
		calories: fc.integer({ min: 0, max: 100000 }),
		proteinG: macro,
		carbsG: macro,
		fatG: macro,
		servingSize,
		notes,
		eatenAt,
	})
	.map((r) => {
		const input: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(r)) {
			if (v !== undefined) input[k] = v;
		}
		return input;
	})
	.map((raw) => createFoodSchema.safeParse(raw))
	.filter((r) => r.success)
	.map((r) => r.data as CreateFoodInput);

describe("toFoodValues", () => {
	/**
	 * Property 10: Optional values map to NULL, zero and trimmed text
	 * **Validates: Requirements 3.7, 3.9, 3.10, 4.4, 4.5**
	 */
	it("maps optional values to NULL, zero and trimmed text", () => {
		fc.assert(
			fc.property(acceptedInput, (input) => {
				const out = toFoodValues(input);

				for (const key of ["proteinG", "carbsG", "fatG"] as const) {
					expect(out[key]).toBe(input[key] === undefined ? null : input[key]);
				}

				const trimmedServing = input.servingSize?.trim() ?? "";
				expect(out.servingSize).toBe(
					trimmedServing.length > 0 ? trimmedServing : null,
				);

				if (input.notes === undefined || input.notes.trim() === "") {
					expect(out.notes).toBeNull();
				} else {
					expect(out.notes).not.toBeNull();
				}

				if (input.eatenAt) {
					expect(out.eatenAt).toEqual(new Date(input.eatenAt));
				} else {
					expect("eatenAt" in out).toBe(false);
				}
			}),
			RUNS,
		);
	});

	it("keeps 0 as 0 and omitted macros as null", () => {
		const out = toFoodValues({
			name: "Egg",
			mealType: "breakfast",
			calories: 70,
			proteinG: 0,
			carbsG: 25,
			servingSize: "  150 g ",
		});
		expect(out.proteinG).toBe(0);
		expect(out.carbsG).toBe(25);
		expect(out.fatG).toBeNull();
		expect(out.servingSize).toBe("150 g");
		expect(out.notes).toBeNull();
	});
});

describe("toOptionalWholeNumber", () => {
	const plainDecimal = /^[+-]?(\d+\.?\d*|\.\d+)$/;

	/**
	 * Property 11: Whole-number text parsing
	 * **Validates: Requirements 2.9, 2.12, 3.6, 3.7**
	 */
	it("returns undefined for empty or whitespace-only text", () => {
		fc.assert(
			fc.property(whitespace, (text) => {
				expect(toOptionalWholeNumber(text)).toBeUndefined();
			}),
			RUNS,
		);
	});

	it("parses plain digit text, ignoring surrounding whitespace", () => {
		fc.assert(
			fc.property(
				whitespace,
				fc.integer({ min: 0, max: 1_000_000 }),
				fc.nat({ max: 3 }),
				whitespace,
				(before, n, zeros, after) => {
					const digits = `${"0".repeat(zeros)}${n}`;
					expect(toOptionalWholeNumber(`${before}${digits}${after}`)).toBe(n);
				},
			),
			RUNS,
		);
	});

	it("parses signed and fractional plain decimals to their numeric value", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("", "+", "-"),
				fc.nat({ max: 100000 }),
				fc.nat({ max: 999 }),
				(sign, whole, frac) => {
					const text = `${sign}${whole}.${frac}`;
					expect(toOptionalWholeNumber(text)).toBe(Number(text));
				},
			),
			RUNS,
		);
	});

	it("returns NaN for any non-blank text that is not a plain decimal", () => {
		const nonNumeric = fc
			.oneof(
				fc.string({ maxLength: 20 }),
				fc.constantFrom(
					"abc",
					"1e3",
					"0x10",
					"Infinity",
					"1,000",
					"1 000",
					"12abc",
					"--1",
					".",
					"+",
					"-",
					"1.2.3",
				),
			)
			.filter((s) => {
				const t = s.trim();
				return t.length > 0 && !plainDecimal.test(t);
			});
		fc.assert(
			fc.property(nonNumeric, (text) => {
				expect(toOptionalWholeNumber(text)).toBeNaN();
			}),
			RUNS,
		);
	});
});

describe("formatKcal", () => {
	/**
	 * Property 12: Calories display format
	 * **Validates: Requirements 5.3**
	 */
	it("formats n as its decimal digits followed by ' kcal'", () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 100000 }), (n) => {
				const out = formatKcal(n);
				expect(out).toBe(`${n} kcal`);
				expect(Number.parseInt(out, 10)).toBe(n);
			}),
			RUNS,
		);
	});
});

describe("hasVisibleNotes", () => {
	/**
	 * Property 13: Notes line visibility
	 * **Validates: Requirements 5.4**
	 */
	it("is true exactly when notes is non-null with a non-whitespace character", () => {
		fc.assert(
			fc.property(
				fc.oneof(fc.constant(null), whitespace, fc.string({ maxLength: 100 })),
				(notes) => {
					const expected = notes !== null && notes.trim().length > 0;
					expect(hasVisibleNotes(notes)).toBe(expected);
				},
			),
			RUNS,
		);
	});

	it("is false for null and whitespace-only notes, true when text is surrounded by whitespace", () => {
		fc.assert(
			fc.property(
				whitespace,
				fc
					.string({ minLength: 1, maxLength: 30 })
					.filter((s) => s.trim() !== ""),
				whitespace,
				(a, text, b) => {
					expect(hasVisibleNotes(a)).toBe(false);
					expect(hasVisibleNotes(`${a}${text}${b}`)).toBe(true);
				},
			),
			RUNS,
		);
		expect(hasVisibleNotes(null)).toBe(false);
	});
});

describe("getVisibleMacros", () => {
	const nullableMacro = fc.oneof(
		fc.constant(null),
		fc.integer({ min: 0, max: 10000 }),
		fc.constantFrom(0, 10000),
	);

	/**
	 * Property 14: Macro display visibility
	 * **Validates: Requirements 5.5, 5.7, 5.8**
	 */
	it("returns one ordered entry per non-null macro, with 'N g' values and no placeholders", () => {
		fc.assert(
			fc.property(
				nullableMacro,
				nullableMacro,
				nullableMacro,
				(proteinG, carbsG, fatG) => {
					const out = getVisibleMacros({ proteinG, carbsG, fatG });

					const expected: { label: string; value: string }[] = [];
					if (proteinG !== null)
						expected.push({ label: "Protein", value: `${proteinG} g` });
					if (carbsG !== null)
						expected.push({ label: "Carbs", value: `${carbsG} g` });
					if (fatG !== null)
						expected.push({ label: "Fat", value: `${fatG} g` });

					expect(out).toEqual(expected);

					for (const entry of out) {
						expect(entry.value).toMatch(/^\d+ g$/);
						expect(entry.value).not.toBe("");
						expect(entry.value).not.toBe("-");
						expect(entry.value).not.toBe("N/A");
					}
				},
			),
			RUNS,
		);
	});

	it("returns an empty list when all macros are null and keeps 0 as '0 g'", () => {
		expect(
			getVisibleMacros({ proteinG: null, carbsG: null, fatG: null }),
		).toEqual([]);
		expect(getVisibleMacros({ proteinG: 0, carbsG: null, fatG: 0 })).toEqual([
			{ label: "Protein", value: "0 g" },
			{ label: "Fat", value: "0 g" },
		]);
	});
});

describe("getVisibleServingSize", () => {
	/**
	 * Property 15: Serving size display visibility
	 * **Validates: Requirements 5.6, 5.7, 5.8**
	 */
	it("returns the trimmed text when it has a non-whitespace character, otherwise null", () => {
		fc.assert(
			fc.property(
				fc.oneof(fc.constant(null), whitespace, fc.string({ maxLength: 100 })),
				(servingSize) => {
					const out = getVisibleServingSize(servingSize);
					if (servingSize === null || servingSize.trim().length === 0) {
						expect(out).toBeNull();
					} else {
						expect(out).toBe(servingSize.trim());
						expect(out).not.toBe("");
					}
				},
			),
			RUNS,
		);
	});

	it("shows text surrounded by whitespace without the whitespace", () => {
		fc.assert(
			fc.property(
				whitespace,
				fc
					.string({ minLength: 1, maxLength: 30 })
					.filter((s) => s.trim() !== ""),
				whitespace,
				(a, text, b) => {
					expect(getVisibleServingSize(a)).toBeNull();
					expect(getVisibleServingSize(`${a}${text}${b}`)).toBe(text.trim());
				},
			),
			RUNS,
		);
		expect(getVisibleServingSize(null)).toBeNull();
	});
});

describe("toLocalDateTimeValue / fromLocalDateTimeValue", () => {
	const supportedDate = fc.date({
		noInvalidDate: true,
		min: new Date("1970-01-02T00:00:00Z"),
		max: new Date("2100-12-30T00:00:00Z"),
	});

	/**
	 * Property 16: Local date-time input round trip
	 * **Validates: Requirements 2.3**
	 */
	it("round-trips to the date truncated to the minute and matches YYYY-MM-DDTHH:mm", () => {
		fc.assert(
			fc.property(supportedDate, (d) => {
				const value = toLocalDateTimeValue(d);
				expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

				const truncated = new Date(d.getTime() - (d.getTime() % 60000));
				const back = fromLocalDateTimeValue(value);
				expect(back.getTime()).toBe(truncated.getTime());
			}),
			RUNS,
		);
	});

	it("formats a known local date and rejects malformed text", () => {
		const d = new Date(2024, 0, 5, 7, 3, 45, 500);
		expect(toLocalDateTimeValue(d)).toBe("2024-01-05T07:03");
		expect(fromLocalDateTimeValue("2024-01-05T07:03").getTime()).toBe(
			new Date(2024, 0, 5, 7, 3).getTime(),
		);
		expect(fromLocalDateTimeValue("not a date").getTime()).toBeNaN();
	});
});

describe("deleteLabel", () => {
	/**
	 * Property 17: Delete label contains the entry name
	 * **Validates: Requirements 8.17**
	 */
	it("contains the entry name for any non-empty name", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1, maxLength: 100 }), (name) => {
				expect(deleteLabel(name)).toContain(name);
			}),
			RUNS,
		);
	});

	it("labels a known name", () => {
		expect(deleteLabel("Egg")).toBe("Delete Egg");
	});
});
