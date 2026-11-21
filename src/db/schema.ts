import {
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

export const mealTypeEnum = pgEnum("meal_type", mealTypes);

export const foods = pgTable(
	"foods",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		mealType: mealTypeEnum("meal_type").notNull(),
		calories: integer("calories").notNull(),
		proteinG: integer("protein_g"),
		carbsG: integer("carbs_g"),
		fatG: integer("fat_g"),
		servingSize: varchar("serving_size", { length: 100 }),
		notes: text("notes"),
		eatenAt: timestamp("eaten_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("foods_eaten_at_idx").on(table.eatenAt)],
);

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type MealType = (typeof mealTypes)[number];
