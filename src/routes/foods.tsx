import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FoodForm } from "#/components/food-form";
import { FoodList } from "#/components/food-list";
import { listFoods } from "#/server/foods";

export const Route = createFileRoute("/foods")({
	loader: () => listFoods(),
	component: FoodsPage,
	errorComponent: FoodsError,
});

function PageShell({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen bg-linear-to-br from-indigo-700 via-purple-700 to-fuchsia-700">
			<div className="mx-auto max-w-6xl px-6 py-10">
				<h1 className="text-3xl font-bold text-white">Add Food</h1>
				<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
					{children}
				</div>
			</div>
		</main>
	);
}

export function FoodsPage() {
	const foods = Route.useLoaderData();
	return (
		<PageShell>
			<div className="min-w-0">
				<FoodForm />
			</div>
			<div className="min-w-0">
				<FoodList foods={foods} />
			</div>
		</PageShell>
	);
}

export function FoodsError() {
	const router = useRouter();
	return (
		<PageShell>
			<div className="min-w-0">
				<FoodForm />
			</div>
			<div className="min-w-0">
				<div
					role="alert"
					className="rounded-xl bg-white p-6 text-slate-900 shadow-lg"
				>
					<p>The foods could not be loaded.</p>
					<button
						type="button"
						onClick={() => router.invalidate()}
						className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
					>
						Try again
					</button>
				</div>
			</div>
		</PageShell>
	);
}
