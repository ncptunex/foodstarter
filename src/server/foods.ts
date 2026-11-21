import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { foods } from "#/db/schema";
import { toFoodValues } from "#/lib/food-utils";
import {
	type CreateFoodResult,
	createFoodSchema,
	type DeleteFoodResult,
	deleteFoodSchema,
} from "./food-schemas";

export const listFoods = createServerFn({ method: "GET" }).handler(async () => {
	try {
		return await db
			.select()
			.from(foods)
			.orderBy(desc(foods.eatenAt), desc(foods.createdAt));
	} catch (error) {
		console.error("listFoods failed:", error);
		throw new Error("Could not load foods. Please try again.");
	}
});

export const createFood = createServerFn({ method: "POST" })
	.validator((data: unknown) => createFoodSchema.safeParse(data))
	.handler(async ({ data }): Promise<CreateFoodResult> => {
		if (!data.success) {
			return {
				ok: false,
				code: "validation",
				message: "Some fields are invalid.",
				fieldErrors: z.flattenError(data.error).fieldErrors,
			};
		}
		const values = toFoodValues(data.data);
		try {
			const [food] = await db.insert(foods).values(values).returning();
			return { ok: true, food };
		} catch (error) {
			console.error("createFood failed:", error);
			return {
				ok: false,
				code: "failed",
				message: "Could not save the food. Please try again.",
			};
		}
	});

export const deleteFood = createServerFn({ method: "POST" })
	.validator((data: unknown) => deleteFoodSchema.safeParse(data))
	.handler(async ({ data }): Promise<DeleteFoodResult> => {
		if (!data.success) {
			return {
				ok: false,
				code: "invalid_id",
				message: "The food identifier is invalid.",
			};
		}
		try {
			const [deleted] = await db
				.delete(foods)
				.where(eq(foods.id, data.data.id))
				.returning({ id: foods.id });
			if (!deleted) {
				return {
					ok: false,
					code: "not_found",
					message: "This food no longer exists.",
				};
			}
			return { ok: true, id: deleted.id };
		} catch (error) {
			console.error("deleteFood failed:", error);
			return {
				ok: false,
				code: "failed",
				message: "Could not delete the food. Please try again.",
			};
		}
	});
