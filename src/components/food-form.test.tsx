// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mealTypes } from "#/db/schema";

const { createFoodMock, invalidateMock } = vi.hoisted(() => ({
	createFoodMock: vi.fn(),
	invalidateMock: vi.fn(),
}));

vi.mock("#/server/foods", () => ({ createFood: createFoodMock }));
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: invalidateMock }),
}));
vi.mock("@tanstack/react-start", () => ({
	// Identity: call the mocked server function directly.
	useServerFn: (fn: unknown) => fn,
}));

import { FoodForm } from "./food-form";

const macroError = "Enter a whole number from 0 to 10,000";

const field = (name: RegExp | string) => screen.getByLabelText(name);
const submit = () => screen.getByRole("button", { name: /add food|saving/i });

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
	await user.type(field("Name"), "Oatmeal");
	await user.type(field("Calories"), "250");
}

beforeEach(() => {
	createFoodMock.mockReset();
	invalidateMock.mockReset();
	invalidateMock.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("FoodForm fields", () => {
	it("renders every field with a label", () => {
		render(<FoodForm />);
		for (const label of [
			"Name",
			"Meal type",
			"Calories",
			"Protein (g)",
			"Carbs (g)",
			"Fat (g)",
			"Serving size",
			"Eaten at",
			"Notes",
		]) {
			expect(field(label)).toBeTruthy();
		}
	});

	it("offers exactly the meal types", () => {
		render(<FoodForm />);
		const options = Array.from(
			(field("Meal type") as HTMLSelectElement).options,
		).map((o) => o.value);
		expect(options).toEqual([...mealTypes]);
		expect(options).toHaveLength(4);
	});

	it("requires only name, meal type, calories and eaten at", () => {
		render(<FoodForm />);
		const required = ["Name", "Meal type", "Calories", "Eaten at"].map(
			(l) => (field(l) as HTMLInputElement).required,
		);
		expect(required).toEqual([true, true, true, true]);
		for (const l of [
			"Protein (g)",
			"Carbs (g)",
			"Fat (g)",
			"Serving size",
			"Notes",
		]) {
			expect((field(l) as HTMLInputElement).required).toBe(false);
		}
	});

	it("starts with the four new fields empty", () => {
		render(<FoodForm />);
		for (const l of ["Protein (g)", "Carbs (g)", "Fat (g)", "Serving size"]) {
			expect((field(l) as HTMLInputElement).value).toBe("");
		}
	});
});

describe("FoodForm validation", () => {
	it("shows messages, keeps values and makes no call on invalid submit", async () => {
		const user = userEvent.setup();
		render(<FoodForm />);
		await user.type(field("Notes"), "keep me");
		await user.click(submit());

		expect(await screen.findByText("Name is required")).toBeTruthy();
		expect((field("Notes") as HTMLTextAreaElement).value).toBe("keep me");
		expect(createFoodMock).not.toHaveBeenCalled();
	});

	it.each(["abc", "10001"])("rejects %s in a macro field", async (bad) => {
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.type(field("Protein (g)"), bad);
		await user.click(submit());

		expect(await screen.findByText(macroError)).toBeTruthy();
		expect((field("Protein (g)") as HTMLInputElement).value).toBe(bad);
		expect(createFoodMock).not.toHaveBeenCalled();
	});

	it("rejects a 101 character serving size", async () => {
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.click(field("Serving size"));
		await user.paste("a".repeat(101));
		await user.click(submit());

		expect(
			await screen.findByText("Serving size must be 100 characters or fewer"),
		).toBeTruthy();
		expect(createFoodMock).not.toHaveBeenCalled();
	});
});

describe("FoodForm submit", () => {
	it("omits empty macros and sends 0 as 0", async () => {
		createFoodMock.mockResolvedValue({ ok: true, food: {} });
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.type(field("Protein (g)"), "0");
		await user.click(submit());

		await waitFor(() => expect(createFoodMock).toHaveBeenCalledTimes(1));
		const { data } = createFoodMock.mock.calls[0][0];
		expect(data.proteinG).toBe(0);
		expect(data.name).toBe("Oatmeal");
		expect(data.calories).toBe(250);
		expect(data.carbsG ?? undefined).toBeUndefined();
		expect(data.fatG ?? undefined).toBeUndefined();
	});

	it("resets fields and invalidates the router on success", async () => {
		createFoodMock.mockResolvedValue({ ok: true, food: {} });
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.type(field("Protein (g)"), "5");
		await user.type(field("Serving size"), "1 cup");
		await user.type(field("Notes"), "hi");
		await user.click(submit());

		await waitFor(() => expect(invalidateMock).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect((field("Name") as HTMLInputElement).value).toBe(""),
		);
		for (const l of [
			"Calories",
			"Protein (g)",
			"Carbs (g)",
			"Fat (g)",
			"Serving size",
			"Notes",
		]) {
			expect((field(l) as HTMLInputElement).value).toBe("");
		}
		expect((field("Meal type") as HTMLSelectElement).value).toBe(mealTypes[0]);
	});

	it("disables submit while pending", async () => {
		let resolve: (v: unknown) => void = () => {};
		createFoodMock.mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.click(submit());

		await waitFor(() =>
			expect((submit() as HTMLButtonElement).disabled).toBe(true),
		);
		resolve({ ok: true, food: {} });
		await waitFor(() =>
			expect((submit() as HTMLButtonElement).disabled).toBe(false),
		);
	});

	it("keeps values and re-enables submit on a failure result", async () => {
		createFoodMock.mockResolvedValue({
			ok: false,
			code: "failed",
			message: "Could not save the food. Please try again.",
		});
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.click(submit());

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not save the food",
		);
		expect((field("Name") as HTMLInputElement).value).toBe("Oatmeal");
		expect((submit() as HTMLButtonElement).disabled).toBe(false);
		expect(invalidateMock).not.toHaveBeenCalled();
	});

	it("keeps values and shows an alert when the call throws", async () => {
		createFoodMock.mockRejectedValue(new Error("boom"));
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.click(submit());

		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(screen.queryByText("boom")).toBeNull();
		expect((field("Name") as HTMLInputElement).value).toBe("Oatmeal");
		expect((submit() as HTMLButtonElement).disabled).toBe(false);
	});

	it("shows server field errors from a validation result", async () => {
		createFoodMock.mockResolvedValue({
			ok: false,
			code: "validation",
			message: "Invalid",
			fieldErrors: { fatG: [macroError] },
		});
		const user = userEvent.setup();
		render(<FoodForm />);
		await fillRequired(user);
		await user.click(submit());

		expect(await screen.findByText(macroError)).toBeTruthy();
		expect((field("Name") as HTMLInputElement).value).toBe("Oatmeal");
	});
});
