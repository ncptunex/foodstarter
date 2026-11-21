import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mealTypes } from "#/db/schema";
import { createFoodSchema, deleteFoodSchema } from "./food-schemas";

const NUM_RUNS = 100;

const validBase = {
	mealType: "lunch",
	calories: 100,
} as const;

const whitespace = fc.stringMatching(/^[ \t\n\r]{0,5}$/);

// Mix of arbitrary text, padded text, and strings near the 1 and 255 boundaries.
const nameCandidate = fc.oneof(
	fc.string({ maxLength: 300 }),
	fc
		.tuple(whitespace, fc.string({ maxLength: 300 }), whitespace)
		.map(([a, s, b]) => a + s + b),
	fc
		.tuple(whitespace, fc.constantFrom(0, 1, 2, 254, 255, 256), whitespace)
		.map(([a, n, b]) => a + "a".repeat(n) + b),
);

describe("createFoodSchema name", () => {
	// Feature: add-food-route, Property 1: Name validation and trimming
	// **Validates: Requirements 2.6, 3.1**
	it("accepts a name iff its trimmed length is 1 to 255, and parses to the trimmed string", () => {
		fc.assert(
			fc.property(nameCandidate, (name) => {
				const result = createFoodSchema.safeParse({ ...validBase, name });
				const trimmed = name.trim();
				const shouldAccept = trimmed.length >= 1 && trimmed.length <= 255;

				expect(result.success).toBe(shouldAccept);
				if (result.success) {
					expect(result.data.name).toBe(trimmed);
				}
			}),
			{ numRuns: NUM_RUNS },
		);
	});

	it("rejects whitespace-only and empty names, and a 256-character name", () => {
		for (const name of ["", "   ", "\t\n", "a".repeat(256)]) {
			expect(createFoodSchema.safeParse({ ...validBase, name }).success).toBe(
				false,
			);
		}
		expect(
			createFoodSchema.safeParse({
				...validBase,
				name: `  ${"a".repeat(255)}  `,
			}).success,
		).toBe(true);
	});
});

const caloriesCandidate = fc.oneof(
	fc.integer({ min: -1000, max: 200000 }),
	fc.constantFrom(0, 1, 99999, 100000, 100001, -1),
	fc.double({ noNaN: false }),
	fc.double({ min: -10, max: 100010, noNaN: true }),
	fc.string({ maxLength: 8 }),
	fc.integer({ min: 0, max: 100000 }).map(String),
	fc.constantFrom(
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		null,
		undefined,
		true,
		[],
		{},
	),
);

describe("createFoodSchema calories", () => {
	// Feature: add-food-route, Property 2: Calories validation
	// **Validates: Requirements 2.7, 3.2**
	it("accepts calories iff the value is an integer number from 0 to 100000", () => {
		fc.assert(
			fc.property(caloriesCandidate, (calories) => {
				const result = createFoodSchema.safeParse({
					name: "Apple",
					mealType: "lunch",
					calories,
				});
				const shouldAccept =
					typeof calories === "number" &&
					Number.isInteger(calories) &&
					calories >= 0 &&
					calories <= 100000;

				expect(result.success).toBe(shouldAccept);
			}),
			{ numRuns: NUM_RUNS },
		);
	});
});

const mealTypeCandidate = fc.oneof(
	fc.constantFrom(...mealTypes),
	fc.string({ maxLength: 12 }),
	fc.constantFrom(
		"Breakfast",
		"LUNCH",
		" dinner",
		"snack ",
		"brunch",
		"",
		null,
		undefined,
		1,
		true,
		[],
		{},
	),
);

describe("createFoodSchema mealType", () => {
	// Feature: add-food-route, Property 3: Meal type validation
	// **Validates: Requirements 3.3**
	it("accepts a meal type iff it is exactly one of the allowed values", () => {
		fc.assert(
			fc.property(mealTypeCandidate, (mealType) => {
				const result = createFoodSchema.safeParse({
					name: "Apple",
					mealType,
					calories: 100,
				});
				const shouldAccept =
					typeof mealType === "string" &&
					(mealTypes as readonly string[]).includes(mealType);

				expect(result.success).toBe(shouldAccept);
			}),
			{ numRuns: NUM_RUNS },
		);
	});
});

const notesCandidate = fc.oneof(
	fc.string({ maxLength: 1100 }),
	fc.constantFrom(0, 1, 999, 1000, 1001, 1002).map((n) => "a".repeat(n)),
	fc.constantFrom(0, 1000, 1001).map((n) => " ".repeat(n)),
	fc
		.constantFrom(0, 1000, 1001)
		.map((n) => "\u{1F600}".repeat(Math.ceil(n / 2))),
);

describe("createFoodSchema notes", () => {
	// Feature: add-food-route, Property 4: Notes validation
	// **Validates: Requirements 2.8, 3.4**
	it("accepts notes iff its length is at most 1000", () => {
		fc.assert(
			fc.property(notesCandidate, (notes) => {
				const result = createFoodSchema.safeParse({
					name: "Apple",
					mealType: "lunch",
					calories: 100,
					notes,
				});

				// Zod counts Unicode code points, not UTF-16 units.
				expect(result.success).toBe([...notes].length <= 1000);
			}),
			{ numRuns: NUM_RUNS },
		);
	});

	it("accepts an omitted notes value", () => {
		expect(
			createFoodSchema.safeParse({
				name: "Apple",
				mealType: "lunch",
				calories: 100,
			}).success,
		).toBe(true);
	});
});

const eatenAtCandidate = fc.oneof(
	fc.string({ maxLength: 30 }),
	fc.constant(""),
	fc
		.date({
			min: new Date("1970-01-01"),
			max: new Date("2100-01-01"),
			noInvalidDate: true,
		})
		.map((d) => d.toISOString()),
	fc
		.date({
			min: new Date("1970-01-01"),
			max: new Date("2100-01-01"),
			noInvalidDate: true,
		})
		.map((d) => d.toISOString().slice(0, 16)),
	fc.constantFrom(
		"2024-02-30T10:00",
		"2024-13-01",
		"2024-01-01T25:00",
		"not a date",
		"   ",
		"2024-01-01T10:00",
		"2024-02-29",
	),
);

describe("createFoodSchema eatenAt", () => {
	// Feature: add-food-route, Property 5: Eaten-at validation
	// **Validates: Requirements 3.5**
	it("accepts eatenAt iff it is empty or parses to a valid date", () => {
		fc.assert(
			fc.property(eatenAtCandidate, (eatenAt) => {
				const result = createFoodSchema.safeParse({
					...validBase,
					name: "Apple",
					eatenAt,
				});
				const shouldAccept =
					eatenAt === "" || !Number.isNaN(Date.parse(eatenAt));

				expect(result.success).toBe(shouldAccept);
			}),
			{ numRuns: NUM_RUNS },
		);
	});

	it("accepts an omitted eatenAt", () => {
		expect(
			createFoodSchema.safeParse({ ...validBase, name: "Apple" }).success,
		).toBe(true);
	});
});

const macroKeys = ["proteinG", "carbsG", "fatG"] as const;

const macroCandidate = fc.oneof(
	fc.constantFrom(0, 1, 9999, 10000, 10001, -1),
	fc.integer({ min: -100, max: 20000 }),
	fc.integer({ min: 0, max: 10000 }),
	fc.double({ min: -10, max: 10010, noNaN: true }),
	fc.string({ maxLength: 6 }),
	fc.integer({ min: 0, max: 10000 }).map(String),
	fc.constantFrom(
		undefined,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		null,
		true,
		[],
		{},
	),
);

describe("createFoodSchema macros", () => {
	// Feature: add-food-route, Property 6: Macro validation
	// **Validates: Requirements 2.10, 2.12, 3.6, 3.7, 3.10**
	it("accepts each macro iff it is omitted or an integer number from 0 to 10000", () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...macroKeys),
				macroCandidate,
				(key, value) => {
					const result = createFoodSchema.safeParse({
						...validBase,
						name: "Apple",
						[key]: value,
					});
					const shouldAccept =
						value === undefined ||
						(typeof value === "number" &&
							Number.isInteger(value) &&
							value >= 0 &&
							value <= 10000);

					expect(result.success).toBe(shouldAccept);
					if (result.success && value !== undefined) {
						expect(result.data[key]).toBe(value);
					}
				},
			),
			{ numRuns: NUM_RUNS },
		);
	});

	it("handles the boundaries 0, 10000, 10001 and -1 for every macro", () => {
		for (const key of macroKeys) {
			for (const [value, ok] of [
				[0, true],
				[10000, true],
				[10001, false],
				[-1, false],
			] as const) {
				expect(
					createFoodSchema.safeParse({
						...validBase,
						name: "Apple",
						[key]: value,
					}).success,
				).toBe(ok);
			}
		}
	});
});

const servingCandidate = fc.oneof(
	fc.string({ maxLength: 120 }),
	fc
		.tuple(whitespace, fc.string({ maxLength: 120 }), whitespace)
		.map(([a, s, b]) => a + s + b),
	fc
		.tuple(whitespace, fc.constantFrom(0, 1, 99, 100, 101, 102), whitespace)
		.map(([a, n, b]) => a + "a".repeat(n) + b),
);

describe("createFoodSchema servingSize", () => {
	// Feature: add-food-route, Property 7: Serving size validation and trimming
	// **Validates: Requirements 2.11, 2.13, 3.8, 3.9**
	it("accepts a serving size iff its trimmed length is at most 100, and parses to the trimmed string", () => {
		fc.assert(
			fc.property(servingCandidate, (servingSize) => {
				const result = createFoodSchema.safeParse({
					...validBase,
					name: "Apple",
					servingSize,
				});
				const trimmed = servingSize.trim();

				expect(result.success).toBe(trimmed.length <= 100);
				if (result.success) {
					expect(result.data.servingSize).toBe(trimmed);
				}
			}),
			{ numRuns: NUM_RUNS },
		);
	});

	it("accepts trimmed length 100 and rejects 101, ignoring surrounding whitespace", () => {
		const parse = (servingSize: string) =>
			createFoodSchema.safeParse({
				...validBase,
				name: "Apple",
				servingSize,
			});

		expect(parse("a".repeat(100)).success).toBe(true);
		expect(parse(`  ${"a".repeat(100)} \t`).success).toBe(true);
		expect(parse("a".repeat(101)).success).toBe(false);
		expect(parse(`  ${"a".repeat(101)}  `).success).toBe(false);
		expect(parse("   ").success).toBe(true);
	});

	it("accepts an omitted serving size", () => {
		expect(
			createFoodSchema.safeParse({ ...validBase, name: "Apple" }).success,
		).toBe(true);
	});
});

const allFieldKeys = [
	"name",
	"mealType",
	"calories",
	"proteinG",
	"carbsG",
	"fatG",
	"servingSize",
	"notes",
	"eatenAt",
] as const;

type FieldKey = (typeof allFieldKeys)[number];

const validValues: Record<FieldKey, unknown> = {
	name: "Apple",
	mealType: "lunch",
	calories: 100,
	proteinG: 10,
	carbsG: 20,
	fatG: 5,
	servingSize: "1 cup",
	notes: "fresh",
	eatenAt: "2024-01-01T10:00",
};

const invalidValues: Record<FieldKey, fc.Arbitrary<unknown>> = {
	name: fc.constantFrom("", "   ", "a".repeat(256)),
	mealType: fc.constantFrom("brunch", "", "LUNCH", null, 1),
	calories: fc.constantFrom(-1, 100001, 1.5, "10", Number.NaN, null),
	proteinG: fc.constantFrom(-1, 10001, 1.5, "10", Number.NaN, null),
	carbsG: fc.constantFrom(-1, 10001, 1.5, "10", Number.NaN, null),
	fatG: fc.constantFrom(-1, 10001, 1.5, "10", Number.NaN, null),
	servingSize: fc.constantFrom("a".repeat(101), `  ${"a".repeat(101)}  `, 5),
	notes: fc.constantFrom("a".repeat(1001), 5, null),
	eatenAt: fc.constantFrom("not a date", "2024-13-01", "   ", 5),
};

const invalidSubsetInput = fc.subarray([...allFieldKeys]).chain((subset) =>
	fc
		.tuple(
			...allFieldKeys.map((key) =>
				subset.includes(key)
					? invalidValues[key]
					: fc.constant(validValues[key]),
			),
		)
		.map((values) => ({
			subset,
			input: Object.fromEntries(allFieldKeys.map((key, i) => [key, values[i]])),
		})),
);

describe("createFoodSchema field error reporting", () => {
	// Feature: add-food-route, Property 8: Invalid fields are reported exactly
	// **Validates: Requirements 2.14, 3.13, 4.11**
	it("reports exactly the invalid fields, and succeeds when none are invalid", () => {
		fc.assert(
			fc.property(invalidSubsetInput, ({ subset, input }) => {
				const result = createFoodSchema.safeParse(input);

				if (subset.length === 0) {
					expect(result.success).toBe(true);
					return;
				}
				expect(result.success).toBe(false);
				if (!result.success) {
					const keys = Object.keys(z.flattenError(result.error).fieldErrors);
					expect(keys.sort()).toEqual([...subset].sort());
				}
			}),
			{ numRuns: 200 },
		);
	});
});

const malformedUuid = fc.oneof(
	// Arbitrary text
	fc.string({ maxLength: 50 }),
	// Valid UUIDs broken in one specific way
	fc.uuid().map((u) => u.slice(0, -1)),
	fc.uuid().map((u) => `${u}a`),
	fc.uuid().map((u) => u.replaceAll("-", "")),
	fc.uuid().map((u) => ` ${u}`),
	fc.uuid().map((u) => `${u} `),
	fc.uuid().map((u) => `g${u.slice(1)}`),
	fc.constantFrom("", " ", "null", "undefined", "1", "00000000-0000-0000-0000"),
);

describe("deleteFoodSchema id", () => {
	// Feature: add-food-route, Property 9: Entry identifier validation
	// **Validates: Requirements 8.4, 8.5**
	it("accepts generated UUIDs in any letter case", () => {
		fc.assert(
			fc.property(fc.uuid(), fc.boolean(), (uuid, upper) => {
				const id = upper ? uuid.toUpperCase() : uuid;

				expect(deleteFoodSchema.safeParse({ id }).success).toBe(true);
			}),
			{ numRuns: NUM_RUNS },
		);
	});

	it("rejects strings that are not UUIDs, with the identifier message", () => {
		fc.assert(
			fc.property(malformedUuid, (id) => {
				const result = deleteFoodSchema.safeParse({ id });

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.message).toBe(
						"Invalid food identifier",
					);
				}
			}),
			{ numRuns: NUM_RUNS },
		);
	});

	it("rejects a missing or non-string id", () => {
		for (const input of [{}, { id: null }, { id: 1 }, { id: [] }]) {
			expect(deleteFoodSchema.safeParse(input).success).toBe(false);
		}
	});
});
