import type { Food, MealType, NewFood } from "#/db/schema";
import type { CreateFoodInput } from "#/server/food-schemas";

export type MacroDisplay = {
	label: "Protein" | "Carbs" | "Fat";
	value: string;
};

export function formatKcal(calories: number): string {
	return `${calories} kcal`;
}

export function hasVisibleNotes(notes: string | null): notes is string {
	return notes !== null && notes.trim().length > 0;
}

export function getVisibleMacros(
	food: Pick<Food, "proteinG" | "carbsG" | "fatG">,
): MacroDisplay[] {
	const entries: [MacroDisplay["label"], number | null][] = [
		["Protein", food.proteinG],
		["Carbs", food.carbsG],
		["Fat", food.fatG],
	];
	return entries.flatMap(([label, grams]) =>
		grams === null ? [] : [{ label, value: `${grams} g` }],
	);
}

export function getVisibleServingSize(
	servingSize: string | null,
): string | null {
	if (servingSize === null) return null;
	const trimmed = servingSize.trim();
	return trimmed.length > 0 ? trimmed : null;
}

const plainDecimal = /^[+-]?(\d+\.?\d*|\.\d+)$/;

export function toOptionalWholeNumber(text: string): number | undefined {
	const trimmed = text.trim();
	if (trimmed.length === 0) return undefined;
	return plainDecimal.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function toFoodValues(input: CreateFoodInput): NewFood {
	const servingSize = input.servingSize?.trim() ?? "";
	const hasNotes = input.notes !== undefined && input.notes.trim().length > 0;
	const values: NewFood = {
		name: input.name,
		mealType: input.mealType,
		calories: input.calories,
		proteinG: input.proteinG ?? null,
		carbsG: input.carbsG ?? null,
		fatG: input.fatG ?? null,
		servingSize: servingSize.length > 0 ? servingSize : null,
		notes: hasNotes ? (input.notes ?? null) : null,
	};
	if (input.eatenAt) {
		values.eatenAt = new Date(input.eatenAt);
	}
	return values;
}

function pad(n: number, width = 2): string {
	return String(n).padStart(width, "0");
}

export function toLocalDateTimeValue(date: Date): string {
	return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDateTimeValue(value: string): Date {
	const match = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!match) return new Date(Number.NaN);
	const [, y, mo, d, h, mi] = match.map(Number);
	const date = new Date(0);
	date.setFullYear(y, mo - 1, d);
	date.setHours(h, mi, 0, 0);
	return date;
}

export function deleteLabel(name: string): string {
	return `Delete ${name}`;
}

export const mealBadgeClass: Record<MealType, string> = {
	breakfast: "bg-amber-100 text-amber-900",
	lunch: "bg-emerald-100 text-emerald-900",
	dinner: "bg-indigo-100 text-indigo-900",
	snack: "bg-rose-100 text-rose-900",
};
