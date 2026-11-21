// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Food } from "#/db/schema";

const { deleteFoodMock, invalidateMock } = vi.hoisted(() => ({
	deleteFoodMock: vi.fn(),
	invalidateMock: vi.fn(),
}));

vi.mock("#/server/foods", () => ({ deleteFood: deleteFoodMock }));
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: invalidateMock }),
}));
vi.mock("@tanstack/react-start", () => ({
	// Identity: call the mocked server function directly.
	useServerFn: (fn: unknown) => fn,
}));

import { FoodList } from "./food-list";

const baseDate = new Date("2024-05-01T12:00:00Z");

function makeFood(overrides: Partial<Food> = {}): Food {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		name: "Oatmeal",
		mealType: "breakfast",
		calories: 250,
		proteinG: null,
		carbsG: null,
		fatG: null,
		servingSize: null,
		notes: null,
		eatenAt: baseDate,
		createdAt: baseDate,
		updatedAt: baseDate,
		...overrides,
	};
}

const twoFoods = [
	makeFood(),
	makeFood({
		id: "22222222-2222-4222-8222-222222222222",
		name: "Rice",
		mealType: "lunch",
	}),
];

beforeEach(() => {
	deleteFoodMock.mockReset();
	invalidateMock.mockReset();
	invalidateMock.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("FoodList display", () => {
	it("shows the empty state with a total of 0", () => {
		render(<FoodList foods={[]} />);
		expect(screen.getByText("0 foods")).toBeTruthy();
		expect(screen.getByText(/no foods yet/i)).toBeTruthy();
		expect(screen.queryAllByRole("listitem")).toHaveLength(0);
	});

	it("shows a total equal to the rendered cards", () => {
		render(<FoodList foods={twoFoods} />);
		expect(screen.getByText("2 foods")).toBeTruthy();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.queryByText(/no foods yet/i)).toBeNull();
	});

	it("hides the notes line for blank notes and shows real notes", () => {
		const { container, rerender } = render(
			<FoodList foods={[makeFood({ notes: "   " })]} />,
		);
		// name, kcal, eaten-at only: no extra paragraph for notes
		const before = container.querySelectorAll("li p").length;
		rerender(<FoodList foods={[makeFood({ notes: "with honey" })]} />);
		expect(screen.getByText("with honey")).toBeTruthy();
		expect(container.querySelectorAll("li p").length).toBe(before + 1);

		rerender(<FoodList foods={[makeFood({ notes: null })]} />);
		expect(container.querySelectorAll("li p").length).toBe(before);
	});

	it("shows only the macros and serving size that have values", () => {
		const { container } = render(
			<FoodList
				foods={[
					makeFood({
						proteinG: 12,
						carbsG: 0,
						fatG: null,
						servingSize: "1 cup",
					}),
				]}
			/>,
		);
		expect(screen.getByText("Protein 12 g")).toBeTruthy();
		expect(screen.getByText("Carbs 0 g")).toBeTruthy();
		expect(screen.getByText(/1 cup/)).toBeTruthy();
		const text = container.textContent ?? "";
		expect(text).not.toMatch(/Fat/);
		expect(text).not.toMatch(/N\/A/);
		// A standalone dash placeholder (dates may contain hyphens in some locales).
		expect(text).not.toMatch(/(^|\s)-(\s|$)/);
	});

	it("shows no macro or serving text when all four values are null", () => {
		const { container } = render(<FoodList foods={[makeFood()]} />);
		const text = container.textContent ?? "";
		for (const word of ["Protein", "Carbs", "Fat", "Serving"]) {
			expect(text).not.toContain(word);
		}
	});

	it("keeps 100-character unbroken name and serving size inside the card", () => {
		const long = "x".repeat(100);
		render(<FoodList foods={[makeFood({ name: long, servingSize: long })]} />);
		const card = screen.getByRole("listitem");
		expect(card.className).toContain("min-w-0");
		const heading = screen.getByRole("heading", { name: long });
		expect(heading.className).toContain("break-words");
		expect(heading.className).toContain("wrap-anywhere");
		const serving = screen.getByText(`Serving ${long}`);
		expect(serving.className).toContain("break-words");
		expect(serving.className).toContain("wrap-anywhere");
	});
});

describe("FoodList delete flow", () => {
	it("renders one Delete button per card, labelled with the name", () => {
		render(<FoodList foods={twoFoods} />);
		expect(screen.getAllByRole("button", { name: /^Delete / })).toHaveLength(2);
		expect(screen.getByRole("button", { name: "Delete Oatmeal" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Delete Rice" })).toBeTruthy();
	});

	it("shows a confirmation with the name and makes no call on cancel", async () => {
		const user = userEvent.setup();
		render(<FoodList foods={twoFoods} />);
		await user.click(screen.getByRole("button", { name: "Delete Oatmeal" }));

		expect(screen.getByText("Delete Oatmeal?")).toBeTruthy();
		expect(screen.queryByText("Delete Rice?")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.queryByText("Delete Oatmeal?")).toBeNull();
		expect(deleteFoodMock).not.toHaveBeenCalled();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	it("calls deleteFood once on confirm and invalidates on success", async () => {
		deleteFoodMock.mockResolvedValue({ ok: true, id: twoFoods[0].id });
		const user = userEvent.setup();
		render(<FoodList foods={twoFoods} />);
		await user.click(screen.getByRole("button", { name: "Delete Oatmeal" }));
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		await waitFor(() => expect(invalidateMock).toHaveBeenCalledTimes(1));
		expect(deleteFoodMock).toHaveBeenCalledTimes(1);
		expect(deleteFoodMock).toHaveBeenCalledWith({
			data: { id: twoFoods[0].id },
		});
		await waitFor(() =>
			expect(screen.queryByText("Delete Oatmeal?")).toBeNull(),
		);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("disables the card controls while the delete is pending", async () => {
		let resolve: (v: unknown) => void = () => {};
		deleteFoodMock.mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		const user = userEvent.setup();
		render(<FoodList foods={twoFoods} />);
		await user.click(screen.getByRole("button", { name: "Delete Oatmeal" }));
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		await waitFor(() =>
			expect(
				(screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement)
					.disabled,
			).toBe(true),
		);
		expect(
			(screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(
			(
				screen.getByRole("button", {
					name: "Delete Oatmeal",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(deleteFoodMock).toHaveBeenCalledTimes(1);

		resolve({ ok: true, id: twoFoods[0].id });
		await waitFor(() => expect(invalidateMock).toHaveBeenCalledTimes(1));
	});

	it("shows the message, closes the confirmation and invalidates on not_found", async () => {
		deleteFoodMock.mockResolvedValue({
			ok: false,
			code: "not_found",
			message: "This food was already deleted.",
		});
		const user = userEvent.setup();
		render(<FoodList foods={twoFoods} />);
		await user.click(screen.getByRole("button", { name: "Delete Oatmeal" }));
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"already deleted",
		);
		expect(invalidateMock).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("Delete Oatmeal?")).toBeNull();
	});

	it.each([
		"invalid_id",
		"failed",
	])("keeps the card and re-enables controls on a %s result", async (code) => {
		deleteFoodMock.mockResolvedValue({
			ok: false,
			code,
			message: "Could not delete the food. Please try again.",
		});
		const user = userEvent.setup();
		render(<FoodList foods={twoFoods} />);
		await user.click(screen.getByRole("button", { name: "Delete Oatmeal" }));
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not delete",
		);
		expect(invalidateMock).not.toHaveBeenCalled();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		await waitFor(() =>
			expect(
				(screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement)
					.disabled,
			).toBe(false),
		);
	});

	it("shows a fixed message and re-enables controls when the call throws", async () => {
		deleteFoodMock.mockRejectedValue(new Error("boom"));
		const user = userEvent.setup();
		render(<FoodList foods={twoFoods} />);
		await user.click(screen.getByRole("button", { name: "Delete Oatmeal" }));
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not delete",
		);
		expect(screen.queryByText("boom")).toBeNull();
		expect(invalidateMock).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(
				(screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement)
					.disabled,
			).toBe(false),
		);
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});
});
