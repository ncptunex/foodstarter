import { z } from "zod";
import { type Food, mealTypes } from "#/db/schema";

const eatenAtValue = z
	.string()
	.refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time");

const macroMessage = "Enter a whole number from 0 to 10,000";

// Optional whole grams. Omitted (undefined) is valid and means "not provided".
// 0 is valid and is a recorded value.
const macroGrams = z
	.number(macroMessage)
	.int(macroMessage)
	.min(0, macroMessage)
	.max(10000, macroMessage)
	.optional();

export const createFoodSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(255, "Name must be 255 characters or fewer"),
	mealType: z.enum(mealTypes, "Choose a meal type"),
	calories: z
		.number("Calories must be a number")
		.int("Calories must be a whole number")
		.min(0, "Calories cannot be negative")
		.max(100000, "Calories must be 100,000 or fewer"),
	proteinG: macroGrams,
	carbsG: macroGrams,
	fatG: macroGrams,
	// Trimmed first, so the length check applies to the trimmed value.
	// Blank values pass here and are stored as NULL by toFoodValues.
	servingSize: z
		.string()
		.trim()
		.max(100, "Serving size must be 100 characters or fewer")
		.optional(),
	notes: z
		.string()
		.max(1000, "Notes must be 1,000 characters or fewer")
		.optional(),
	// Omitted or "" means "use the server time".
	eatenAt: z.union([z.literal(""), eatenAtValue]).optional(),
});

// Form variant: eaten-at is required in the UI.
export const createFoodFormSchema = createFoodSchema.extend({
	eatenAt: eatenAtValue.min(1, "Eaten at is required"),
});

export const deleteFoodSchema = z.object({
	id: z.uuid("Invalid food identifier"),
});

export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type FieldErrors = Partial<Record<keyof CreateFoodInput, string[]>>;

export type CreateFoodResult =
	| { ok: true; food: Food }
	| {
			ok: false;
			code: "validation";
			message: string;
			fieldErrors: FieldErrors;
	  }
	| { ok: false; code: "failed"; message: string };

export type DeleteFoodResult =
	| { ok: true; id: string }
	| {
			ok: false;
			code: "invalid_id" | "not_found" | "failed";
			message: string;
	  };
