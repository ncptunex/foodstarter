import { MealBadge } from "#/components/meal-badge";
import type { Food } from "#/db/schema";
import {
	deleteLabel,
	formatKcal,
	getVisibleMacros,
	getVisibleServingSize,
	hasVisibleNotes,
} from "#/lib/food-utils";

export type FoodCardProps = {
	food: Food;
	/** True while this card shows the "Delete {name}?" confirmation. */
	isConfirming: boolean;
	/** True while the delete call for this card is in flight. */
	isPending: boolean;
	/** Delete button activated: open the confirmation. */
	onDelete: (id: string) => void;
	/** Confirm pressed: run the delete. */
	onConfirm: (id: string) => void;
	/** Cancel pressed: close the confirmation without a call. */
	onCancel: () => void;
};

export function FoodCard({
	food,
	isConfirming,
	isPending,
	onDelete,
	onConfirm,
	onCancel,
}: FoodCardProps) {
	const macros = getVisibleMacros(food);
	const serving = getVisibleServingSize(food.servingSize);

	return (
		<li className="min-w-0 rounded-xl bg-white/95 p-4 text-slate-900 shadow">
			<div className="flex min-w-0 items-start justify-between gap-3">
				<h3 className="min-w-0 break-words font-semibold wrap-anywhere">
					{food.name}
				</h3>
				<MealBadge mealType={food.mealType} />
			</div>
			<p className="mt-1 text-sm">{formatKcal(food.calories)}</p>
			{macros.length > 0 && (
				<p className="mt-1 flex flex-wrap gap-x-3 text-sm">
					{macros.map((macro) => (
						<span key={macro.label}>
							{macro.label} {macro.value}
						</span>
					))}
				</p>
			)}
			{serving !== null && (
				<p className="mt-1 min-w-0 break-words text-sm wrap-anywhere">
					Serving {serving}
				</p>
			)}
			<p className="mt-1 text-sm text-slate-700">
				{food.eatenAt.toLocaleString()}
			</p>
			{hasVisibleNotes(food.notes) && (
				<p className="mt-1 min-w-0 break-words text-sm wrap-anywhere">
					{food.notes}
				</p>
			)}
			<div className="mt-3 flex flex-wrap items-center gap-2">
				<button
					type="button"
					aria-label={deleteLabel(food.name)}
					disabled={isPending}
					onClick={() => onDelete(food.id)}
					className="rounded-lg bg-red-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
				>
					Delete
				</button>
				{isConfirming && (
					<>
						<span className="min-w-0 break-words text-sm wrap-anywhere">
							Delete {food.name}?
						</span>
						<button
							type="button"
							disabled={isPending}
							onClick={() => onConfirm(food.id)}
							className="rounded-lg bg-red-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
						>
							Confirm
						</button>
						<button
							type="button"
							disabled={isPending}
							onClick={onCancel}
							className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-medium text-slate-900 disabled:opacity-60"
						>
							Cancel
						</button>
					</>
				)}
			</div>
		</li>
	);
}
