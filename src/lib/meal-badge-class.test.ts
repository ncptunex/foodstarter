import { describe, expect, it } from "vitest";
import { mealTypes } from "#/db/schema";
import { mealBadgeClass } from "#/lib/food-utils";

describe("mealBadgeClass", () => {
	it("has a non-empty class string for every meal type", () => {
		for (const mealType of mealTypes) {
			const className = mealBadgeClass[mealType];
			expect(typeof className).toBe("string");
			expect(className.trim().length).toBeGreaterThan(0);
		}
	});

	it("uses a distinct class string for each meal type", () => {
		const classes = mealTypes.map((mealType) => mealBadgeClass[mealType]);
		expect(new Set(classes).size).toBe(mealTypes.length);
	});
});
