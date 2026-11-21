import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FoodCard } from "#/components/food-card";
import type { Food } from "#/db/schema";
import { deleteFood } from "#/server/foods";

type FoodListProps = {
	foods: Food[];
};

const FAILED_MESSAGE = "Could not delete the food. Please try again.";

export function FoodList({ foods }: FoodListProps) {
	const router = useRouter();
	const deleteFoodFn = useServerFn(deleteFood);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	function handleDelete(id: string) {
		setMessage(null);
		setConfirmingId(id);
	}

	function handleCancel() {
		setConfirmingId(null);
	}

	async function handleConfirm(id: string) {
		if (pendingId !== null) return;
		setPendingId(id);
		setMessage(null);
		try {
			const result = await deleteFoodFn({ data: { id } });
			if (result.ok) {
				setConfirmingId(null);
				await router.invalidate();
			} else if (result.code === "not_found") {
				setConfirmingId(null);
				setMessage(result.message);
				await router.invalidate();
			} else {
				setMessage(result.message);
			}
		} catch {
			setMessage(FAILED_MESSAGE);
		} finally {
			setPendingId(null);
		}
	}

	return (
		<section aria-label="Food list" className="min-w-0 text-white">
			<p className="mb-3 text-lg font-semibold">{foods.length} foods</p>
			{message !== null && (
				<p
					role="alert"
					className="mb-3 rounded-lg bg-white p-3 text-sm text-red-800"
				>
					{message}
				</p>
			)}
			{foods.length === 0 ? (
				<p>No foods yet. Add your first food using the form.</p>
			) : (
				<ul className="flex flex-col gap-3">
					{foods.map((food) => (
						<FoodCard
							key={food.id}
							food={food}
							isConfirming={confirmingId === food.id}
							isPending={pendingId === food.id}
							onDelete={handleDelete}
							onConfirm={handleConfirm}
							onCancel={handleCancel}
						/>
					))}
				</ul>
			)}
		</section>
	);
}
