// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Food } from "#/db/schema";

const { foodsMock, invalidateMock } = vi.hoisted(() => ({
	foodsMock: { current: [] as unknown[] },
	invalidateMock: vi.fn(),
}));

vi.mock("#/server/foods", () => ({
	listFoods: vi.fn(),
	createFood: vi.fn(),
	deleteFood: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
	useServerFn: (fn: unknown) => fn,
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useLoaderData: () => foodsMock.current,
	}),
	useRouter: () => ({ invalidate: invalidateMock }),
}));

import { FoodsError, FoodsPage } from "./foods";

const foods: Food[] = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		name: "Oatmeal",
		calories: 250,
		mealType: "breakfast",
		notes: null,
		eatenAt: new Date("2024-01-01T08:00:00Z"),
		createdAt: new Date("2024-01-01T08:00:00Z"),
		proteinG: null,
		carbsG: null,
		fatG: null,
		servingSize: null,
	} as Food,
];

afterEach(() => {
	cleanup();
	foodsMock.current = [];
});

describe("FoodsPage", () => {
	it("renders one heading, one form and one list", () => {
		foodsMock.current = foods;
		const { container } = render(<FoodsPage />);

		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0].textContent).toContain("Add Food");
		expect(container.querySelectorAll("form")).toHaveLength(1);
		const lists = screen.getAllByRole("list");
		expect(lists).toHaveLength(1);
		expect(within(lists[0]).getByText("Oatmeal")).toBeTruthy();
	});
});

describe("FoodsError", () => {
	it("shows the heading, the form and the error message without a list", () => {
		const { container } = render(<FoodsError />);

		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0].textContent).toContain("Add Food");
		expect(container.querySelectorAll("form")).toHaveLength(1);
		expect(screen.getByRole("alert").textContent).toContain(
			"The foods could not be loaded.",
		);
		expect(screen.queryByRole("list")).toBeNull();
	});
});
