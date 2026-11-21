# Foodstarter

Foodstarter is a food tracking app. You log what you eat, with a meal type, calories and optional macros, and see every entry in one list, newest first.

Built with TanStack Start (React 19, file-based routing) on Vite and Nitro, Tailwind CSS v4, Drizzle ORM with PostgreSQL, and Zod for validation. Package manager is pnpm. Lint and format use Biome.

## Features

| Feature | Status |
| --- | --- |
| Add food | Done (`/foods`) |
| List food | Done, newest first, with a running total |
| Delete food | Done, with an inline confirmation |
| View food | Done as a card per entry. There is no separate detail page. |
| Edit food | Not built yet |

Each entry stores:

- Name (required)
- Meal type: breakfast, lunch, dinner or snack (required)
- Calories (required)
- Eaten at (required, defaults to now in the form)
- Protein, carbs and fat in grams (optional, whole numbers from 0 to 10,000)
- Serving size (optional, up to 100 characters)
- Notes (optional)

Optional fields that are empty are stored as `NULL` and are not shown on the card.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing page with a link to start tracking |
| `/foods` | Add form and the list of entries |

## Project layout

```
src/
  components/   food-form, food-list, food-card, meal-badge, site-header
  db/           Drizzle schema (schema.ts), client (index.ts), seed script, migration test
  lib/          Pure helpers (food-utils.ts)
  server/       Server functions (foods.ts) and shared Zod schemas (food-schemas.ts)
  routes/       File-based routes (__root, index, foods)
  test/         Integration test setup
drizzle/
  migrations/   Generated SQL migrations
```

Data access rules:

- Only files in `src/server/` import the Drizzle client. Components and routes call server functions.
- Route data loads in `loader`s. Mutations run from components with `useServerFn`.
- Reads use `GET` and mutations use `POST`.
- All server function input is validated with Zod. Database errors are logged on the server and the client gets a fixed message.
- Imports use the `#/*` alias, which maps to `./src/*`.

## Server functions

Defined in `src/server/foods.ts`:

- `listFoods` (GET): returns all entries ordered by `eatenAt`, then `createdAt`, newest first.
- `createFood` (POST): validates input, then inserts. Returns field errors for invalid input without touching the database.
- `deleteFood` (POST): validates the UUID, deletes one row, and returns `not_found` if it no longer exists.

## Database

The `foods` table lives in `src/db/schema.ts`. There are two migrations in `drizzle/migrations/`:

1. `0000`: creates the `foods` table and the `meal_type` enum.
2. `0001`: adds the nullable `protein_g`, `carbs_g`, `fat_g` and `serving_size` columns. Existing rows keep their values and get `NULL` in the new columns.

Schema changes go through `drizzle-kit generate` and `drizzle-kit migrate`. `db:push` is for local experiments only.

## Getting started

Prerequisites: Node.js, pnpm and Docker.

```bash
pnpm install
```

Create `.env.local` (not committed) or edit `.env`, then start PostgreSQL:

```bash
# .env values used by docker-compose.yml and the app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=foodstarter
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foodstarter
```

```bash
pnpm docker:up       # start postgres:17-alpine with a named volume
pnpm db:migrate      # apply migrations
pnpm db:seed         # optional sample data
pnpm dev             # http://localhost:3000
```

`DATABASE_URL` is server-only. Only variables prefixed with `VITE_` reach the browser.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` / `pnpm preview` | Production build and preview |
| `pnpm check` | Biome lint and format check |
| `pnpm lint` / `pnpm format` | Biome lint or format only |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema directly (local development only) |
| `pnpm db:pull` | Introspect the database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Insert sample foods |
| `pnpm docker:up` / `docker:down` / `docker:logs` | Manage the dev database |
| `pnpm test:db:up` / `test:db:down` | Start or stop the test database (port 5433, data in tmpfs) |
| `pnpm test:integration` | Integration tests against PostgreSQL |

## Testing

```bash
pnpm vitest --run                 # unit and component tests (excludes integration)
pnpm test:db:up
pnpm test:integration             # create, list, delete and migration tests
pnpm test:db:down
```

- Unit tests use Vitest, jsdom and Testing Library.
- Property tests use fast-check for the Zod schemas and the helpers in `src/lib/food-utils.ts`.
- Integration tests apply the real migration files to a throwaway database and clear the `foods` table between tests. The migration test applies `0000`, inserts a row, applies `0001`, and checks the row is intact.
- The test database URL is in `.env.test`.

## Development history

Work done so far:

- Scaffolded the TanStack Start project and added Drizzle, PostgreSQL via Docker Compose, Biome and Vitest.
- Added project steering files in `.kiro/steering/` (`tech`, `structure`, `product`).
- Built the `/foods` feature from the spec in `.kiro/specs/add-food-route/`: schema and migrations, db client, Zod schemas, helpers, server functions, components and route, plus unit, property, component and integration tests.
- Extended the `foods` table with optional protein, carbs, fat and serving size (migration `0001`).
- Added delete with inline confirmation.
- Added a landing page and a shared site header.
- Added a seed script and a separate test database.

Not built yet: editing an existing entry.
