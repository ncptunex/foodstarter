# Implementation Plan: Add Food Route

## Overview

The plan builds the `/foods` feature bottom-up in TypeScript: dependency and schema change with a generated Drizzle migration, the db client, the shared Zod schemas, the pure helpers, the server functions, the components, and finally the route that wires them together. Property tests sit next to the code they check. Example and integration tests follow the code they cover. The last tasks run `pnpm check`, `tsc --noEmit` and the test suite.

Rules that apply to every task:

- Import with the `#/*` alias and `@tanstack/react-start`. Use `.inputValidator(...)`, not `.validator(...)`.
- Only files in `src/server/` import the Drizzle client. Components and routes never do.
- Use `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`. Do not use `drizzle-kit push`.
- Do not edit `src/routeTree.gen.ts`. The router plugin regenerates it.

## Tasks

- [x] 1. Dependencies, schema change and migration
  - [x] 1.1 Add the `fast-check` dev dependency
    - Run `pnpm add -D fast-check`
    - Confirm `vitest`, `jsdom` and `@testing-library/react` are already in `package.json`. Add only what is missing.
    - _Requirements: none (supports the property tests)_

  - [x] 1.2 Add the four nullable columns to `foods` in `src/db/schema.ts`
    - Add `proteinG: integer("protein_g")`, `carbsG: integer("carbs_g")`, `fatG: integer("fat_g")` and `servingSize: varchar("serving_size", { length: 100 })`
    - No `.notNull()` and no `.default(...)`. Leave the other columns, `mealTypes`, `Food`, `NewFood` and `MealType` unchanged.
    - _Requirements: 7.10, 7.5_

  - [x] 1.3 Generate, review and apply the Drizzle migration
    - Run `pnpm drizzle-kit generate` to create `drizzle/migrations/0001_*.sql` and update `meta/`
    - Check that the SQL contains only the four `ALTER TABLE "foods" ADD COLUMN` statements. Fix the schema and regenerate if it has a `DROP` or `NOT NULL`.
    - Run `pnpm drizzle-kit migrate` against the local database
    - Do not hand-edit the generated files and do not run `drizzle-kit push`
    - _Requirements: 7.10, 7.11, 7.12_

- [x] 2. Database client and shared Zod schemas
  - [x] 2.1 Create the Drizzle client in `src/db/index.ts`
    - Use `drizzle-orm/postgres-js` with `postgres(process.env.DATABASE_URL)` and `{ schema }`
    - Throw an error that names `DATABASE_URL` (not its value) when it is missing
    - _Requirements: 7.4_

  - [x] 2.2 Create `src/server/food-schemas.ts`
    - Define `createFoodSchema`, `createFoodFormSchema` (requires `eatenAt`) and `deleteFoodSchema` with the messages from the design
    - Build the meal type check with `z.enum(mealTypes)` imported from `#/db/schema`. Do not repeat the list.
    - Export `CreateFoodInput`, `FieldErrors`, `CreateFoodResult` and `DeleteFoodResult`. Import `Food` as a type from `#/db/schema`.
    - Do not import the Drizzle client in this file
    - _Requirements: 2.6, 2.7, 2.8, 2.10, 2.11, 2.12, 2.13, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 7.5, 7.6, 8.4_

  - [x]* 2.3 Write property test for name validation
    - Create `src/server/food-schemas.test.ts` with `fast-check` at 100 runs minimum
    - **Property 1: Name validation and trimming**
    - **Validates: Requirements 2.6, 3.1**

  - [x]* 2.4 Write property test for calories validation
    - **Property 2: Calories validation**
    - **Validates: Requirements 2.7, 3.2**

  - [x]* 2.5 Write property test for meal type validation
    - **Property 3: Meal type validation**
    - **Validates: Requirements 3.3**

  - [x]* 2.6 Write property test for notes validation
    - **Property 4: Notes validation**
    - **Validates: Requirements 2.8, 3.4**

  - [x]* 2.7 Write property test for eaten-at validation
    - **Property 5: Eaten-at validation**
    - **Validates: Requirements 3.5**

  - [x]* 2.8 Write property test for macro validation
    - Include the boundaries 0, 10000, 10001 and -1 in the generator
    - **Property 6: Macro validation**
    - **Validates: Requirements 2.10, 2.12, 3.6, 3.7, 3.10**

  - [x]* 2.9 Write property test for serving size validation and trimming
    - Hit the boundaries of trimmed length 100 (accepted) and 101 (rejected)
    - **Property 7: Serving size validation and trimming**
    - **Validates: Requirements 2.11, 2.13, 3.8, 3.9**

  - [x]* 2.10 Write property test for exact reporting of invalid fields
    - **Property 8: Invalid fields are reported exactly**
    - **Validates: Requirements 2.14, 3.13, 4.11**

  - [x]* 2.11 Write property test for entry identifier validation
    - **Property 9: Entry identifier validation**
    - **Validates: Requirements 8.4, 8.5**

- [x] 3. Pure helpers
  - [x] 3.1 Create `src/lib/food-utils.ts`
    - Implement `formatKcal`, `hasVisibleNotes`, `getVisibleMacros`, `getVisibleServingSize`, `toOptionalWholeNumber`, `toFoodValues`, `toLocalDateTimeValue`, `fromLocalDateTimeValue`, `deleteLabel` and `mealBadgeClass`
    - Type `mealBadgeClass` as `Record<MealType, string>` with the badge classes from the design
    - Import `CreateFoodInput` from `#/server/food-schemas` as a type only
    - _Requirements: 2.3, 2.9, 2.12, 3.7, 3.9, 3.10, 4.4, 4.5, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.4, 8.17_

  - [x]* 3.2 Write property test for optional values mapping
    - Create `src/lib/food-utils.test.ts`
    - **Property 10: Optional values map to NULL, zero and trimmed text**
    - **Validates: Requirements 3.7, 3.9, 3.10, 4.4, 4.5**

  - [x]* 3.3 Write property test for whole-number text parsing
    - **Property 11: Whole-number text parsing**
    - **Validates: Requirements 2.9, 2.12, 3.6, 3.7**

  - [x]* 3.4 Write property test for calories display format
    - **Property 12: Calories display format**
    - **Validates: Requirements 5.3**

  - [x]* 3.5 Write property test for notes line visibility
    - **Property 13: Notes line visibility**
    - **Validates: Requirements 5.4**

  - [x]* 3.6 Write property test for macro display visibility
    - **Property 14: Macro display visibility**
    - **Validates: Requirements 5.5, 5.7, 5.8**

  - [x]* 3.7 Write property test for serving size display visibility
    - **Property 15: Serving size display visibility**
    - **Validates: Requirements 5.6, 5.7, 5.8**

  - [x]* 3.8 Write property test for the local date-time round trip
    - **Property 16: Local date-time input round trip**
    - **Validates: Requirements 2.3**

  - [x]* 3.9 Write property test for the delete label
    - **Property 17: Delete label contains the entry name**
    - **Validates: Requirements 8.17**

  - [x]* 3.10 Write unit test for meal badge classes
    - Create `src/lib/meal-badge-class.test.ts`
    - Check that every entry of `mealTypes` has a class string and that no two are equal
    - _Requirements: 6.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Server functions
  - [x] 5.1 Create `src/server/foods.ts` with `listFoods`, `createFood` and `deleteFood`
    - `listFoods`: GET, `db.select().from(foods).orderBy(desc(foods.eatenAt), desc(foods.createdAt))`. On error, `console.error` and throw the fixed message "Could not load foods. Please try again."
    - `createFood`: POST, `.inputValidator((data: unknown) => createFoodSchema.safeParse(data))`. Return `{ ok: false, code: "validation", fieldErrors }` before any database call. Insert `toFoodValues(data.data)` with `.returning()`. On a database error, `console.error` and return the fixed failure message.
    - `deleteFood`: POST, `.inputValidator` with `deleteFoodSchema.safeParse`. Return `invalid_id` before any write. Use `.returning({ id })`. Return `not_found` when no row is deleted and `failed` with a fixed message on a database error.
    - Import `createServerFn` from `@tanstack/react-start`
    - _Requirements: 3.12, 3.13, 4.1, 4.2, 4.3, 4.4, 4.5, 4.9, 4.11, 5.1, 5.2, 5.11, 7.3, 7.4, 7.7, 8.4, 8.5, 8.6, 8.7, 8.11, 8.13, 8.16_

  - [x]* 5.2 Write unit tests for the server functions with a mocked `db`
    - Create `src/server/foods.test.ts`
    - Invalid create input (bad macro, serving size over 100 characters) makes no insert call
    - A valid input with the four new fields calls `values` with the mapped `proteinG`, `carbsG`, `fatG` and `servingSize`
    - A rejected insert or delete returns the fixed message, calls `console.error` and the message does not contain the mocked error text
    - An invalid delete id makes no delete call
    - _Requirements: 3.12, 3.13, 4.4, 4.5, 4.9, 7.7, 8.5, 8.13_

- [x] 6. Components
  - [x] 6.1 Create `src/components/meal-badge.tsx`
    - `MealBadge` takes a `MealType` and renders its label with `mealBadgeClass[mealType]`
    - _Requirements: 6.4, 6.5_

  - [x] 6.2 Create `src/components/food-card.tsx`
    - Show name (`break-words wrap-anywhere`), `MealBadge`, `formatKcal`, eaten-at with `toLocaleString()` and the notes line only when `hasVisibleNotes`
    - Render macros from `getVisibleMacros` and serving size from `getVisibleServingSize`. Render the macro wrapper only when there is at least one macro and the serving line only when it is not `null`. Show no placeholders.
    - Render one Delete button with `aria-label={deleteLabel(food.name)}`, plus the confirm and cancel controls. Take the state and handlers as props.
    - Use `rounded-xl bg-white/95 p-4 text-slate-900 shadow` and `min-w-0`
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.3, 6.5, 6.8, 8.1, 8.2, 8.15, 8.17_

  - [x] 6.3 Create `src/components/food-form.tsx`
    - Fields: name, meal type `<select>` built from `mealTypes`, calories, Protein (g), Carbs (g), Fat (g), Serving size, eaten-at (`datetime-local`) and notes. The macro fields use `type="text"` with `inputMode="numeric"`. Serving size has no `maxLength`.
    - Set eaten-at in an effect after mount using `toLocalDateTimeValue(new Date())`
    - On submit: build the candidate with `toOptionalWholeNumber` for macros, validate with `createFoodFormSchema.safeParse`, show per-field errors and keep values on failure, otherwise call `createFood` through `useServerFn`
    - Handle `ok` (reset and `router.invalidate()`), `validation` (field errors), `failed` or a thrown error (form-level `role="alert"` message, values kept). Disable submit while pending.
    - Label every field. Link errors with `aria-describedby`. Style with `rounded-xl bg-white p-6 text-slate-900 shadow-lg`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.9, 2.12, 2.13, 2.14, 3.11, 4.6, 4.7, 4.8, 4.10, 6.2, 6.5, 7.2_

  - [x] 6.4 Create `src/components/food-list.tsx`
    - Props: `foods: Food[]`. Show the total (`foods.length`), the empty-state message when there are no foods, and a `<ul>` of `FoodCard`s otherwise.
    - Hold `confirmingId`, `pendingId` and `message` state. Call `deleteFood` through `useServerFn`. Cancel clears the confirmation without a call.
    - Handle `ok` (clear state, `router.invalidate()`), `not_found` (show message, `router.invalidate()`), and `invalid_id`, `failed` or a thrown error (show message, keep the card, re-enable controls)
    - _Requirements: 5.9, 5.10, 7.9, 8.2, 8.3, 8.8, 8.9, 8.10, 8.12, 8.14, 8.15_

  - [x]* 6.5 Write component tests for the form
    - Create `src/components/food-form.test.tsx` with `vitest`, `jsdom` and `@testing-library/react`, and mocked server functions
    - Fields are present, the four meal options equal `mealTypes`, only name, meal type, calories and eaten-at are required, and the four new fields start empty
    - An invalid submit shows messages, keeps values and makes no call. "abc" and "10001" in a macro field show "Enter a whole number from 0 to 10,000". 101 characters of serving size shows "Serving size must be 100 characters or fewer".
    - An empty macro sends no key and "0" sends `0`
    - Success resets all fields and calls `router.invalidate()`. Pending disables submit. A failure keeps values and re-enables submit.
    - _Requirements: 2.1, 2.2, 2.4, 2.9, 2.12, 2.13, 2.14, 3.11, 4.6, 4.7, 4.8, 4.10_

  - [x]* 6.6 Write component tests for the list and card
    - Create `src/components/food-list.test.tsx`
    - Empty state with total 0, total equals rendered cards, notes line hidden for blank notes
    - A card with `proteinG: 12, carbsG: 0, fatG: null, servingSize: "1 cup"` shows "Protein 12 g", "Carbs 0 g" and "1 cup" and no Fat label or `-` or `N/A`. A card with all four values `null` shows no Protein, Carbs, Fat or Serving text.
    - A 100-character serving size with no spaces and a 100-character name with no spaces stay inside the card
    - Delete flow: one Delete button per card, confirmation shows the name, cancel makes no call, confirm calls once, pending disables controls, and the success, not-found and failure branches
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.8, 8.1, 8.2, 8.3, 8.8, 8.9, 8.10, 8.12, 8.14, 8.15_

- [x] 7. Route and wiring
  - [x] 7.1 Create `src/routes/foods.tsx`
    - `createFileRoute("/foods")` with `loader: () => listFoods()`, `component: FoodsPage` and `errorComponent: FoodsError`
    - Add a local `PageShell` with the gradient background (`min-h-screen bg-linear-to-br from-indigo-700 via-purple-700 to-fuchsia-700`), one `h1` "Add Food" in white, and `grid grid-cols-1 gap-6 md:grid-cols-2` with the form first and `min-w-0` on the children
    - `FoodsPage` renders `<FoodForm />` and `<FoodList foods={...} />` from `Route.useLoaderData()`
    - `FoodsError` renders the heading, the form and an error panel (`role="alert"`, "The foods could not be loaded.", a "Try again" button calling `router.invalidate()`) with no partial list
    - Let the router plugin regenerate `src/routeTree.gen.ts`. Do not edit it.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.11, 6.1, 6.6, 6.7, 7.1_

  - [x]* 7.2 Write route tests
    - Create `src/routes/foods.test.tsx`
    - `/foods` renders one `h1` containing "Add Food", one form and one list
    - `errorComponent` shows the heading, the form and the error message, and no list
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.11_

- [x] 8. Integration tests against PostgreSQL
  - [x]* 8.1 Set up the test database and integration test configuration
    - Add `docker-compose.test.yml` (postgres:17-alpine, port 5433, `tmpfs` data) and `.env.test` with `DATABASE_URL` for `health_app_test` style naming
    - Add a `test:integration` script and a vitest setup that applies migrations with the migration files, not `push`, and clears the `foods` table between tests
    - Keep integration tests out of the default unit test run
    - _Requirements: 7.11_

  - [x]* 8.2 Write integration tests for create, list and delete
    - Create `src/server/foods.integration.test.ts`
    - Create inserts one row, returns the generated id and stored `eatenAt`, and uses server time when `eatenAt` is omitted
    - Create with `proteinG: 0`, `carbsG: 25`, no `fatG` and `servingSize: "  150 g "` stores `0`, `25`, `null` and `"150 g"`. Create with all four omitted stores four `null` values.
    - List returns every row ordered by `eatenAt` then `createdAt` descending, including a tie
    - Delete removes exactly one row and returns its id. An unknown UUID returns `not_found` with the table unchanged. Deleting the same id twice returns `ok` then `not_found` with the same table state.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 8.6, 8.7, 8.11, 8.16_

  - [x]* 8.3 Write the migration test for existing rows
    - Create `src/db/migration.integration.test.ts`
    - On a scratch database, apply `0000` only, insert a row, apply `0001` with the migrator, then check the row keeps its original values and the four new columns are NULL
    - Check that `listFoods` returns that row
    - _Requirements: 5.8, 7.11, 7.12_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Final checks
  - [x] 10.1 Run `pnpm check` and fix every finding
    - Biome must report zero errors and zero warnings. Do not add ESLint or Prettier.
    - _Requirements: 7.8_

  - [x] 10.2 Run `pnpm tsc --noEmit` and the unit tests, and fix every failure
    - Run `pnpm vitest --run` for a single pass, not watch mode
    - Confirm `Food["proteinG"]` is `number | null` and that no hand-written type duplicates the schema fields
    - Search `src/routes/` and `src/components/` for `drizzle` or `#/db` imports other than types and `mealTypes`. Search for a literal meal type list outside `src/db/schema.ts`. Search for `drizzle-kit push` in scripts and docs for this change.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 7.11_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the universal correctness properties 1 to 17 from the design
- Unit, component and integration tests validate examples and edge cases
- Browser checks at 320px, 768px and 1920px and the contrast audit from the design are manual and are not part of this task list

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "8.1"] },
    { "id": 3, "tasks": ["2.4", "3.2", "3.10", "5.1", "6.1", "8.3"] },
    { "id": 4, "tasks": ["2.5", "3.3", "5.2", "6.2", "6.3", "8.2"] },
    { "id": 5, "tasks": ["2.6", "3.4", "6.4", "6.5"] },
    { "id": 6, "tasks": ["2.7", "3.5", "6.6", "7.1"] },
    { "id": 7, "tasks": ["2.8", "3.6", "7.2"] },
    { "id": 8, "tasks": ["2.9", "3.7"] },
    { "id": 9, "tasks": ["2.10", "3.8"] },
    { "id": 10, "tasks": ["2.11", "3.9"] },
    { "id": 11, "tasks": ["10.1"] },
    { "id": 12, "tasks": ["10.2"] }
  ]
}
```
