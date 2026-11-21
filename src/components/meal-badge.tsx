import type { MealType } from "#/db/schema";
import { mealBadgeClass } from "#/lib/food-utils";

export function MealBadge({ mealType }: { mealType: MealType }) {
	return (
		<span
			className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${mealBadgeClass[mealType]}`}
		>
			{mealType}
		</span>
	);
}
