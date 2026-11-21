import { config } from "dotenv";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { foods, type NewFood } from "./schema";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set. Define it in .env or .env.local.");
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

function hoursAgo(hours: number): Date {
	return new Date(Date.now() - hours * 60 * 60 * 1000);
}

const seedFoods: NewFood[] = [
	{
		name: "Oatmeal with banana",
		mealType: "breakfast",
		calories: 320,
		notes: "Made with milk and a drizzle of honey",
		eatenAt: hoursAgo(30),
	},
	{
		name: "Scrambled eggs on toast",
		mealType: "breakfast",
		calories: 410,
		eatenAt: hoursAgo(6),
	},
	{
		name: "Chicken caesar salad",
		mealType: "lunch",
		calories: 480,
		notes: "Dressing on the side",
		eatenAt: hoursAgo(26),
	},
	{
		name: "Nasi lemak",
		mealType: "lunch",
		calories: 644,
		eatenAt: hoursAgo(3),
	},
	{
		name: "Grilled salmon with rice",
		mealType: "dinner",
		calories: 620,
		notes: "Steamed broccoli on the side",
		eatenAt: hoursAgo(20),
	},
	{
		name: "Spaghetti bolognese",
		mealType: "dinner",
		calories: 710,
		eatenAt: hoursAgo(44),
	},
	{
		name: "Greek yogurt with berries",
		mealType: "snack",
		calories: 150,
		eatenAt: hoursAgo(28),
	},
	{
		name: "Apple and peanut butter",
		mealType: "snack",
		calories: 230,
		eatenAt: hoursAgo(1),
	},
];

async function seed() {
	const [{ total }] = await db.select({ total: count() }).from(foods);

	if (total > 0) {
		console.log(`foods already has ${total} row(s). Skipping seed.`);
		return;
	}

	const inserted = await db.insert(foods).values(seedFoods).returning();
	console.log(`Seeded ${inserted.length} foods.`);
}

seed()
	.catch((error) => {
		console.error("Seeding failed:", error);
		process.exitCode = 1;
	})
	.finally(() => client.end());
